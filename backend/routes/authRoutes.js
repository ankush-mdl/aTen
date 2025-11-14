// backend/routes/authRoutes.js
const express = require("express");
const db = require("../db");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");

const router = express.Router();

/**
 * POST /auth
 * Expects verifyFirebaseToken middleware to set req.firebaseUser with fields:
 *  - uid
 *  - phone_number
 *  - name (optional)
 */
router.post("/", verifyFirebaseToken, (req, res) => {
  try {
    const firebaseUser = req.firebaseUser || {};
    const uid = firebaseUser.uid;
    const phone = firebaseUser.phone_number || null;
    const name = firebaseUser.name || req.body.name || null;

    if (!uid) {
      return res.status(400).json({ error: "No uid in token" });
    }

    // 1) check admin table by phone (phone might be null)
    const checkAdmin = (cb) => {
      if (!phone) return cb(null, false);
      db.get("SELECT * FROM admin WHERE phone = ?", [phone], (err, adminRow) => {
        if (err) return cb(err);
        cb(null, !!adminRow);
      });
    };

    // 2) Try find user by uid first
    db.get("SELECT * FROM users WHERE uid = ?", [uid], (err, userRow) => {
      if (err) {
        console.error("DB error finding user by uid:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const finishResponse = (user, isAdmin) => {
        // Return user with auto-increment id and uid
        return res.json({
          success: true,
          user: {
            id: user.id,
            uid: user.uid,
            phone: user.phone,
            name: user.name || null,
            isAdmin: !!isAdmin,
          },
        });
      };

      if (userRow) {
        // Ensure uid stored (defensive)
        if (!userRow.uid) {
          db.run("UPDATE users SET uid = ? WHERE id = ?", [uid, userRow.id], (uErr) => {
            if (uErr) console.warn("Failed to update uid on existing user:", uErr);
            // check admin and respond
            checkAdmin((aErr, isAdmin) => {
              if (aErr) return res.status(500).json({ error: "Database error" });
              finishResponse({ ...userRow, uid }, isAdmin);
            });
          });
        } else {
          checkAdmin((aErr, isAdmin) => {
            if (aErr) return res.status(500).json({ error: "Database error" });
            finishResponse(userRow, isAdmin);
          });
        }
      } else {
        // If no user by uid, try find by phone (may exist from old insert)
        if (phone) {
          db.get("SELECT * FROM users WHERE phone = ?", [phone], (err2, userByPhone) => {
            if (err2) {
              console.error("DB error finding user by phone:", err2);
              return res.status(500).json({ error: "Database error" });
            }

            if (userByPhone) {
              // Update this row to add uid so subsequent logins by uid find it
              db.run("UPDATE users SET uid = ?, name = COALESCE(?, name) WHERE id = ?", [uid, name, userByPhone.id], (uErr) => {
                if (uErr) console.warn("Failed to update uid on userByPhone:", uErr);
                checkAdmin((aErr, isAdmin) => {
                  if (aErr) return res.status(500).json({ error: "Database error" });
                  finishResponse({ ...userByPhone, uid }, isAdmin);
                });
              });
            } else {
              // Create a new user row
              const insertSql = "INSERT INTO users (uid, name, phone, created_at) VALUES (?, ?, ?, datetime('now'))";
              db.run(insertSql, [uid, name, phone], function (insErr) {
                if (insErr) {
                  console.error("DB error inserting user:", insErr);
                  return res.status(500).json({ error: "Database error" });
                }
                const newUser = { id: this.lastID, uid, name, phone };
                checkAdmin((aErr, isAdmin) => {
                  if (aErr) return res.status(500).json({ error: "Database error" });
                  finishResponse(newUser, isAdmin);
                });
              });
            }
          });
        } else {
          // phone not available and no existing user by uid — create user with uid only
          const insertSql = "INSERT INTO users (uid, name, phone, created_at) VALUES (?, ?, ?, datetime('now'))";
          db.run(insertSql, [uid, name, phone], function (insErr) {
            if (insErr) {
              console.error("DB error inserting user (no phone):", insErr);
              return res.status(500).json({ error: "Database error" });
            }
            const newUser = { id: this.lastID, uid, name, phone };
            checkAdmin((aErr, isAdmin) => {
              if (aErr) return res.status(500).json({ error: "Database error" });
              finishResponse(newUser, isAdmin);
            });
          });
        }
      }
    });
  } catch (err) {
    console.error("/auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
