const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// --- State ---
let currentVersion = 1; // 1 or 2
let mode = "A"; // "A" = no Cache-Control, "B" = with Cache-Control
let lastModified = new Date("2025-12-01T00:00:00Z");
let requestCount = 0;

// --- Helpers ---
function formatIST(date) {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function loadLottie(version) {
  const file = path.join(__dirname, "assets", `v${version}.json`);
  return fs.readFileSync(file, "utf8");
}

function computeETag(body) {
  const hash = crypto.createHash("sha256").update(body).digest("hex");
  return `"${hash}"`;
}

// --- Endpoints ---

// GET /lottie.json — Serve current Lottie with conditional GET support
app.get("/lottie.json", (req, res) => {
  requestCount++;
  const body = loadLottie(currentVersion);
  const etag = computeETag(body);
  const lastMod = lastModified.toUTCString();

  console.log(`\n--- /lottie.json request #${requestCount} [${formatIST(new Date())}] ---`);
  console.log(`  Mode: ${mode} | Version: v${currentVersion}`);
  console.log(`  If-None-Match: ${req.headers["if-none-match"] || "(none)"}`);
  console.log(`  If-Modified-Since: ${req.headers["if-modified-since"] || "(none)"}`);
  console.log(`  ETag: ${etag}`);
  console.log(`  Last-Modified: ${lastMod} (IST: ${formatIST(lastModified)})`);

  // Conditional GET: check If-None-Match
  const clientETag = req.headers["if-none-match"];
  if (clientETag && clientETag === etag) {
    console.log(`  → 304 Not Modified`);
    res.set("ETag", etag);
    res.set("Last-Modified", lastMod);
    if (mode === "B") {
      res.set("Cache-Control", "public, max-age=30");
    }
    return res.status(304).end();
  }

  // Full response
  console.log(`  → 200 OK (${body.length} bytes)`);
  res.set("Content-Type", "application/json");
  res.set("ETag", etag);
  res.set("Last-Modified", lastMod);
  if (mode === "B") {
    res.set("Cache-Control", "public, max-age=30");
  }
  res.status(200).send(body);
});

// POST /flip — Toggle between v1 and v2
app.post("/flip", (_req, res) => {
  currentVersion = currentVersion === 1 ? 2 : 1;
  console.log(`\n[FLIP] [${formatIST(new Date())}] Now serving v${currentVersion}`);
  res.json({ version: currentVersion });
});

// POST /mode — Set mode A or B
app.post("/mode", (req, res) => {
  const newMode = req.body.mode;
  if (newMode !== "A" && newMode !== "B") {
    return res.status(400).json({ error: "mode must be 'A' or 'B'" });
  }
  mode = newMode;
  console.log(`\n[MODE] [${formatIST(new Date())}] Switched to Mode ${mode}`);
  res.json({ mode });
});

// POST /lastModified — Set Last-Modified date
app.post("/lastModified", (req, res) => {
  const iso = req.body.iso;
  if (!iso) {
    return res.status(400).json({ error: "iso field required" });
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: "invalid ISO date" });
  }
  lastModified = date;
  console.log(`\n[LAST-MODIFIED] [${formatIST(new Date())}] Set to ${formatIST(lastModified)}`);
  res.json({ lastModified: lastModified.toISOString() });
});

// GET /state — Return current server state
app.get("/state", (_req, res) => {
  const body = loadLottie(currentVersion);
  const etag = computeETag(body);
  res.json({
    mode,
    version: currentVersion,
    lastModified: lastModified.toISOString(),
    etag,
    requestCount,
    cacheControl: mode === "B" ? "public, max-age=30" : null,
  });
});

// POST /reset — Reset all state
app.post("/reset", (_req, res) => {
  currentVersion = 1;
  mode = "A";
  lastModified = new Date("2025-12-01T00:00:00Z");
  requestCount = 0;
  console.log(`\n[RESET] [${formatIST(new Date())}] All state reset to defaults`);
  res.json({ ok: true });
});

// --- Start ---
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[${formatIST(new Date())}] Lottie cache demo server running on http://0.0.0.0:${PORT}`);
  console.log(`Mode: ${mode} | Version: v${currentVersion}`);
  console.log(`Endpoints:`);
  console.log(`  GET  /lottie.json   — Fetch current Lottie`);
  console.log(`  POST /flip          — Toggle v1/v2`);
  console.log(`  POST /mode          — {"mode":"A"} or {"mode":"B"}`);
  console.log(`  POST /lastModified  — {"iso":"2025-12-15T00:00:00Z"}`);
  console.log(`  GET  /state         — Current server state`);
  console.log(`  POST /reset         — Reset all state`);
});
