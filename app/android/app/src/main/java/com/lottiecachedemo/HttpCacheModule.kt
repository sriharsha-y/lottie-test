package com.lottiecachedemo

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.lottiecachedemo.NativeHttpCacheSpec
import java.net.HttpURLConnection

@ReactModule(name = HttpCacheModule.NAME)
class HttpCacheModule(reactContext: ReactApplicationContext) : NativeHttpCacheSpec(reactContext) {

    override fun getName() = NAME

    override fun clearCache(promise: Promise) {
        try {
            // Clear HTTP URL connection default caches
            HttpURLConnection.setDefaultUseCaches(false)
            HttpURLConnection.setDefaultUseCaches(true)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CACHE_CLEAR_ERROR", e.message, e)
        }
    }

    companion object {
        const val NAME = "HttpCache"
    }
}
