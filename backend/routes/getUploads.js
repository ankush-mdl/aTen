// server/routes/uploads.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const requireAdmin = require("../middleware/requireAdmin");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");

const router = express.Router();

// path to your backend uploads directory (adjust if your structure is different)
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { console.error("Failed to create uploads dir", e); }
}

/**
 * Helper: list files recursively (non-hidden) and return relative paths starting with /uploads/...
 * Filters to common image file extensions.
 */
function listUploadFiles() {
  const results = [];

  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      if (it.name.startsWith(".")) continue; // skip hidden
      const full = path.join(dir, it.name);
      if (it.isDirectory()) {
        walk(full);
      } else if (it.isFile()) {
        // filter images only (jpg/png/gif/webp/avif)
        const ext = path.extname(it.name).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"].includes(ext)) {
          // produce a path relative to BACKEND root like /uploads/...
          const rel = path.relative(path.join(__dirname, ".."), full).split(path.sep).join("/");
          results.push("/" + rel);
        }
      }
    }
  }

  try {
    walk(UPLOADS_DIR);
  } catch (err) {
    console.error("listUploadFiles error", err);
  }
  return results;
}

/**
 * GET /api/uploads
 * Returns JSON: array of image paths, e.g.
 * ["/uploads/1676123-house1.jpg", "/uploads/sub/office1.png"]
 */
router.get("/", verifyFirebaseToken, (req, res) => {
  try {
    const items = listUploadFiles();
    res.json(items);
  } catch (err) {
    console.error("Uploads listing error", err);
    res.status(500).json({ error: "Failed to list uploads" });
  }
});

module.exports = router;
