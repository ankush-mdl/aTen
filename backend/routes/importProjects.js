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



// ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer for receiving files (excel + optional images zip)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "tmp")),
  filename: (req, file, cb) => {
    const name = `${Date.now()}-${file.originalname}`.replace(/\s+/g, "_");
    cb(null, name);
  },
});
const upload = multer({ storage });

/**
 * Helper: save buffer to uploads and return relative path (e.g. /uploads/xxx.jpg)
 */
function saveBufferToUploads(filename, buffer) {
  const safe = `${Date.now()}-${filename}`.replace(/[^a-zA-Z0-9-_.]/g, "_");
  const full = path.join(UPLOADS_DIR, safe);
  fs.writeFileSync(full, buffer);
  // return path relative to backend root (what your frontend expects)
  return `/uploads/${safe}`;
}

/**
 * Helper: download remote URL and save to uploads
 */
async function fetchAndSaveUrl(url) {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
    const ct = res.headers["content-type"] || "";
    // derive extension
    let ext = ".jpg";
    if (ct.includes("png")) ext = ".png";
    else if (ct.includes("jpeg")) ext = ".jpg";
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
 *  - images_zip: .zip (optional) — contains images whose names match Excel filename values
 *
 * Excel format expectation:
 * The spreadsheet must contain one sheet (or the first sheet is used). Each row represents one project.
 * Required columns (column header names are case-insensitive):
 *  - title (required)
 *  - city (required)
 * Optional columns we support (case-insensitive):
 *  - slug, location_area, address, rera, status, property_type, brochure_url, contact_phone, contact_email, blocks, units, floors
 *  - configurations -> JSON text or string representation (we will JSON.stringify it when inserting)
 *  - highlights -> comma-separated values or JSON array
 *  - amenities -> comma-separated values or JSON array
 *  - gallery -> **Important**: comma-separated list of image URLs OR comma-separated list of image filenames that exist in the uploaded ZIP.
 *
 * Example gallery cell:
 *  - https://example.com/a.jpg, https://example.com/b.jpg
 *  OR
 *  - house1.jpg, house2.png  (when you upload a ZIP containing house1.jpg/house2.png)
 */
router.post("/", verifyFirebaseToken, upload.fields([{ name: "file", maxCount: 1 }, { name: "images_zip", maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files || !req.files.file || req.files.file.length === 0) {
      return res.status(400).json({ error: "Excel file (.xlsx) is required (field name: file)" });
    }

    const excelPath = req.files.file[0].path;
    let zipMap = {}; // filename -> saved path ("/uploads/xxx")
    if (req.files.images_zip && req.files.images_zip.length) {
      // extract zip into memory -> populate zipMap
      const zipPath = req.files.images_zip[0].path;
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      zipEntries.forEach((entry) => {
        if (entry.isDirectory) return;
        const name = path.basename(entry.entryName);
        const data = entry.getData();
        const saved = saveBufferToUploads(name, data);
        zipMap[name] = saved;
      });
      // remove zip file after extraction
      try { fs.unlinkSync(zipPath); } catch {}
    }

    // read workbook
    const workbook = xlsx.readFile(excelPath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" }); // array of objects

    // iterate rows, build project objects and insert into DB
    const inserted = [];
    for (const row of rows) {
      // normalize keys: make lower-case mapping
      const r = {};
      Object.keys(row).forEach((k) => {
        r[k.toString().trim().toLowerCase()] = row[k];
      });

      // required
      const title = String(r.title || r.name || "").trim();
      const city = String(r.city || "").trim();
      if (!title || !city) {
        // skip invalid row (could collect errors)
        console.warn("Skipping row missing title/city", r);
        continue;
      }

      // gallery handling:
      // gallery cell may be comma-separated list of URLs or filenames
      let galleryArr = [];
      if (r.gallery) {
        const raw = String(r.gallery || "");
        // split by comma or newline
        const parts = raw.split(/[,|\n]+/).map(s => s.trim()).filter(Boolean);
        for (const p of parts) {
          if (p.startsWith("http://") || p.startsWith("https://")) {
            // fetch remote and save
            const saved = await fetchAndSaveUrl(p);
            if (saved) galleryArr.push(saved);
          } else {
            // treat as filename -> check in zipMap first, else if it looks like /uploads/... keep as-is
            if (zipMap[p]) {
              galleryArr.push(zipMap[p]);
            } else if (p.startsWith("/uploads/") || p.startsWith("uploads/")) {
              // already a relative path to backend uploads
              const normalized = p.startsWith("/") ? p : `/${p}`;
              galleryArr.push(normalized);
            } else {
              // maybe it's an absolute url without protocol: skip or attempt to fetch with http
              if (p.match(/\.[a-z]{2,4}$/i) && !p.includes(" ")) {
                // try http(s)
                const tryUrl = p.startsWith("//") ? `https:${p}` : `http://${p}`;
                const saved = await fetchAndSaveUrl(tryUrl);
                if (saved) galleryArr.push(saved);
              } else {
                // unknown token — ignore
              }
            }
          }
        }
      }

      // build DB-ready project object
      const project = {
        title,
        slug: r.slug || "",
        location_area: r.location_area || "",
        city,
        address: r.address || "",
        rera: r.rera || null,
        status: r.status || null,
        property_type: r.property_type || null,
        configurations: (r.configurations && (typeof r.configurations === "string" ? (() => {
          try { return JSON.parse(r.configurations); } catch { return r.configurations; }
        })() : r.configurations)) || [],
        blocks: r.blocks || null,
        units: r.units || null,
        floors: r.floors || null,
        land_area: r.land_area || null,
        description: r.description || null,
        developer_name: r.developer_name || null,
        developer_logo: r.developer_logo || null,
        developer_description: r.developer_description || null,
        highlights: (() => {
          if (!r.highlights) return [];
          if (Array.isArray(r.highlights)) return r.highlights;
          if (typeof r.highlights === "string") return r.highlights.split(/[,|\n]+/).map(s => s.trim()).filter(Boolean);
          return [];
        })(),
        amenities: (() => {
          if (!r.amenities) return [];
          if (Array.isArray(r.amenities)) return r.amenities;
          if (typeof r.amenities === "string") return r.amenities.split(/[,|\n]+/).map(s => s.trim()).filter(Boolean);
          return [];
        })(),
        gallery: galleryArr,
        thumbnail: (galleryArr.length ? galleryArr[0] : null),
        brochure_url: r.brochure_url || null,
        contact_phone: r.contact_phone || null,
        contact_email: r.contact_email || null,
        price_info: (r.price_info ? r.price_info : null),
      };

      // now insert into DB (use same SQL as your POST /projects route)
      const slugify = (s) =>
        String(s || "")
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-_]/g, "");

      const slugVal = project.slug ? slugify(project.slug) : slugify(project.title);

      const sql = `INSERT INTO projects
        (slug, title, location_area, city, address, rera, status, property_type,
         configurations, blocks, units, floors, land_area, description, developer_name,developer_logo, developer_description, highlights, amenities, gallery, thumbnail,
         brochure_url, contact_phone, contact_email, price_info, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;

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

      // note: using sync db.run with callback because sqlite3 is callback based
      await new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) {
            console.error("Insert error row", err, project.title);
            // continue on error but record it
            return resolve({ ok: false, error: err.message });
          }
          // fetch back inserted row id & slug
          db.get("SELECT * FROM projects WHERE id = ?", [this.lastID], (e, row) => {
            if (e) return resolve({ ok: false, error: e.message });
            resolve({ ok: true, id: row.id, slug: row.slug, title: row.title });
          });
        });
      }).then(result => {
        if (result && result.ok) inserted.push(result);
      });

    } // end for rows

    // cleanup tmp excel file
    try { fs.unlinkSync(excelPath); } catch (err) {}

    return res.json({ imported: inserted.length, items: inserted });
  } catch (err) {
    console.error("Import error:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
