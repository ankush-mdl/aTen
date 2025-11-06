const express = require("express");
const router = express.Router();
const db = require("../db");

// Create or log in user (after OTP verification)
router.post("/", (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "Both name and phone are required" });
  }

  const phoneNormalized = String(phone).trim();
  const nameNormalized = String(name).trim();

  // 1) Look up user by phone
  const selectSql = `SELECT * FROM users WHERE phone = ?`;
  db.get(selectSql, [phoneNormalized], (err, row) => {
    if (err) {
      console.error("DB error on SELECT users:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (row) {
      // User exists — enforce name match
      const storedName = row.name ? String(row.name).trim() : "";
      if (storedName && storedName !== nameNormalized) {
        // Name mismatch — reject login for previously-logged-in user
        return res.status(400).json({
          error: "Provided name does not match the existing account for this phone."
        });
      }

      // Name matches (or stored name is empty) -> allow login
      return res.json({
        user: {
          id: row.id,
          name: row.name || nameNormalized,
          phone: row.phone,
          isAdmin: !!row.isAdmin // optional if you have this column
        }
      });
    }

    // 2) No existing user: create new user
    const insertSql = `INSERT INTO users (name, phone, created_at) VALUES (?, ?, datetime('now'))`;
    db.run(insertSql, [nameNormalized, phoneNormalized], function (insertErr) {
      if (insertErr) {
        console.error("DB error on INSERT users:", insertErr);
        return res.status(500).json({ error: "Database error on create user" });
      }
      const newUser = {
        id: this.lastID,
        name: nameNormalized,
        phone: phoneNormalized,
        isAdmin: false
      };
      return res.status(201).json({ user: newUser });
    });
  });
});

module.exports = router;