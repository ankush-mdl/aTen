const db = require("../db");

/**
 * Require admin middleware
 * Checks if logged-in Firebase user’s phone number is listed in admin table
 */
function requireAdmin(req, res, next) {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const phone = req.firebaseUser.phone_number;
    if (!phone) {
      return res.status(403).json({ error: "Missing phone number in Firebase token" });
    }

    const normalizedPhone = String(phone).trim();

    const query = `SELECT * FROM admin WHERE phone = ? LIMIT 1`;
    db.get(query, [normalizedPhone], (err, row) => {
      if (err) {
        console.error("DB error in requireAdmin:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (!row) {
        console.warn(`Unauthorized admin access attempt from phone: ${normalizedPhone}`);
        return res.status(403).json({ error: "Admin access denied" });
      }

      // ✅ Admin exists — allow request to proceed
      req.admin = row;
      next();
    });
  } catch (err) {
    console.error("Unexpected error in requireAdmin:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = requireAdmin;
