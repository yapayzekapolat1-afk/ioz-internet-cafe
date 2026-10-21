package com.sizinsirketiniz.iozcafe;

/**
 * Unity Ads köprüsü — İOZ Penalty Legend için.
 * JS tarafı: Capacitor.Plugins.UnityAds.show()  ->  { status: "completed" | "skipped" | "noad" | "notready" | "failed" | "busy" }
 * Her durumda promise RESOLVE olur; ödülü sadece status === "completed" iken oyun verir.
 * (package satırını workflow otomatik olarak applicationId ile değiştirir.)
 */

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.unity3d.ads.IUnityAdsInitializationListener
import com.unity3d.ads.IUnityAdsLoadListener
import com.unity3d.ads.IUnityAdsShowListener
import com.unity3d.ads.UnityAds
import com.unity3d.ads.UnityAdsLoadOptions
import com.unity3d.ads.UnityAdsShowOptions
import java.util.concurrent.atomic.AtomicBoolean

private const val UNITY_GAME_ID = "800275081"
private const val DEFAULT_PLACEMENT_ID = "Rewarded_Android"
// Play'e yüklenen sürümde MUTLAKA false olmalı.
private const val UNITY_TEST_MODE = false
private const val INIT_TIMEOUT_MS = 25000L

@CapacitorPlugin(name = "UnityAds")
class UnityAdsBridge : Plugin() {

    private var initialized = false
    private var initializing = false
    private val TAG = "UnityAds"
    private val mainHandler = Handler(Looper.getMainLooper())
    private val showing = AtomicBoolean(false)

    private val pendingOnReady = mutableListOf<() -> Unit>()
    private val pendingOnFail = mutableListOf<(String) -> Unit>()

    override fun load() {
        super.load()
        initializeIfNeeded(null, null)
    }

    private fun initializeIfNeeded(onReady: (() -> Unit)?, onFail: ((String) -> Unit)?) {
        if (initialized) { onReady?.invoke(); return }
        onReady?.let { pendingOnReady.add(it) }
        onFail?.let { pendingOnFail.add(it) }
        if (initializing) return
        initializing = true

        UnityAds.initialize(
            activity.applicationContext,
            UNITY_GAME_ID,
            UNITY_TEST_MODE,
            object : IUnityAdsInitializationListener {
                override fun onInitializationComplete() {
                    Log.d(TAG, "Unity Ads initialized")
                    initialized = true
                    initializing = false
                    val callbacks = pendingOnReady.toList()
                    pendingOnReady.clear()
                    pendingOnFail.clear()
                    callbacks.forEach { it.invoke() }
                }

                override fun onInitializationFailed(
                    error: UnityAds.UnityAdsInitializationError?,
                    message: String?
                ) {
                    val reason = "init_failed: $error - $message"
                    Log.e(TAG, reason)
                    initializing = false
                    val callbacks = pendingOnFail.toList()
                    pendingOnReady.clear()
                    pendingOnFail.clear()
                    callbacks.forEach { it.invoke(reason) }
                }
            }
        )
    }

    @PluginMethod
    fun show(call: PluginCall) {
        if (!showing.compareAndSet(false, true)) {
            val r = JSObject(); r.put("status", "busy"); call.resolve(r)
            return
        }
        val placementId = call.getString("placementId", DEFAULT_PLACEMENT_ID) ?: DEFAULT_PLACEMENT_ID

        val settled = AtomicBoolean(false)
        fun finish(status: String) {
            if (settled.compareAndSet(false, true)) {
                showing.set(false)
                val r = JSObject(); r.put("status", status)
                call.resolve(r)
            }
        }

        if (initialized) {
            loadThenShow(placementId, ::finish)
            return
        }
        initializeIfNeeded(
            onReady = { loadThenShow(placementId, ::finish) },
            onFail = { _ -> finish("notready") }
        )
        mainHandler.postDelayed({ if (!initialized) finish("notready") }, INIT_TIMEOUT_MS)
    }

    private fun loadThenShow(placementId: String, finish: (String) -> Unit) {
        UnityAds.load(placementId, UnityAdsLoadOptions(), object : IUnityAdsLoadListener {
            override fun onUnityAdsAdLoaded(loadedPlacementId: String?) {
                UnityAds.show(
                    activity,
                    loadedPlacementId ?: placementId,
                    UnityAdsShowOptions(),
                    object : IUnityAdsShowListener {
                        override fun onUnityAdsShowFailure(
                            shownPlacementId: String?,
                            error: UnityAds.UnityAdsShowError?,
                            message: String?
                        ) {
                            Log.e(TAG, "Show failed: $error $message")
                            finish("failed")
                        }
                        override fun onUnityAdsShowStart(shownPlacementId: String?) {}
                        override fun onUnityAdsShowClick(shownPlacementId: String?) {}
                        override fun onUnityAdsShowComplete(
                            shownPlacementId: String?,
                            state: UnityAds.UnityAdsShowCompletionState?
                        ) {
                            if (state == UnityAds.UnityAdsShowCompletionState.COMPLETED) finish("completed")
                            else finish("skipped")
                        }
                    }
                )
            }

            override fun onUnityAdsFailedToLoad(
                failedPlacementId: String?,
                error: UnityAds.UnityAdsLoadError?,
                message: String?
            ) {
                Log.e(TAG, "Load failed: $error $message")
                finish("noad")
            }
        })
    }
}
