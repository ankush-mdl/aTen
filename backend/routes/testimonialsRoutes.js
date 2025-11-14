const express = require("express");
const db = require("../db");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const router = express.Router();

/**
 * Helper to fetch a testimonial by id
 */
function getTestimonialById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM testimonials WHERE id = ?", [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

/**
 * GET /api/testimonials
 * Returns all testimonials (most recent first), filtered by service type and rating if applicable
 */
router.get("/", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1"));
  const limit = Math.max(1, parseInt(req.query.limit || "50"));
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM testimonials";
  const params = [];

  // Service type filter
  if (req.query.service_type) {
    query += " WHERE service_type = ?";
    params.push(req.query.service_type);
  }

  // Rating filter
  if (req.query.rating) {
    query += params.length ? " AND rating = ?" : " WHERE rating = ?";
    params.push(req.query.rating);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Fetch testimonials error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ items: rows, page, limit });
  });
});

/**
 * POST /api/testimonials
 * Body: { name, review, customer_type, customer_image, rating, service_type, customer_phone }
 * Protected: requires verifyFirebaseToken
 */
router.post("/", (req, res) => {
  const body = req.body || {};

  const name = body.name ? String(body.name).trim() : "";
  const review = body.review ? String(body.review).trim() : "";
  const service_type = body.service_type ? String(body.service_type).trim() : null;
  const customer_phone = body.customer_phone ? String(body.customer_phone).trim() : null;
  const customer_type = body.customer_type ? String(body.customer_type).trim() : null;
  const customer_image = body.customer_image ? String(body.customer_image).trim() : null;

  // ⭐ rating validation
  let rating = parseInt(body.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) rating = null;

  if (!name || !review) {
    return res.status(400).json({ error: "name and review are required" });
  }

  const sql = `
    INSERT INTO testimonials (name, review, customer_type, service_type, customer_phone, customer_image, rating, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `;

  const params = [name, review, customer_type, service_type, customer_phone, customer_image, rating];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("Insert testimonial error:", err);
      return res.status(500).json({ error: err.message });
    }

    db.get("SELECT * FROM testimonials WHERE id = ?", [this.lastID], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.status(201).json({ testimonial: row });
    });
  });
});

/**
 * PUT /api/testimonials/:id
 * Body: { name, review, customer_type, customer_image, rating, isHome, page }
 * Protected: requires verifyFirebaseToken
 */
// ---- in your router file (e.g. routes/testimonials.js) ----
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  try {
    const existing = await getTestimonialById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    // choose value if provided in body, otherwise keep existing.
    const name =
      body.hasOwnProperty("name") ? String(body.name || "").trim() : existing.name;
    const review =
      body.hasOwnProperty("review") ? String(body.review || "").trim() : existing.review;
    const customer_phone =
      body.hasOwnProperty("customer_phone")
        ? (body.customer_phone === null ? null : String(body.customer_phone).trim())
        : existing.customer_phone;
    const service_type =
      body.hasOwnProperty("service_type")
        ? (body.service_type === null ? null : String(body.service_type).trim())
        : existing.service_type;
    const customer_type =
      body.hasOwnProperty("customer_type")
        ? (body.customer_type === null ? null : String(body.customer_type).trim())
        : existing.customer_type;
    const customer_image =
      body.hasOwnProperty("customer_image")
        ? (body.customer_image === null ? null : String(body.customer_image).trim())
        : existing.customer_image;

    // rating update + validation (allow explicit null to keep existing)
    let rating;
    if (body.hasOwnProperty("rating")) {
      rating = parseInt(body.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) rating = null;
    } else {
      rating = existing.rating;
    }

    // isHome (explicit set allowed)
    let isHome;
    if (body.hasOwnProperty("isHome")) {
      // allow 0/1, true/false, "0"/"1"
      isHome = body.isHome ? 1 : 0;
    } else {
      isHome = existing.isHome || 0;
    }

    // page: allow explicit null -> cleared
    let page;
    if (body.hasOwnProperty("page")) {
      page = body.page === null ? null : String(body.page).trim();
      if (page === "") page = null; // treat empty string as clear
    } else {
      page = existing.page || null;
    }

    // If page is set (non-null), require it to match service_type (if service_type exists)
    if (page !== null) {
      // determine the service type to compare against (the updated value if provided)
      const serviceForCheck = service_type !== null ? service_type : existing.service_type;
      if (!serviceForCheck || String(page).toLowerCase() !== String(serviceForCheck).toLowerCase()) {
        return res.status(400).json({ error: "Service type must match the page" });
      }
    }

    if (!name || !review) {
      return res.status(400).json({ error: "name and review are required" });
    }

    const sql = `
      UPDATE testimonials
      SET name = ?, review = ?, customer_type = ?, service_type = ?, customer_phone = ?, customer_image = ?, rating = ?, isHome = ?, page = ?
      WHERE id = ?
    `;
    const params = [name, review, customer_type, service_type, customer_phone, customer_image, rating, isHome, page, id];

    db.run(sql, params, function (err) {
      if (err) {
        console.error("Update testimonial error:", err);
        return res.status(500).json({ error: err.message });
      }

      db.get("SELECT * FROM testimonials WHERE id = ?", [id], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json({ testimonial: row });
      });
    });
  } catch (err) {
    console.error("Fetch testimonial error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/testimonials/:id
 * Protected: requires verifyFirebaseToken
 */
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM testimonials WHERE id = ?";
  db.run(sql, [id], function (err) {
    if (err) {
      console.error("Delete testimonial error:", err);
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Testimonial not found" });
    }

    res.json({ message: "Deleted successfully" });
  });
});

module.exports = router;
