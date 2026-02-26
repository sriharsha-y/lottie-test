package com.lottiecachedemo

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.network.OkHttpClientProvider
import java.io.File

@ReactModule(name = HttpCacheModule.NAME)
class HttpCacheModule(reactContext: ReactApplicationContext) : NativeHttpCacheSpec(reactContext) {

    override fun getName() = NAME

    override fun clearCache(promise: Promise) {
        try {
            // Method 1: Clear via OkHttpClient's cache (preferred)
            val client = OkHttpClientProvider.getOkHttpClient()
            val cache = client.cache
            if (cache != null) {
                cache.evictAll()
                Log.i(NAME, "Cleared OkHttp cache via evictAll()")
            }

            // Method 2: Also delete the cache directory as fallback
            val context = reactApplicationContext
            val cacheDir = File(context.cacheDir, "http-cache")
            if (cacheDir.exists()) {
                cacheDir.deleteRecursively()
                Log.i(NAME, "Deleted http-cache directory")
            }

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(NAME, "Error clearing cache: ${e.message}", e)
            promise.reject("CACHE_CLEAR_ERROR", e.message, e)
        }
    }

    companion object {
        const val NAME = "HttpCache"
    }
}
