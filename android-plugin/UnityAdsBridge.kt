package com.sizinsirketiniz.iozcafe;

/**
 * UnityAdsBridge — a small custom Capacitor plugin that wires the native
 * Unity Ads SDK (rewarded video) to the game's JavaScript. There is no
 * official Capacitor plugin for Unity Ads, so this hand-written bridge is
 * the plugin. Drop this file into your Capacitor Android project at:
 *
 *   android/app/src/main/java/com/sizinsirketiniz/iozcafe/UnityAdsBridge.kt
 *
 * (rename the package above to match your actual applicationId if you
 * changed it), then follow reklam-entegrasyonu.md for the two remaining
 * steps: adding the Gradle dependency and registering the plugin in
 * MainActivity.
 *
 * JS side call (already wired up in game.js):
 *   Capacitor.Plugins.UnityAdsBridge.showRewarded({ placementId: "Rewarded_Android" })
 *     .then(() => ...)   // ad was watched to completion — grant the reward
 *     .catch(() => ...)  // failed to load / no fill / user skipped — no reward, but never blocks the game
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

// ---- Fill these in with your own values from the Unity Ads dashboard ----
private const val UNITY_GAME_ID = "2f28f248-fd41-4ff9-a11b-7f139a8ca96e"
private const val DEFAULT_PLACEMENT_ID = "Rewarded_Android"

// IMPORTANT: testMode MUST be false in the build you upload to Google
// Play. Test ads are for development only — shipping with testMode=true
// is a Unity Ads policy violation and your real ad revenue will be zero.
private const val UNITY_TEST_MODE = false

private const val INIT_TIMEOUT_MS = 8000L

@CapacitorPlugin(name = "UnityAdsBridge")
class UnityAdsBridge : Plugin() {

    private var initialized = false
    private var initializing = false
    private val TAG = "UnityAdsBridge"
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun load() {
        super.load()
        initializeIfNeeded(null)
    }

    private fun initializeIfNeeded(onReady: (() -> Unit)?) {
        if (initialized) { onReady?.invoke(); return }
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
                    onReady?.invoke()
                }

                override fun onInitializationFailed(
                    error: UnityAds.UnityAdsInitializationError?,
                    message: String?
                ) {
                    Log.e(TAG, "Unity Ads init failed: $error $message")
                    initializing = false
                    // onReady deliberately not called — the caller's own
                    // timeout (see showRewarded) rejects the JS promise.
                }
            }
        )
    }

    @PluginMethod
    fun showRewarded(call: PluginCall) {
        val placementId = call.getString("placementId", DEFAULT_PLACEMENT_ID) ?: DEFAULT_PLACEMENT_ID

        // Guards against resolving/rejecting the same PluginCall twice,
        // which Capacitor logs as an error and which could otherwise
        // happen if the init-timeout and a late SDK callback both fire.
        val settled = AtomicBoolean(false)
        fun resolveOnce(result: JSObject) { if (settled.compareAndSet(false, true)) call.resolve(result) }
        fun rejectOnce(reason: String) { if (settled.compareAndSet(false, true)) call.reject(reason) }

        if (initialized) {
            loadThenShow(placementId, ::resolveOnce, ::rejectOnce)
            return
        }

        // Not ready yet — kick off init (if not already running) and give
        // it a limited window. The game must never be stuck behind a
        // network that won't cooperate.
        initializeIfNeeded {
            loadThenShow(placementId, ::resolveOnce, ::rejectOnce)
        }
        mainHandler.postDelayed({
            if (!initialized) rejectOnce("init_timeout")
        }, INIT_TIMEOUT_MS)
    }

    private fun loadThenShow(
        placementId: String,
        resolveOnce: (JSObject) -> Unit,
        rejectOnce: (String) -> Unit
    ) {
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
                            rejectOnce("show_failed")
                        }

                        override fun onUnityAdsShowStart(shownPlacementId: String?) { /* no-op */ }
                        override fun onUnityAdsShowClick(shownPlacementId: String?) { /* no-op */ }

                        override fun onUnityAdsShowComplete(
                            shownPlacementId: String?,
                            state: UnityAds.UnityAdsShowCompletionState?
                        ) {
                            if (state == UnityAds.UnityAdsShowCompletionState.COMPLETED) {
                                val result = JSObject()
                                result.put("rewarded", true)
                                resolveOnce(result)
                            } else {
                                // user closed the ad before it finished — no reward
                                rejectOnce("skipped")
                            }
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
                rejectOnce("no_fill")
            }
        })
    }
}
