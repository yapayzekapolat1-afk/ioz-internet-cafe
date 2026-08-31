package com.sizinsirketiniz.iozcafe;

/**
 * BillingBridge — a small custom Capacitor plugin that wires the native
 * Google Play Billing Library to the game's JavaScript. Handles the VIP
 * one-time (non-consumable) purchase: 2x income, no ads, gold badge.
 *
 * Drop this file next to UnityAdsBridge.kt, in the SAME package folder:
 *   android/app/src/main/java/com/sizinsirketiniz/iozcafe/BillingBridge.kt
 *
 * IMPORTANT: the "package" line above MUST say the exact same thing as the
 * first line of your UnityAdsBridge.kt. Copy it from there if in doubt —
 * do not guess it from capacitor.config.json's "appId", those two don't
 * always match (see the note I gave you separately about this).
 *
 * Setup steps (do these three, in order, or nothing will compile/work):
 *   1. Add the Gradle dependency (see below)
 *   2. Register the plugin in MainActivity
 *   3. Add the BILLING permission to AndroidManifest.xml
 *   4. Create the "vip_membership" in-app product in Play Console
 *
 * JS side calls (already wired up in game.js):
 *   Capacitor.Plugins.BillingBridge.purchaseVip({ productId: "vip_membership" })
 *     .then(() => ...)   // purchase completed & acknowledged — grant VIP
 *     .catch(() => ...)  // cancelled / failed — no charge, no VIP
 *
 *   Capacitor.Plugins.BillingBridge.restorePurchases()
 *     .then(res => res.vip)  // true if this Google account already owns VIP
 *
 *   Capacitor.Plugins.BillingBridge.getVipPrice({ productId: "vip_membership" })
 *     .then(res => res.price) // localized price string, e.g. "₺100,00"
 */

import android.util.Log
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
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import java.util.concurrent.atomic.AtomicBoolean

// The in-app product ID you will create in Play Console. Must match
// EXACTLY (case-sensitive) or every purchase call fails with
// "product_unavailable" — this is the #1 beginner mistake with Billing.
private const val VIP_PRODUCT_ID = "vip_membership"

@CapacitorPlugin(name = "BillingBridge")
class BillingBridge : Plugin(), PurchasesUpdatedListener {

    private val TAG = "BillingBridge"
    private var billingClient: BillingClient? = null
    private var connected = false

    // The PluginCall currently waiting on a purchase result, if any —
    // Play's purchase sheet is a separate Activity, so the result comes
    // back later via onPurchasesUpdated(), not as a normal return value.
    private var pendingPurchaseCall: PluginCall? = null
    private val settled = AtomicBoolean(true)

    override fun load() {
        super.load()
        billingClient = BillingClient.newBuilder(activity.applicationContext)
            .setListener(this)
            .enablePendingPurchases()
            .build()
        connect(null)
    }

    private fun connect(after: (() -> Unit)?) {
        val client = billingClient ?: return
        if (connected) { after?.invoke(); return }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                connected = result.responseCode == BillingClient.BillingResponseCode.OK
                if (connected) after?.invoke()
                else Log.e(TAG, "Billing setup failed: ${result.debugMessage}")
            }
            override fun onBillingServiceDisconnected() {
                connected = false
            }
        })
    }

    @PluginMethod
    fun purchaseVip(call: PluginCall) {
        val productId = call.getString("productId", VIP_PRODUCT_ID) ?: VIP_PRODUCT_ID
        connect {
            val client = billingClient
            if (client == null) { call.reject("not_connected"); return@connect }

            val product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(listOf(product))
                .build()

            client.queryProductDetailsAsync(params) { result, productDetailsList ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK || productDetailsList.isNullOrEmpty()) {
                    call.reject("product_unavailable: ${result.debugMessage}")
                    return@queryProductDetailsAsync
                }
                val details = productDetailsList[0]
                val flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(
                        listOf(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(details)
                                .build()
                        )
                    )
                    .build()

                pendingPurchaseCall = call
                settled.set(false)
                activity.runOnUiThread {
                    client.launchBillingFlow(activity, flowParams)
                }
            }
        }
    }

    // Called by the SDK once the Play purchase sheet closes — success,
    // cancel, or error all land here. This is where we settle the JS
    // promise that purchaseVip() left pending.
    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val call = pendingPurchaseCall
        pendingPurchaseCall = null

        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                val purchase = purchases?.firstOrNull { it.products.contains(VIP_PRODUCT_ID) }
                if (purchase == null) {
                    settleReject(call, "no_purchase_returned")
                    return
                }
                acknowledgeIfNeeded(purchase) { ok ->
                    if (ok) settleResolve(call) else settleReject(call, "ack_failed")
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> settleReject(call, "cancelled")
            else -> settleReject(call, "billing_error_${result.responseCode}: ${result.debugMessage}")
        }
    }

    // A purchase must be acknowledged within 3 days or Google auto-refunds
    // it. We never "consume" it (that's for consumables like extra coins)
    // — VIP is permanent, so acknowledge-only is correct here.
    private fun acknowledgeIfNeeded(purchase: Purchase, onDone: (Boolean) -> Unit) {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) { onDone(false); return }
        if (purchase.isAcknowledged) { onDone(true); return }
        val client = billingClient
        if (client == null) { onDone(false); return }
        val ackParams = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()
        client.acknowledgePurchase(ackParams) { ackResult ->
            onDone(ackResult.responseCode == BillingClient.BillingResponseCode.OK)
        }
    }

    private fun settleResolve(call: PluginCall?) {
        if (!settled.compareAndSet(false, true)) return
        val res = JSObject()
        res.put("vip", true)
        call?.resolve(res)
    }

    private fun settleReject(call: PluginCall?, reason: String) {
        if (!settled.compareAndSet(false, true)) return
        Log.e(TAG, reason)
        call?.reject(reason)
    }

    // Re-checks past purchases on this Google account (reinstall / new
    // device) and re-acknowledges + grants VIP again if found — the
    // player never pays twice. Called once on app startup from game.js.
    @PluginMethod
    fun restorePurchases(call: PluginCall) {
        connect {
            val client = billingClient
            if (client == null) { call.reject("not_connected"); return@connect }
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
            client.queryPurchasesAsync(params) { result, purchases ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    call.reject("query_failed: ${result.debugMessage}")
                    return@queryPurchasesAsync
                }
                val owned = purchases.firstOrNull {
                    it.products.contains(VIP_PRODUCT_ID) && it.purchaseState == Purchase.PurchaseState.PURCHASED
                }
                if (owned == null) {
                    val res = JSObject(); res.put("vip", false); call.resolve(res)
                    return@queryPurchasesAsync
                }
                acknowledgeIfNeeded(owned) { _ ->
                    val res = JSObject(); res.put("vip", true); call.resolve(res)
                }
            }
        }
    }

    // Returns Google's real localized price string for the VIP product,
    // so the in-game button can show "₺100,00" (or whatever the store
    // actually charges in the player's country) instead of a hardcoded guess.
    @PluginMethod
    fun getVipPrice(call: PluginCall) {
        val productId = call.getString("productId", VIP_PRODUCT_ID) ?: VIP_PRODUCT_ID
        connect {
            val client = billingClient
            if (client == null) { call.reject("not_connected"); return@connect }
            val product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(listOf(product))
                .build()
            client.queryProductDetailsAsync(params) { result, productDetailsList ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK || productDetailsList.isNullOrEmpty()) {
                    call.reject("product_unavailable")
                    return@queryProductDetailsAsync
                }
                val price = productDetailsList[0].oneTimePurchaseOfferDetails?.formattedPrice
                val res = JSObject()
                res.put("price", price ?: "")
                call.resolve(res)
            }
        }
    }
}
