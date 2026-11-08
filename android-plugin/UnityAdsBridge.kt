package com.iozgames.iozcafe;

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.unity3d.ads.IUnityAdsInitializationListener
import com.unity3d.ads.IUnityAdsLoadListener
import com.unity3d.ads.IUnityAdsShowListener
import com.unity3d.ads.UnityAds
import com.unity3d.ads.UnityAdsShowOptions

/**
 * Unity Ads (4.16.x) ödüllü video köprüsü.
 * JS tarafı: initAds({gameId, testMode}), loadRewarded({placementId}), showRewarded({placementId}) -> {completed: boolean}
 * (Derleme sırasında workflow ilk satırdaki package değerini kendi APP_ID'siyle değiştirir.)
 */
@CapacitorPlugin(name = "UnityAdsBridge")
class UnityAdsBridge : Plugin() {

    @Volatile
    private var initDone = false

    @PluginMethod
    fun initAds(call: PluginCall) {
        val gameId = call.getString("gameId")
        val testMode = call.getBoolean("testMode", false) ?: false
        if (gameId.isNullOrEmpty()) {
            call.reject("gameId yok")
            return
        }
        if (initDone) {
            call.resolve()
            return
        }
        UnityAds.initialize(context, gameId, testMode, object : IUnityAdsInitializationListener {
            override fun onInitializationComplete() {
                initDone = true
                call.resolve()
            }

            override fun onInitializationFailed(error: UnityAds.UnityAdsInitializationError?, message: String?) {
                call.reject("init: " + (message ?: error?.name ?: "bilinmiyor"))
            }
        })
    }

    @PluginMethod
    fun loadRewarded(call: PluginCall) {
        val placement = call.getString("placementId") ?: "Rewarded_Android"
        UnityAds.load(placement, object : IUnityAdsLoadListener {
            override fun onUnityAdsAdLoaded(placementId: String?) {
                call.resolve()
            }

            override fun onUnityAdsFailedToLoad(placementId: String?, error: UnityAds.UnityAdsLoadError?, message: String?) {
                call.reject("load: " + (message ?: error?.name ?: "bilinmiyor"))
            }
        })
    }

    @PluginMethod
    fun showRewarded(call: PluginCall) {
        val placement = call.getString("placementId") ?: "Rewarded_Android"
        val act = activity
        if (act == null) {
            call.reject("activity yok")
            return
        }
        act.runOnUiThread {
            UnityAds.show(act, placement, UnityAdsShowOptions(), object : IUnityAdsShowListener {
                override fun onUnityAdsShowFailure(placementId: String?, error: UnityAds.UnityAdsShowError?, message: String?) {
                    call.reject("show: " + (message ?: error?.name ?: "bilinmiyor"))
                }

                override fun onUnityAdsShowStart(placementId: String?) {}

                override fun onUnityAdsShowClick(placementId: String?) {}

                override fun onUnityAdsShowComplete(placementId: String?, state: UnityAds.UnityAdsShowCompletionState?) {
                    val r = JSObject()
                    r.put("completed", state == UnityAds.UnityAdsShowCompletionState.COMPLETED)
                    call.resolve(r)
                }
            })
        }
    }
}
