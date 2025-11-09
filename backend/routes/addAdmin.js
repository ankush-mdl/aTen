// backend/routes/admins.js
const express = require("express");
const db = require("../db"); // your sqlite3 db instance
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken"); // MUST exist


const router = express.Router();

// ensure admin table exists (use your provided SQL)
db.run(`
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error("Failed to ensure admin table:", err);
});

/** Helper - normalize phone (store digits or E.164 if + included) */
function normalizePhone(phone) {
  if (!phone) return "";
  const s = String(phone).trim();
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * GET /api/admins
 * Returns: { items: [ { id, name, phone, created_at } ] }
 */
router.get("/", verifyFirebaseToken, (req, res) => {
  db.all("SELECT id, name, phone, created_at FROM admin ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      console.error("GET /api/admins error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json({ items: rows || [] });
  });
});

/**
 * POST /api/admins
 * body: { phone: string (required), name?: string }
 * Creates a new admin record (or returns existing). Idempotent-ish.
 */
router.post("/", verifyFirebaseToken, (req, res) => {
  const { phone: rawPhone, name } = req.body || {};
  if (!rawPhone) return res.status(400).json({ error: "phone required" });

  const phone = normalizePhone(rawPhone);

  const upsertSql = `
    INSERT INTO admin (phone, name)
    VALUES (?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      name = excluded.name
  `;

  db.run(upsertSql, [phone, name || null], function (err) {
    if (err) {
      console.error("POST /api/admins db error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    // return the inserted/updated row
    const id = this.lastID;
    // fetch row by phone
    db.get("SELECT id, name, phone, created_at FROM admin WHERE phone = ?", [phone], (err2, row) => {
      if (err2) {
        console.error("POST /api/admins readback error:", err2);
        return res.status(500).json({ error: "DB error" });
      }
      res.status(201).json({ admin: row });
    });
  });
});

/**
 * PUT /api/admins/:id
 * body: { phone?: string, name?: string }
 * Update admin record's phone or name. (Phone must remain unique)
 */
router.put("/:id", verifyFirebaseToken, (req, res) => {
  const id = req.params.id;
  const { phone: rawPhone, name } = req.body || {};
  if (!id) return res.status(400).json({ error: "id required" });

  // build dynamic update
  const fields = [];
  const values = [];
  if (rawPhone !== undefined) {
    fields.push("phone = ?");
    values.push(normalizePhone(rawPhone));
  }
  if (name !== undefined) {
    fields.push("name = ?");
    values.push(name || null);
  }
  if (fields.length === 0) return res.status(400).json({ error: "nothing to update" });

  values.push(id);
  const sql = `UPDATE admin SET ${fields.join(", ")} WHERE id = ?`;
  db.run(sql, values, function (err) {
    if (err) {
      console.error("PUT /api/admins/:id error:", err);
      // unique constraint on phone?
      if (err.code === "SQLITE_CONSTRAINT") return res.status(409).json({ error: "phone already exists" });
      return res.status(500).json({ error: "DB error" });
    }
    // return updated row
    db.get("SELECT id, name, phone, created_at FROM admin WHERE id = ?", [id], (err2, row) => {
      if (err2) {
        console.error("PUT readback error:", err2);
        return res.status(500).json({ error: "DB error" });
      }
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json({ admin: row });
    });
  });
});

/**
 * DELETE /api/admins/:id
 * Remove admin (demote)
 */
router.delete("/:id", verifyFirebaseToken, (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "id required" });

  db.run("DELETE FROM admin WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("DELETE /api/admins/:id error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });
});

module.exports = router;
