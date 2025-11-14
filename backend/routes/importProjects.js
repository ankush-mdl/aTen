// server/routes/importProjects.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const AdmZip = require("adm-zip");
const xlsx = require("xlsx");
const db = require("../db");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const TMP_DIR = path.join(__dirname, "..", "tmp");

// ensure both directories exist
for (const dir of [UPLOADS_DIR, TMP_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Multer for receiving files (excel + optional images zip)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const name = `${Date.now()}-${file.originalname}`.replace(/\s+/g, "_");
    cb(null, name);
  },
});
const upload = multer({ storage });

/** Helper: run a sqlite3 query that returns a Promise */
function dbGetAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}
function dbRunAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

/**
 * Ensure a column exists on a table; if missing, ALTER TABLE ADD COLUMN.
 * (safe to call repeatedly)
 */
async function ensureColumnExists(table, column, type = "TEXT") {
  try {
    const info = await dbGetAsync(`PRAGMA table_info(${table})`);
    // PRAGMA table_info returns only first row; instead we query all rows:
    const rows = await new Promise((res, rej) => {
      db.all(`PRAGMA table_info(${table})`, (err, r) => {
        if (err) return rej(err);
        res(r || []);
      });
    });
    const found = rows.find((c) => c && String(c.name).toLowerCase() === String(column).toLowerCase());
    if (!found) {
      // Add column
      await dbRunAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`✔ Added column ${column} to ${table}`);
    } else {
      // console.log(`Column ${column} already exists on ${table}`);
    }
  } catch (err) {
    // Non-fatal — log and continue
    console.warn("ensureColumnExists error", err.message || err);
  }
}

/**
 * Helper: save buffer to uploads and return relative path (e.g. /uploads/xxx.jpg)
 */
function saveBufferToUploads(filename, buffer) {
  const safe = `${Date.now()}-${filename}`.replace(/[^a-zA-Z0-9-_.]/g, "_");
  const full = path.join(UPLOADS_DIR, safe);
  fs.writeFileSync(full, buffer);
  return `/uploads/${safe}`;
}

/**
 * Helper: download remote URL and save to uploads
 */
async function fetchAndSaveUrl(url) {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
    const ct = (res.headers["content-type"] || "").toLowerCase();
    let ext = ".jpg";
    if (ct.includes("png")) ext = ".png";
    else if (ct.includes("jpeg") || ct.includes("jpg")) ext = ".jpg";
    else if (ct.includes("gif")) ext = ".gif";
    else {
      const parsed = path.parse(url);
      if (parsed.ext) ext = parsed.ext;
    }
    const filename = `img${Date.now()}${ext}`;
    return saveBufferToUploads(filename, res.data);
  } catch (err) {
    console.error("fetchAndSaveUrl error", url, err.message || err);
    return null;
  }
}

/**
 * POST /api/import-projects
 * multipart/form-data:
 *  - file: .xlsx (required)
 *  - images_zip: .zip (optional)
 */
router.post(
  "/",
  verifyFirebaseToken,
  upload.fields([{ name: "file", maxCount: 1 }, { name: "images_zip", maxCount: 1 }]),
  async (req, res) => {
    try {
      // ensure DB has videos column (safe migration)
      await ensureColumnExists("projects", "videos", "TEXT");

      if (!req.files || !req.files.file || req.files.file.length === 0) {
        return res.status(400).json({ error: "Excel file (.xlsx) is required (field name: file)" });
      }

      const excelPath = req.files.file[0].path;
      const zipMap = {}; // filename -> saved path ("/uploads/xxx")

      // If a ZIP of images provided, extract and save them
      if (req.files.images_zip && req.files.images_zip.length) {
        const zipPath = req.files.images_zip[0].path;
        try {
          const zip = new AdmZip(zipPath);
          const zipEntries = zip.getEntries();
          zipEntries.forEach((entry) => {
            if (entry.isDirectory) return;
            const name = path.basename(entry.entryName);
            const data = entry.getData();
            try {
              const saved = saveBufferToUploads(name, data);
              zipMap[name] = saved;
            } catch (err) {
              console.warn("Failed to save zip entry", name, err && err.message);
            }
          });
        } catch (err) {
          console.warn("Zip extraction failed:", err && err.message);
        } finally {
          // cleanup uploaded zip
          try {
            fs.unlinkSync(req.files.images_zip[0].path);
          } catch (e) {}
        }
      }

      // Read workbook
      const workbook = xlsx.readFile(excelPath, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

      const inserted = [];
      const errors = [];

      // iterate rows
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];

        // normalize keys to lowercase
        const r = {};
        Object.keys(row).forEach((k) => {
          r[k.toString().trim().toLowerCase()] = row[k];
        });

        const title = String(r.title || r.name || "").trim();
        const city = String(r.city || "").trim();

        if (!title || !city) {
          errors.push({ row: rowIndex + 1, error: "Missing required title or city", data: r });
          console.warn("Skipping row missing title/city", r);
          continue;
        }

        // Gallery parsing (URLs or filenames)
        const galleryArr = [];
        if (r.gallery) {
          const raw = String(r.gallery || "");
          const parts = raw.split(/[,|\n]+/).map((s) => s.trim()).filter(Boolean);
          for (const p of parts) {
            try {
              if (/^https?:\/\//i.test(p)) {
                const saved = await fetchAndSaveUrl(p);
                if (saved) galleryArr.push(saved);
              } else if (zipMap[p]) {
                galleryArr.push(zipMap[p]);
              } else if (p.startsWith("/uploads/") || p.startsWith("uploads/")) {
                const normalized = p.startsWith("/") ? p : `/${p}`;
                galleryArr.push(normalized);
              } else if (p.match(/\.[a-z]{2,4}$/i) && !p.includes(" ")) {
                const tryUrl = p.startsWith("//") ? `https:${p}` : `http://${p}`;
                const saved = await fetchAndSaveUrl(tryUrl);
                if (saved) galleryArr.push(saved);
              } else {
                // unknown token — ignore
              }
            } catch (err) {
              console.warn("Gallery item processing failed", p, err && err.message);
            }
          }
        }

        // helper: split csv/newline into array
        const splitToArray = (v) => {
          if (!v) return [];
          if (Array.isArray(v)) return v;
          if (typeof v === "string") return v.split(/[,|\n]+/).map((s) => s.trim()).filter(Boolean);
          return [];
        };

        // videos: accept comma/newline separated IDs or URLs
        const videosArrRaw = splitToArray(r.videos || r.video || "");
        // normalize videos: keep original tokens (frontend/component will interpret)
        const videosArr = videosArrRaw.map((t) => String(t).trim()).filter(Boolean);

        // configurations: accept JSON or leave as []
        let configurationsParsed = [];
        if (r.configurations) {
          if (typeof r.configurations === "string") {
            try {
              configurationsParsed = JSON.parse(r.configurations);
            } catch {
              configurationsParsed = splitToArray(r.configurations);
            }
          } else if (Array.isArray(r.configurations)) {
            configurationsParsed = r.configurations;
          } else {
            configurationsParsed = [];
          }
        }

        const project = {
          title,
          slug: r.slug || "",
          location_area: r.location_area || "",
          city,
          address: r.address || "",
          rera: r.rera || null,
          status: r.status || null,
          property_type: r.property_type || null,
          configurations: configurationsParsed || [],
          blocks: r.blocks || null,
          units: r.units || null,
          floors: r.floors || null,
          land_area: r.land_area || null,
          description: r.description || null,
          videos: videosArr,
          developer_name: r.developer_name || null,
          developer_logo: r.developer_logo || null,
          developer_description: r.developer_description || null,
          highlights: splitToArray(r.highlights || ""),
          amenities: splitToArray(r.amenities || ""),
          gallery: galleryArr,
          thumbnail: (galleryArr.length ? galleryArr[0] : null),
          brochure_url: r.brochure_url || null,
          contact_phone: r.contact_phone || null,
          contact_email: r.contact_email || null,
          price_info: r.price_info || null,
        };

        // slugify
        const slugify = (s) =>
          String(s || "")
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-_]/g, "");
        const slugVal = project.slug ? slugify(project.slug) : slugify(project.title);

        const sql = `INSERT INTO projects
          (slug, title, location_area, city, address, rera, status, property_type,
           configurations, blocks, units, floors, land_area, description, videos, developer_name, developer_logo, developer_description, highlights, amenities, gallery, thumbnail,
           brochure_url, contact_phone, contact_email, price_info, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;

        const params = [
          slugVal,
          project.title,
          project.location_area,
          project.city,
          project.address,
          project.rera,
          project.status,
          project.property_type,
          JSON.stringify(project.configurations || []),
          project.blocks,
          project.units,
          project.floors,
          project.land_area,
          project.description,
          JSON.stringify(project.videos || []), // videos JSON
          project.developer_name,
          project.developer_logo,
          project.developer_description,
          JSON.stringify(project.highlights || []),
          JSON.stringify(project.amenities || []),
          JSON.stringify(project.gallery || []),
          project.thumbnail,
          project.brochure_url,
          project.contact_phone,
          project.contact_email,
          JSON.stringify(project.price_info || null),
        ];

        try {
          // insert
          const runResult = await new Promise((resolve) => {
            db.run(sql, params, function (err) {
              if (err) {
                return resolve({ ok: false, error: err.message });
              }
              db.get("SELECT * FROM projects WHERE id = ?", [this.lastID], (e, row) => {
                if (e) return resolve({ ok: false, error: e.message });
                resolve({ ok: true, id: row.id, slug: row.slug, title: row.title });
              });
            });
          });

          if (runResult && runResult.ok) {
            inserted.push(runResult);
          } else {
            errors.push({ row: rowIndex + 1, error: runResult.error || "Insert failed", title: project.title });
            console.error("Insert error row", runResult.error || "unknown", project.title);
          }
        } catch (err) {
          errors.push({ row: rowIndex + 1, error: err.message || String(err), title: project.title });
          console.error("Unexpected insert error", err);
        }
      } // end rows loop

      // cleanup excel tmp file
      try {
        fs.unlinkSync(excelPath);
      } catch (e) {}

      return res.json({ imported: inserted.length, items: inserted, errors });
    } catch (err) {
      console.error("Import error:", err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  }
);

module.exports = router;
