// backend/middleware/requireAdmin.js
const db = require("../db");

async function requireAdmin(req, res, next) {
  // ensure token verified first
  if (!req.firebaseUser) return res.status(401).json({ error: "Not authenticated" });

  const phone = req.firebaseUser.phone_number;
  if (!phone) return res.status(403).json({ error: "No phone number" });

  db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, row) => {
    if (err) {
      console.error("DB error checking admin:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (!row) return res.status(403).json({ error: "User not found" });
    if (row.isAdmin !== 1 && row.isAdmin !== true) {
      return res.status(403).json({ error: "Admin only" });
    }
    // attach DB user to request
    req.user = row;
    next();
  });
}

module.exports = requireAdmin;
