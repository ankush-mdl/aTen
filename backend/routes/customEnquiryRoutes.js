// server/routes/customEnquiryRoutes.js
const express = require("express");
const db = require("../db");
const router = express.Router();

/**
 * POST /api/custom_enquiries
 * Body: { user_id, type, email, city, area, message | custom_message }
 */
router.post("/", (req, res) => {
  const { user_id, type, email, city, area } = req.body;
  // Accept either 'message' (old) or 'custom_message' (frontend)
  const message = req.body.message ?? req.body.custom_message ?? null;

  if (!user_id) return res.status(400).json({ error: "user_id is required" });

  const sql = `
    INSERT INTO custom_enquiries (user_id, type, email, city, area, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `;
  db.run(sql, [user_id, type || null, email || null, city || null, area || 0, message], function (err) {
    if (err) {
      console.error("DB insert custom_enquiries error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.status(201).json({ id: this.lastID, message: "Custom enquiry saved" });
  });
});

module.exports = router;
