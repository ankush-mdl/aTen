// server/routes/testimonials.js
const express = require("express");
const supabase = require("../supabase");
const router = express.Router();

/**
 * Helper to fetch a testimonial by id
 */
async function getTestimonialById(id) {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * GET /api/testimonials
 * Returns all testimonials (most recent first), filtered by service type and rating if applicable
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.max(1, parseInt(req.query.limit || "50"));
    const offset = (page - 1) * limit;

    let query = supabase.from("testimonials").select("*").order("created_at", { ascending: false });

    if (req.query.service_type) {
      query = query.eq("service_type", req.query.service_type);
    }

    if (req.query.rating) {
      // allow numeric or string rating
      const ratingVal = parseInt(req.query.rating);
      if (!isNaN(ratingVal)) {
        query = query.eq("rating", ratingVal);
      } else {
        query = query.eq("rating", req.query.rating);
      }
    }

    const { data: rows, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Fetch testimonials error (supabase):", error);
      return res.status(500).json({ error: error.message || "Database error" });
    }

    return res.json({ items: rows || [], page, limit });
  } catch (err) {
    console.error("GET /api/testimonials unexpected error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

/**
 * POST /api/testimonials
 * Body: { name, review, customer_type, customer_image, rating, service_type, customer_phone }
 * Protected: requires verifyFirebaseToken
 */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const name = body.name ? String(body.name).trim() : "";
    const review = body.review ? String(body.review).trim() : "";
    const service_type = body.service_type ? String(body.service_type).trim() : null;
    const customer_phone = body.customer_phone ? String(body.customer_phone).trim() : null;
    const customer_type = body.customer_type ? String(body.customer_type).trim() : null;
    const customer_image = body.customer_image ? String(body.customer_image).trim() : null;

    // rating validation
    let rating = parseInt(body.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) rating = null;

    if (!name || !review) {
      return res.status(400).json({ error: "name and review are required" });
    }

    const insertObj = {
      name,
      review,
      customer_type: customer_type || null,
      service_type: service_type || null,
      customer_phone: customer_phone || null,
      customer_image: customer_image || null,
      rating,
      // isHome, page default handled by DB (if column exists)
    };

    const { data, error } = await supabase
      .from("testimonials")
      .insert([insertObj])
      .select()
      .maybeSingle();

    if (error) {
      console.error("Insert testimonial error (supabase):", error);
      return res.status(500).json({ error: error.message || "Database error" });
    }

    return res.status(201).json({ testimonial: data });
  } catch (err) {
    console.error("POST /api/testimonials unexpected error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

/**
 * PUT /api/testimonials/:id
 * Body: { name, review, customer_type, customer_image, rating, isHome, page }
 * Protected: requires verifyFirebaseToken
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  try {
    const existing = await getTestimonialById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    // choose value if provided in body, otherwise keep existing.
    const name = Object.prototype.hasOwnProperty.call(body, "name")
      ? String(body.name || "").trim()
      : existing.name;
    const review = Object.prototype.hasOwnProperty.call(body, "review")
      ? String(body.review || "").trim()
      : existing.review;
    const customer_phone = Object.prototype.hasOwnProperty.call(body, "customer_phone")
      ? (body.customer_phone === null ? null : String(body.customer_phone).trim())
      : existing.customer_phone;
    const service_type = Object.prototype.hasOwnProperty.call(body, "service_type")
      ? (body.service_type === null ? null : String(body.service_type).trim())
      : existing.service_type;
    const customer_type = Object.prototype.hasOwnProperty.call(body, "customer_type")
      ? (body.customer_type === null ? null : String(body.customer_type).trim())
      : existing.customer_type;
    const customer_image = Object.prototype.hasOwnProperty.call(body, "customer_image")
      ? (body.customer_image === null ? null : String(body.customer_image).trim())
      : existing.customer_image;

    // rating update + validation (allow explicit null to keep existing)
    let rating;
    if (Object.prototype.hasOwnProperty.call(body, "rating")) {
      rating = parseInt(body.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) rating = null;
    } else {
      rating = existing.rating;
    }

    // isHome (explicit set allowed)
    let isHome;
    if (Object.prototype.hasOwnProperty.call(body, "isHome")) {
      isHome = body.isHome ? 1 : 0;
    } else {
      isHome = existing.isHome || 0;
    }

    // page: allow explicit null -> cleared
    let page;
    if (Object.prototype.hasOwnProperty.call(body, "page")) {
      page = body.page === null ? null : String(body.page).trim();
      if (page === "") page = null;
    } else {
      page = existing.page || null;
    }

    // If page is set (non-null), require it to match service_type (if service_type exists)
    if (page !== null) {
      const serviceForCheck = service_type !== null ? service_type : existing.service_type;
      if (!serviceForCheck || String(page).toLowerCase() !== String(serviceForCheck).toLowerCase()) {
        return res.status(400).json({ error: "Service type must match the page" });
      }
    }

    if (!name || !review) {
      return res.status(400).json({ error: "name and review are required" });
    }

    const updateObj = {
      name,
      review,
      customer_type,
      service_type,
      customer_phone,
      customer_image,
      rating,
      isHome,
      page,
    };

    const { data, error } = await supabase
      .from("testimonials")
      .update(updateObj)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Update testimonial error (supabase):", error);
      return res.status(500).json({ error: error.message || "Database error" });
    }

    return res.json({ testimonial: data });
  } catch (err) {
    console.error("PUT /api/testimonials/:id unexpected error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

/**
 * DELETE /api/testimonials/:id
 * Protected: requires verifyFirebaseToken
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase.from("testimonials").delete().eq("id", id).select("id");
    if (error) {
      console.error("Delete testimonial error (supabase):", error);
      return res.status(500).json({ error: error.message || "Database error" });
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.status(404).json({ error: "Testimonial not found" });
    }

    return res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/testimonials/:id unexpected error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

module.exports = router;
