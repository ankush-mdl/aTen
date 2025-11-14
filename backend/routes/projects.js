// server/routes/projects.js
const express = require("express");
const db = require("../db");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const router = express.Router();
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

/**
 * Helper: safely parse JSON fields stored as TEXT
 */
function safeParse(v, fallback = []) {
  if (v === null || v === undefined) return fallback;
  if (Array.isArray(v)) return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

/**
 * GET /api/projects
 * Supports: ?q, ?city, ?property_type, ?location_area, ?configuration, ?page, ?limit
 * Returns full project rows (SELECT *) with JSON fields parsed.
 */
router.get("/", (req, res) => {
  const {
    q,
    city,
    property_type,
    location_area,
    configuration,
    page = 1,
    limit = 24,
  } = req.query;

  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  // Select all columns
  let sql = `SELECT * FROM projects`;

  const params = [];
  const where = [];

  if (city) {
    where.push("LOWER(city) = LOWER(?)");
    params.push(city);
  }

  if (property_type) {
    where.push("LOWER(property_type) = LOWER(?)");
    params.push(property_type);
  }

  if (location_area) {
    where.push("LOWER(location_area) = LOWER(?)");
    params.push(location_area);
  }

  if (q) {
    where.push("(title LIKE ? OR address LIKE ? OR rera LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  // Filter by configuration (stored as JSON text)
  if (configuration) {
    where.push("configurations LIKE ?");
    params.push(`%${configuration}%`);
  }

  if (where.length) {
    sql += " WHERE " + where.join(" AND ");
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), offset);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Fetch projects error:", err);
      return res.status(500).json({ error: err.message });
    }

    // parse JSON/text columns so frontend receives structured data
    const list = rows.map((r) => ({
      ...r,
      configurations: r.configurations ? safeParse(r.configurations, []) : [],
      highlights: r.highlights ? safeParse(r.highlights, []) : [],
      amenities: r.amenities ? safeParse(r.amenities, []) : [],
      gallery: r.gallery ? safeParse(r.gallery, []) : [],
      price_info: r.price_info ? safeParse(r.price_info, null) : null,
    }));

    res.json({ items: list, page: parseInt(page) });
  });
});

/**
 * POST /api/projects
 * Body: full project object. Creates slug automatically if not provided.
 * NOTE: protect this route with auth in production.
 */
router.post("/", verifyFirebaseToken,  (req, res) => {
  const body = req.body || {};
  const slugVal = body.slug ? slugify(body.slug) : slugify(body.title);

  const data = {
    slug: slugVal,
    title: body.title || "",
    location_area: body.location_area || "",
    city: body.city || "",
    address: body.address || "",
    rera: body.rera || null,
    status: body.status || null,
    property_type: body.property_type || null,
    configurations: JSON.stringify(body.configurations || []),
    blocks: body.blocks || null,
    units: body.units || null,
    floors: body.floors || null,
    land_area: body.land_area || null,
    description: body.description || null,
    videos: body.videos || null,
    developer_name: body.developer_name || null,
    developer_logo: body.developer_logo || null,
    developer_description: body.developer_description || null,
    highlights: JSON.stringify(body.highlights || []),
    amenities: JSON.stringify(body.amenities || []),
    gallery: JSON.stringify(body.gallery || []),
    thumbnail: body.thumbnail || null,
    brochure_url: body.brochure_url || null,
    contact_phone: body.contact_phone || null,
    contact_email: body.contact_email || null,
    price_info: JSON.stringify(body.price_info || null),
  };

  const sql = `INSERT INTO projects
    (slug, title, location_area, city, address, rera, status, property_type,
     configurations, blocks, units, floors, land_area, description, viseod, developer_name, developer_logo, developer_description, highlights, amenities, gallery, thumbnail,
     brochure_url, contact_phone, contact_email, price_info, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;

  const params = [
    data.slug,
    data.title,
    data.location_area,
    data.city,
    data.address,
    data.rera,
    data.status,
    data.property_type,
    data.configurations,
    data.blocks,
    data.units,
    data.floors,
    data.land_area,
    data.description,
    data.videos,
    data.developer_name,
    data.developer_logo,
    data.developer_description,
    data.highlights,
    data.amenities,
    data.gallery,
    data.thumbnail,
    data.brochure_url,
    data.contact_phone,
    data.contact_email,
    data.price_info,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("Insert project error:", err);
      return res.status(500).json({ error: err.message });
    }
    db.get("SELECT * FROM projects WHERE id = ?", [this.lastID], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.status(201).json({ id: row.id, slug: row.slug });
    });
  });
});

/**
 * PUT /api/projects/:id  (update)
 */
router.put("/:id", verifyFirebaseToken,  (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const slugVal = body.slug ? String(body.slug) : slugify(body.title);

  const sql = `UPDATE projects SET
    slug = ?, title = ?, location_area = ?, city = ?, address = ?, rera = ?, status = ?, property_type = ?,
    configurations = ?, blocks = ?, units = ?, floors = ?, land_area=?, description=?, videos=?, developer_name=?, developer_logo=?, developer_description=?, highlights = ?, amenities = ?,
    gallery = ?, thumbnail = ?, brochure_url = ?, contact_phone = ?, contact_email = ?, price_info = ?, updated_at = datetime('now')
    WHERE id = ?`;

  const params = [
    slugVal,
    body.title || "",
    body.location_area || "",
    body.city || "",
    body.address || "",
    body.rera || null,
    body.status || null,
    body.property_type || null,
    JSON.stringify(body.configurations || []),
    body.blocks || null,
    body.units || null,
    body.floors || null,
    body.land_area || null,
    body.description || null,
    body.videos || null,
    body.developer_name || null, 
    body.developer_logo || null, 
    body.developer_description || null,
    JSON.stringify(body.highlights || []),
    JSON.stringify(body.amenities || []),
    JSON.stringify(body.gallery || []),
    body.thumbnail || null,
    body.brochure_url || null,
    body.contact_phone || null,
    body.contact_email || null,
    JSON.stringify(body.price_info || null),
    id,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("Update project error:", err);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    db.get("SELECT * FROM projects WHERE id = ?", [id], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      // parse json fields before returning
      const parsed = {
        ...row,
        configurations: safeParse(row.configurations, []),
        highlights: safeParse(row.highlights, []),
        amenities: safeParse(row.amenities, []),
        gallery: safeParse(row.gallery, []),
        price_info: row.price_info ? safeParse(row.price_info, null) : null,
      };
      res.json({ project: parsed });
    });
  });
});

/**
 * DELETE /api/projects/:id
 */
router.delete("/:id", verifyFirebaseToken,  (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM projects WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted" });
  });
});

module.exports = router;
