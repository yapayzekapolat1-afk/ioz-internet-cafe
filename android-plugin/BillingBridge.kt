package com.sizinsirketiniz.iozcafe;

/**
 * Google Play Billing köprüsü — İOZ Penalty Legend için.
 * JS tarafı: Capacitor.Plugins.PlayBilling
 *   products({ids:[...]})            -> { items:[{id, price}] }
 *   buy({id, account})               -> { status:"purchased"|"pending"|"owned"|"cancelled"|"error", id, token }
 *   restore()                        -> { items:[{id, token, acked}] }   (alınmış ama teslim/onay bekleyenler)
 *   finish({token, consume})         -> { ok }   (sunucu doğruladıktan SONRA oyun çağırır)
 *
 * Satın alma burada ONAYLANMAZ; oyun, Supabase 'satin-al' fonksiyonu doğrulayınca finish() çağırır.
 * consume:true  -> tüketilebilir paket (başlangıç/mini, tekrar alınabilir)
 * consume:false -> tek seferlik (VIP), sadece acknowledge edilir.
 */

import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams

@CapacitorPlugin(name = "PlayBilling")
class BillingBridge : Plugin(), PurchasesUpdatedListener {

    private val TAG = "PlayBilling"
    private var billingClient: BillingClient? = null
    private var connected = false
    private var pendingBuy: PluginCall? = null

    override fun load() {
        super.load()
        billingClient = BillingClient.newBuilder(activity.applicationContext)
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
            )
            .build()
        connect(null, null)
    }

    private fun connect(onReady: (() -> Unit)?, onFail: (() -> Unit)?) {
        val client = billingClient
        if (client == null) { onFail?.invoke(); return }
        if (connected && client.isReady) { onReady?.invoke(); return }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                connected = result.responseCode == BillingClient.BillingResponseCode.OK
                if (connected) onReady?.invoke()
                else { Log.e(TAG, "Billing setup failed: ${result.debugMessage}"); onFail?.invoke() }
            }
            override fun onBillingServiceDisconnected() { connected = false }
        })
    }

    private fun queryDetails(ids: List<String>, cb: (List<ProductDetails>?) -> Unit) {
        val client = billingClient
        if (client == null) { cb(null); return }
        val list = ids.map {
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(it)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        }
        val params = QueryProductDetailsParams.newBuilder().setProductList(list).build()
        client.queryProductDetailsAsync(params) { result, queryResult ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) cb(null)
            else cb(queryResult.productDetailsList ?: emptyList())
        }
    }

    private fun status(s: String): JSObject { val r = JSObject(); r.put("status", s); return r }

    @PluginMethod
    fun products(call: PluginCall) {
        val arr = call.getArray("ids")
        val ids = ArrayList<String>()
        if (arr != null) for (i in 0 until arr.length()) ids.add(arr.getString(i))
        if (ids.isEmpty()) { call.reject("no_ids"); return }
        connect({
            queryDetails(ids) { details ->
                if (details == null) { call.reject("product_query_failed"); return@queryDetails }
                val items = JSArray()
                details.forEach { d ->
                    val o = JSObject()
                    o.put("id", d.productId)
                    o.put("price", d.oneTimePurchaseOfferDetails?.formattedPrice ?: "")
                    items.put(o)
                }
                val res = JSObject(); res.put("items", items); call.resolve(res)
            }
        }, { call.reject("not_connected") })
    }

    @PluginMethod
    fun buy(call: PluginCall) {
        val id = call.getString("id")
        val account = call.getString("account") ?: ""
        if (id.isNullOrEmpty()) { call.resolve(status("error")); return }
        if (pendingBuy != null) { call.resolve(status("error")); return }
        connect({
            queryDetails(listOf(id)) { details ->
                val d = details?.firstOrNull()
                if (d == null) {
                    Log.e(TAG, "product_unavailable: $id")
                    call.resolve(status("error"))
                    return@queryDetails
                }
                val pb = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build()
                val fb = BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(pb))
                if (account.isNotEmpty()) fb.setObfuscatedAccountId(account)
                pendingBuy = call
                activity.runOnUiThread {
                    val r = billingClient?.launchBillingFlow(activity, fb.build())
                    if (r == null || r.responseCode != BillingClient.BillingResponseCode.OK) {
                        pendingBuy = null
                        Log.e(TAG, "launch failed: ${r?.debugMessage}")
                        call.resolve(status("error"))
                    }
                }
            }
        }, { call.resolve(status("error")) })
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val call = pendingBuy
        pendingBuy = null
        if (call == null) return
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                val p = purchases?.firstOrNull()
                if (p == null) { call.resolve(status("error")); return }
                when (p.purchaseState) {
                    Purchase.PurchaseState.PURCHASED -> {
                        val r = status("purchased")
                        r.put("id", p.products.firstOrNull() ?: "")
                        r.put("token", p.purchaseToken)
                        call.resolve(r)
                    }
                    Purchase.PurchaseState.PENDING -> call.resolve(status("pending"))
                    else -> call.resolve(status("error"))
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> call.resolve(status("cancelled"))
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> call.resolve(status("owned"))
            else -> { Log.e(TAG, "billing error ${result.responseCode}: ${result.debugMessage}"); call.resolve(status("error")) }
        }
    }

    @PluginMethod
    fun restore(call: PluginCall) {
        connect({
            val client = billingClient
            if (client == null) { call.reject("not_connected"); return@connect }
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP).build()
            client.queryPurchasesAsync(params) { result, purchases ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    call.reject("query_failed"); return@queryPurchasesAsync
                }
                val items = JSArray()
                purchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }.forEach { p ->
                    val o = JSObject()
                    o.put("id", p.products.firstOrNull() ?: "")
                    o.put("token", p.purchaseToken)
                    o.put("acked", p.isAcknowledged)
                    items.put(o)
                }
                val res = JSObject(); res.put("items", items); call.resolve(res)
            }
        }, { call.reject("not_connected") })
    }

    @PluginMethod
    fun finish(call: PluginCall) {
        val token = call.getString("token")
        val consume = call.getBoolean("consume", true) ?: true
        if (token.isNullOrEmpty()) { call.reject("no_token"); return }
        connect({
            val client = billingClient
            if (client == null) { call.reject("not_connected"); return@connect }
            fun done(ok: Boolean) { val r = JSObject(); r.put("ok", ok); call.resolve(r) }
            if (consume) {
                val p = ConsumeParams.newBuilder().setPurchaseToken(token).build()
                client.consumeAsync(p) { r, _ -> done(r.responseCode == BillingClient.BillingResponseCode.OK) }
            } else {
                val p = AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build()
                client.acknowledgePurchase(p) { r -> done(r.responseCode == BillingClient.BillingResponseCode.OK) }
            }
        }, { call.reject("not_connected") })
    }
}
