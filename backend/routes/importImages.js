// server/routes/uploads.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const AdmZip = require("adm-zip"); // npm i adm-zip
const crypto = require("crypto");

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Ensure uploads dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// allowed image extensions inside ZIP or as uploaded files
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"];

// multer storage for normal single file uploads (images)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // create short unique name keeping extension
    const ext = path.extname(file.originalname).toLowerCase() || "";
    const basename = crypto.randomBytes(8).toString("hex");
    cb(null, `${basename}${ext}`);
  },
});
const upload = multer({ storage });

/**
 * POST /api/uploads
 * Accepts either:
 *  - single image file field named "file" (existing behavior), or
 *  - a zip file field named "images_zip" containing multiple images.
 *
 * Returns JSON:
 *  { uploaded: ["/uploads/abc.jpg", "/uploads/def.png"], message: "..." }
 */
router.post("/", upload.fields([{ name: "file", maxCount: 1 }, { name: "images_zip", maxCount: 1 }]), async (req, res) => {
  try {
    const saved = [];

    // 1) Handle regular single-file uploads (field name "file")
    if (req.files && req.files.file && req.files.file.length) {
      for (const f of req.files.file) {
        // multer already saved it
        saved.push(`/uploads/${path.basename(f.path)}`);
      }
    }

    // 2) Handle ZIP upload (field "images_zip")
    if (req.files && req.files.images_zip && req.files.images_zip.length) {
      const zipFile = req.files.images_zip[0];
      const zipPath = zipFile.path;

      // Use adm-zip to read entries
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const entryName = entry.entryName; // may include folders
        const ext = path.extname(entryName).toLowerCase();
        if (!IMAGE_EXTS.includes(ext)) {
          // ignore non-images
          continue;
        }

        // create unique filename to avoid collisions
        const basename = crypto.randomBytes(8).toString("hex");
        const outName = `${basename}${ext}`;
        const outPath = path.join(UPLOAD_DIR, outName);

        // write entry data to file
        fs.writeFileSync(outPath, entry.getData());
        saved.push(`/uploads/${outName}`);
      }

      // remove uploaded zip from tmp (multer saved it)
      try { fs.unlinkSync(zipPath); } catch (e) { /* ignore */ }
    }

    if (saved.length === 0) {
      return res.status(400).json({ error: "No images found in upload (supported: jpg, jpeg, png, webp, gif, bmp, svg)" });
    }

    return res.json({ uploaded: saved, message: `Saved ${saved.length} image(s)` });
  } catch (err) {
    console.error("Upload route error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
