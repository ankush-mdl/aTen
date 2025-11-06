const express = require("express");
const db = require("../db"); // your sqlite db wrapper
const router = express.Router();

// POST /api/auth/admin
router.post("/admin", (req, res) => {
  const { name, phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  // Check if phone is in admins table
  const checkSql = `SELECT * FROM admin WHERE phone = ?`;
  db.get(checkSql, [phone], (err, adminRow) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!adminRow) {
      // Not an admin — reject
      return res.status(403).json({ error: "Not an admin" });
    }

    // Optional: create or update users table for this admin
    const findUser = `SELECT * FROM users WHERE phone = ?`;
    db.get(findUser, [phone], (e, userRow) => {
      if (e) return res.status(500).json({ error: e.message });

      const respondWithUser = (user) => {
        // Build user object with isAdmin true
        const u = { id: user.id, name: user.name || name || adminRow.name, phone: user.phone, isAdmin: true };
        return res.json({ user: u });
      };

      if (userRow) {
        respondWithUser(userRow);
      } else {
        const ins = `INSERT INTO users (name, phone, created_at) VALUES (?, ?, datetime('now'))`;
        db.run(ins, [name || adminRow.name || null, phone], function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          // lastID is this.lastID
          const newUser = { id: this.lastID, name: name || adminRow.name, phone };
          respondWithUser(newUser);
        });
      }
    });
  });
});

module.exports = router;
