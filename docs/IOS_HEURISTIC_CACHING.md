# iOS Heuristic HTTP Caching Explained

## Overview

When a server does **not** send a `Cache-Control` header, iOS (NSURLCache/NSURLSession) uses **heuristic caching** based on the `Last-Modified` header to determine how long to cache responses.

This is why users may see stale data even though the server has newer content available.

## The 10% Rule Formula

```
freshness_lifetime = (time_downloaded - Last-Modified) × 10%
```

**Key Point:** The calculation happens at **download time**, not when the user opens the app again.

## Examples

### Example 1: Recent Last-Modified

- User downloads file on: **Feb 26, 2026**
- `Last-Modified`: **Feb 25, 2026** (1 day ago)
- Freshness = 1 day × 10% = **2.4 hours**

The cached response will be considered "fresh" for 2.4 hours.

### Example 2: Old Last-Modified

- User downloads file on: **Feb 26, 2026**
- `Last-Modified`: **Dec 15, 2025** (73 days ago)
- Freshness = 73 days × 10% = **7.3 days**

The cached response will be considered "fresh" for over a week!

### Example 3: Very Old Last-Modified

- User downloads file on: **Feb 26, 2026**
- `Last-Modified`: **June 15, 2025** (256 days ago)
- Freshness = 256 days × 10% = **25.6 days** (~1 month!)

## Why Users See Stale Data

If a user:
1. Downloaded a file weeks/months ago
2. iOS calculated a long freshness lifetime at that time
3. User opens the app again within that freshness window
4. **iOS serves the cached response without contacting the server**

This is why users may see data from December 15th, 2025 even though the server has newer content.

### The Hidden 200 Problem

What makes this particularly tricky in React Native:

- `NSURLSession` serves the cached response as HTTP 200 (not 304)
- Your JavaScript code sees `response.status === 200`
- The body contains stale data
- The server never received a request (request count doesn't increment)
- Your app has no idea it's serving cached content

## The Fix: Always Send Cache-Control

Explicit `Cache-Control` headers **override** heuristic caching:

```http
Cache-Control: public, max-age=86400    # Cache for 1 day max
Cache-Control: no-cache                 # Always revalidate with server
Cache-Control: no-store                 # Never cache
```

### Example with 30-second max-age

With `Cache-Control: public, max-age=30`:
- iOS ignores the 10% heuristic
- Uses exactly 30 seconds as the freshness lifetime
- Predictable, controlled caching behavior

### Server Implementation (Express.js)

```javascript
// Always send Cache-Control to override heuristic caching
res.set("Cache-Control", "public, max-age=30, must-revalidate");
res.set("ETag", computeETag(body));
res.set("Last-Modified", lastModified.toUTCString());
res.send(body);
```

## Cache-Control Directive Reference

| Directive | Behavior |
|-----------|----------|
| `max-age=N` | Cache for N seconds, then revalidate |
| `no-cache` | Cache but revalidate on every use (server can return 304) |
| `no-store` | Never cache (always fetch full response) |
| `must-revalidate` | Must check server when stale (no stale-while-revalidate) |
| `public` | Can be cached by shared caches (CDNs, proxies) |
| `private` | Only cache in user's browser/device |

### Recommended Combinations

```http
# Dynamic content that changes frequently
Cache-Control: public, max-age=30, must-revalidate

# Static assets that rarely change
Cache-Control: public, max-age=86400, must-revalidate

# Sensitive data that should never be cached
Cache-Control: no-store

# Content that should always be fresh but can use 304
Cache-Control: no-cache
```

## Testing Heuristic Caching

### In This Demo Project

1. Start the server in **Mode A** (no Cache-Control)
2. Set a very old `Last-Modified` date:
   ```bash
   curl -X POST http://localhost:3000/lastModified \
     -H "Content-Type: application/json" \
     -d '{"iso":"2025-06-15T00:00:00Z"}'
   ```
3. Fetch from the app → iOS calculates a long freshness lifetime
4. Flip the version on the server
5. Fetch again → You'll likely see stale content

### Inspecting iOS Cache

```bash
# Find the simulator's Cache.db
find ~/Library/Developer/CoreSimulator/Devices \
  -name "Cache.db" -path "*LottieCacheDemo*" 2>/dev/null

# Open with sqlite3
sqlite3 <path-to-Cache.db>
.tables
SELECT request_key, time_stamp FROM cfurl_cache_response
ORDER BY time_stamp DESC LIMIT 10;
```

## RFC Reference

This follows [RFC 7234 Section 4.2.2 - Calculating Heuristic Freshness](https://tools.ietf.org/html/rfc7234#section-4.2.2):

> "If the response has a Last-Modified header field, caches are encouraged to use a heuristic expiration value that is no more than some fraction of the interval since that time."

The typical fraction used by browsers and iOS is **10%**.

## Summary

| Scenario | Cache Behavior |
|----------|----------------|
| No Cache-Control + old Last-Modified | iOS may cache for days/weeks (10% rule) |
| `Cache-Control: max-age=30` | iOS caches for exactly 30 seconds |
| `Cache-Control: no-cache` | iOS always revalidates (can get 304) |
| `Cache-Control: no-store` | iOS never caches |

**Recommendation:** Always send explicit `Cache-Control` headers from your server to avoid unpredictable heuristic caching behavior.
