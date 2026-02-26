# iOS HTTP Caching Demo with Lottie + React Native

A proof-of-concept demonstrating how iOS's `NSURLSession` (underlying React Native's `fetch()`) handles HTTP caching when a Lottie JSON resource is served **without** `Cache-Control` headers (only `ETag` + `Last-Modified`), and how adding `Cache-Control: public, max-age=30, must-revalidate` gives predictable revalidation.

**Key insight:** iOS transparently caches responses and may serve stale content as HTTP 200 to JavaScript — never exposing 304. This demo proves it by comparing body hashes, server request counts, and header values.

## Project Structure

```
lottie-test/
├── README.md
├── server/
│   ├── package.json
│   ├── index.js              # Express server (~120 lines)
│   └── assets/
│       ├── v1.json            # Blue circle Lottie (demoVersion: 1)
│       └── v2.json            # Red square Lottie (demoVersion: 2)
└── app/                       # React Native CLI project
    ├── App.tsx                # Single-screen UI
    ├── src/
    │   ├── types.ts
    │   ├── config.ts          # Server URL (platform-aware)
    │   └── api.ts             # fetch wrappers + SHA-256
    ├── ios/
    └── android/
```

## Prerequisites

- Node.js 18+
- Xcode 15+ (for iOS)
- Android Studio + SDK (for Android)
- CocoaPods

## Setup

### 1. Start the Server

```bash
cd server
npm install
node index.js
```

Server runs on `http://0.0.0.0:3000`. Endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/lottie.json` | GET | Serve current Lottie with conditional GET |
| `/flip` | POST | Toggle between v1 (blue circle) and v2 (red square) |
| `/mode` | POST | `{"mode":"A"}` (no Cache-Control) or `{"mode":"B"}` (with Cache-Control) |
| `/lastModified` | POST | `{"iso":"2025-12-15T00:00:00Z"}` |
| `/state` | GET | Current server state + request count |
| `/reset` | POST | Reset all state to defaults |

### 2. Run the iOS App

```bash
cd app
npx react-native run-ios
```

### 3. Run the Android App

```bash
export ANDROID_HOME=~/Library/Android/sdk
cd app
npx react-native run-android
```

### 4. Configure Server URL

The app auto-selects the server URL based on platform:
- **iOS Simulator**: `http://192.168.50.7:3000` (LAN IP — update in `src/config.ts` or via the text field in the app)
- **Android Emulator**: `http://10.0.2.2:3000` (maps to host localhost)

Edit the URL in the app's text field if your LAN IP differs.

## Reproduction Steps

### Step 0: Verify Server

```bash
# Basic fetch
curl -v http://localhost:3000/lottie.json

# Conditional GET (should return 304)
ETAG=$(curl -s -D - http://localhost:3000/lottie.json | grep -i "^etag:" | sed 's/^[Ee][Tt][Aa][Gg]: *//' | tr -d '\r')
curl -v -H "If-None-Match: $ETAG" http://localhost:3000/lottie.json
```

### Step 1: Mode A — Prove iOS Caches Without Cache-Control

1. Open the app, tap **Fetch** → Blue circle appears, status 200, request count = 1
2. Tap **Fetch** again → Note:
   - iOS may serve cached response (status still shows 200 to JS)
   - Check **server request count** — if it's still 1, iOS served from cache without contacting the server
3. Tap **Flip Version** on server (switches to v2 = red square)
4. Tap **Fetch** → Compare:
   - If blue circle still shows + same body hash → iOS served stale cache
   - If red square shows → iOS revalidated
5. Watch the server terminal for request logs

**Expected result in Mode A:** iOS may heuristically cache the response and serve stale v1 even after the server flipped to v2, since there's no `Cache-Control` directive telling it when to revalidate.

### Step 2: Mode B — Prove `must-revalidate` Forces Revalidation

1. Tap **Reset** to clear state
2. Tap **Mode B** (adds `Cache-Control: public, max-age=30, must-revalidate`)
3. Tap **Fetch** → Blue circle, status 200, note the `Cache-Control` header in response
4. Tap **Fetch** again immediately (within 30s) → May serve from cache (max-age=30)
5. Wait 30+ seconds, then tap **Fetch** → iOS must revalidate with server
6. Tap **Flip Version**, wait 30s, tap **Fetch** → Red square should appear

**Expected result in Mode B:** After `max-age` expires, iOS always revalidates with the server, ensuring fresh content.

### Optional: Inspect iOS Simulator Cache

```bash
# Find the simulator's Cache.db
find ~/Library/Developer/CoreSimulator/Devices -name "Cache.db" -path "*LottieCacheDemo*" 2>/dev/null

# Open with sqlite3
sqlite3 <path-to-Cache.db>
.tables
SELECT request_key, time_stamp FROM cfurl_cache_response ORDER BY time_stamp DESC LIMIT 10;
```

## Server Modes

| Mode | Cache-Control Header | Behavior |
|---|---|---|
| **A** (default) | None | Only `ETag` + `Last-Modified` sent. iOS uses heuristic caching. |
| **B** | `public, max-age=30, must-revalidate` | iOS caches for 30s, then must revalidate. |

## How It Works

### The iOS Caching Problem

When `NSURLSession` (used by React Native's `fetch()`) receives a response with `ETag` and `Last-Modified` but no `Cache-Control`, it applies **heuristic caching** per RFC 7234. It calculates a freshness lifetime using the **10% rule**:

```
freshness_lifetime = (time_downloaded - Last-Modified) × 10%
```

For example, if `Last-Modified` is 73 days ago, iOS will cache the response for **7.3 days** without ever contacting the server — returning HTTP 200 (not 304) to JavaScript.

This means:
- Your app thinks it got a fresh response (status 200)
- The body may be stale
- The server never saw the request (request count doesn't increase)

See [docs/IOS_HEURISTIC_CACHING.md](docs/IOS_HEURISTIC_CACHING.md) for detailed examples and the full explanation.

### The Fix

Adding `Cache-Control: public, max-age=30, must-revalidate` tells the cache:
- Cache this for 30 seconds (`max-age=30`)
- After 30s, you **must** revalidate with the server (`must-revalidate`)
- The server can return 304 if content hasn't changed (saving bandwidth)

### Proof Mechanism

The app proves caching behavior through:
1. **Body SHA-256 hash** — Compare client-side hash with expected hash
2. **Server request count** — If it doesn't increment, iOS served from cache
3. **demoVersion field** — Quick visual check (v1 = blue circle, v2 = red square)
4. **Response headers** — Shows what Cache-Control, ETag, Last-Modified were received

## Tech Stack

- **Server**: Express.js with SHA-256 ETag generation
- **App**: React Native 0.84 + lottie-react-native v7
- **SHA-256**: js-sha256 (pure JS, no native deps)
