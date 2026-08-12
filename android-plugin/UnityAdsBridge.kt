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

// A generous last-resort ceiling — only fires if Unity Ads never calls
// EITHER onInitializationComplete or onInitializationFailed at all (a
// genuinely hung network call). Normal success/failure responses are
// reported to JS immediately, they don't wait for this.
private const val INIT_TIMEOUT_MS = 25000L

@CapacitorPlugin(name = "UnityAdsBridge")
class UnityAdsBridge : Plugin() {

    private var initialized = false
    private var initializing = false
    private val TAG = "UnityAdsBridge"
    private val mainHandler = Handler(Looper.getMainLooper())

    // Callers waiting on initialization: onReady() for success,
    // onFail(reason) for a real Unity Ads failure with its actual reason.
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

        // Not ready yet — kick off init (if not already running), and get
        // the REAL reason immediately if Unity Ads reports one, instead of
        // silently waiting out a blind timeout.
        initializeIfNeeded(
            onReady = { loadThenShow(placementId, ::resolveOnce, ::rejectOnce) },
            onFail = { reason -> rejectOnce(reason) }
        )
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
