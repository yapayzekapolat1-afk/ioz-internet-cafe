package com.iozgames.iozcafe;

import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Google Play Billing köprüsü (tek seferlik ürün: VIP üyelik).
 * JS tarafı: connect(), productInfo({productId}), purchase({productId}), queryPurchases(), acknowledge({purchaseToken})
 * Satın alma doğrulaması ve ödül teslimi SUNUCUDA (Supabase verify-purchase) yapılır.
 */
@CapacitorPlugin(name = "BillingBridge")
class BillingBridge : Plugin(), PurchasesUpdatedListener {

    private var client: BillingClient? = null
    private var pendingCall: PluginCall? = null
    private val detailsCache = HashMap<String, ProductDetails>()

    private fun ensureClient(cb: (Boolean, String) -> Unit) {
        val existing = client
        if (existing != null && existing.isReady) {
            cb(true, "")
            return
        }
        val c = existing ?: BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build()
        client = c
        c.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                cb(result.responseCode == BillingClient.BillingResponseCode.OK, result.debugMessage)
            }

            override fun onBillingServiceDisconnected() {}
        })
    }

    @Suppress("UNCHECKED_CAST")
    private fun extractDetails(res: Any?): List<ProductDetails> {
        if (res == null) return emptyList()
        if (res is List<*>) return res.filterIsInstance<ProductDetails>()
        return try {
            (res.javaClass.getMethod("getProductDetailsList").invoke(res) as? List<*>)?.filterIsInstance<ProductDetails>() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun loadDetails(id: String, cb: (ProductDetails?, String) -> Unit) {
        val cached = detailsCache[id]
        if (cached != null) {
            cb(cached, "")
            return
        }
        val params = QueryProductDetailsParams.newBuilder().setProductList(
            listOf(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            )
        ).build()
        client!!.queryProductDetailsAsync(params) { result, res ->
            val any: Any? = res
            val pd = extractDetails(any).firstOrNull()
            if (result.responseCode == BillingClient.BillingResponseCode.OK && pd != null) {
                detailsCache[id] = pd
                cb(pd, "")
            } else {
                cb(null, "urun bulunamadi: " + result.debugMessage)
            }
        }
    }

    private fun toJs(p: Purchase): JSObject {
        val o = JSObject()
        o.put("productId", p.products.firstOrNull() ?: "")
        o.put("purchaseToken", p.purchaseToken)
        o.put("orderId", p.orderId ?: "")
        o.put("state", if (p.purchaseState == Purchase.PurchaseState.PURCHASED) "purchased" else "pending")
        o.put("acknowledged", p.isAcknowledged)
        return o
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        ensureClient { ok, msg ->
            if (ok) call.resolve() else call.reject("baglanti: $msg")
        }
    }

    @PluginMethod
    fun productInfo(call: PluginCall) {
        val id = call.getString("productId")
        if (id == null) {
            call.reject("productId yok")
            return
        }
        ensureClient { ok, msg ->
            if (!ok) {
                call.reject("baglanti: $msg")
            } else {
                loadDetails(id) { pd, err ->
                    if (pd == null) {
                        call.reject(err)
                    } else {
                        val r = JSObject()
                        r.put("price", pd.oneTimePurchaseOfferDetails?.formattedPrice ?: "")
                        r.put("title", pd.title)
                        call.resolve(r)
                    }
                }
            }
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val id = call.getString("productId")
        val act = activity
        if (id == null) {
            call.reject("productId yok")
            return
        }
        if (act == null) {
            call.reject("activity yok")
            return
        }
        ensureClient { ok, msg ->
            if (!ok) {
                call.reject("baglanti: $msg")
            } else {
                loadDetails(id) { pd, err ->
                    if (pd == null) {
                        call.reject(err)
                    } else {
                        pendingCall = call
                        act.runOnUiThread {
                            val flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(
                                listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(pd).build())
                            ).build()
                            val r = client!!.launchBillingFlow(act, flow)
                            if (r.responseCode != BillingClient.BillingResponseCode.OK) {
                                pendingCall = null
                                call.reject("launch: " + r.debugMessage)
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val call = pendingCall
        pendingCall = null
        if (call == null) return
        when {
            result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED -> call.reject("iptal", "CANCELED")
            result.responseCode == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> call.reject("zaten sahip", "OWNED")
            result.responseCode != BillingClient.BillingResponseCode.OK || purchases.isNullOrEmpty() -> call.reject("hata: " + result.debugMessage)
            else -> call.resolve(toJs(purchases[0]))
        }
    }

    @PluginMethod
    fun queryPurchases(call: PluginCall) {
        ensureClient { ok, msg ->
            if (!ok) {
                call.reject("baglanti: $msg")
            } else {
                val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
                client!!.queryPurchasesAsync(params) { result, list ->
                    if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                        call.reject("sorgu: " + result.debugMessage)
                    } else {
                        val arr = JSArray()
                        list.forEach { arr.put(toJs(it)) }
                        val r = JSObject()
                        r.put("purchases", arr)
                        call.resolve(r)
                    }
                }
            }
        }
    }

    @PluginMethod
    fun acknowledge(call: PluginCall) {
        val token = call.getString("purchaseToken")
        if (token == null) {
            call.reject("token yok")
            return
        }
        ensureClient { ok, msg ->
            if (!ok) {
                call.reject("baglanti: $msg")
            } else {
                client!!.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build()) { result ->
                    if (result.responseCode == BillingClient.BillingResponseCode.OK) call.resolve() else call.reject(result.debugMessage)
                }
            }
        }
    }
}
