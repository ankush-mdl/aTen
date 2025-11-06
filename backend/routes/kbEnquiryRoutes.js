// server/routes/kbEnquiryRoutes.js
const express = require("express");
const db = require("../db");
const router = express.Router();

/**
 * POST /api/kb_enquiries
 * Body expected:
 *  - user_id (number)
 *  - type ("bathroom" | "kitchen")
 *  - email, city, area
 *  - bathroom_type (if bathroom)
 *  - kitchen_type, kitchen_theme (if kitchen)
 */
router.post("/", (req, res) => {
  const { user_id, type, email, city, area, bathroom_type, kitchen_type, kitchen_theme } = req.body;
  if (!user_id || !type) return res.status(400).json({ error: "user_id and type are required" });

  // Build insert clause - only include relevant columns
  const sql = `
    INSERT INTO kb_enquiries
      (user_id, type, email, city, area, bathroom_type, kitchen_type, kitchen_theme, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `;
  db.run(sql, [user_id, type, email || null, city || null, area || 0, bathroom_type || null, kitchen_type || null, kitchen_theme || null], function (err) {
    if (err) {
      console.error("DB insert kb_enquiries error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.status(201).json({ id: this.lastID, message: "KB enquiry saved" });
  });
});

module.exports = router;
