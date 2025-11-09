// backend/routes/authRoutes.js
const express = require("express");
const admin = require("../firebaseAdmin"); // Firebase Admin SDK
const db = require("../db"); // SQLite DB connection
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");

const router = express.Router();

/**
 * POST /auth
 * Validates Firebase ID token and checks if user is in admin table
 */
router.post("/", verifyFirebaseToken, (req, res) => {
  try {
    const phone = req.firebaseUser.phone_number;

    if (!phone) {
      return res.status(400).json({ error: "No phone number in token" });
    }

    // ✅ Check if phone number exists in admin table
    db.get("SELECT * FROM admin WHERE phone = ?", [phone], (err, adminRow) => {
      if (err) {
        console.error("Error checking admin table:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const isAdmin = !!adminRow;

      // Optionally, insert user in 'users' table if needed (commented out)
      // db.run("INSERT OR IGNORE INTO users (phone) VALUES (?)", [phone]);

      // ✅ Return Firebase user info + isAdmin flag
      return res.json({
        success: true,
        user: {
          uid: req.firebaseUser.uid,
          phone: req.firebaseUser.phone_number,
          name: req.firebaseUser.name || null,
          isAdmin,
        },
      });
    });
  } catch (err) {
    console.error("/auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
