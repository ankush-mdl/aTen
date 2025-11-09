// server/routes/enquiriesRoutes.js
const express = require("express");
const db = require("../db");
const router = express.Router();

// promise wrapper for db.all
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// promise wrapper for db.run (for updates/deletes)
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

/**
 * TABLE_MAP config:
 * - table: actual DB table
 * - cols: columns to select (alias e.id -> enquiry_id)
 * - editable: columns allowed for update (exclude created_at & primary id)
 */
const TABLE_MAP = {
  home: {
    table: "home_enquiries",
    cols: [
      "e.id AS enquiry_id",
      "e.user_id",
      "u.name",
      "u.phone AS user_phone",
      "e.email",
      "e.city",
      "e.type",
      "e.bathroom_number",
      "e.kitchen_type",
      "e.material",
      "e.area",
      "e.theme",
      "e.created_at",
    ],
    editable: [
      "user_id",
      "email",
      "city",
      "type",
      "bathroom_number",
      "kitchen_type",
      "material",
      "area",
      "theme",
    ],
  },
  custom: {
    table: "custom_enquiries",
    cols: [
      "e.id AS enquiry_id",
      "e.user_id",
      "u.name",
      "u.phone AS user_phone",
      "e.email",
      "e.type",
      "e.city",
      "e.area",
      "e.message",
      "e.created_at",
    ],
    editable: ["user_id", "email", "type", "city", "area", "message"],
  },
  kb: {
    table: "kb_enquiries",
    cols: [
      "e.id AS enquiry_id",
      "e.user_id",
      "u.name",
      "u.phone AS user_phone",
      "e.email",
      "e.type",
      "e.city",
      "e.area",
      "e.bathroom_type",
      "e.kitchen_type",
      "e.kitchen_theme",
      "e.created_at",
    ],
    editable: [
      "user_id",
      "email",
      "type",
      "city",
      "area",
      "bathroom_type",
      "kitchen_type",
      "kitchen_theme",
    ],
  },
};

// Helper: query single table
function buildSelectSqlFor(key) {
  const meta = TABLE_MAP[key];
  if (!meta) return null;
  return `
    SELECT ${meta.cols.join(", ")}
    FROM ${meta.table} e
    LEFT JOIN users u ON e.user_id = u.id
    ORDER BY e.created_at DESC
  `;
}

/**
 * GET /api/enquiries?table=home|custom|kb
 * Returns JSON { items: [ ...rows ] }.
 * NOTE: frontend will provide one of the three table values (no "all")
 */
router.get("/", async (req, res) => {
  try {
    const table = (req.query.table || "").trim();
    if (!table || !TABLE_MAP[table]) {
      return res.status(400).json({ error: "Invalid or missing table. Use home|custom|kb" });
    }
    const sql = buildSelectSqlFor(table);
    const rows = await allAsync(sql, []);
    // annotate each row with table for frontend convenience
    const annotated = (rows || []).map((r) => ({ ...r, table: table }));
    return res.json({ items: annotated });
  } catch (err) {
    console.error("GET /api/enquiries error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * GET /api/enquiries/related?user_id=... | ?phone=... | ?email=...
 * Strict matching:
 * - If user_id present: match e.user_id = ?
 * - Otherwise phone: normalize digits and match EXACT equality to users.phone digits
 * - Otherwise email: lower-case and match exact equality to users.email or e.email
 *
 * Returns { items: [ ... ] } from all three tables (deduped)
 */
router.get("/related", async (req, res) => {
  try {
    const { user_id, phone, email } = req.query;
    if (!user_id && !phone && !email) {
      return res.status(400).json({ error: "Provide user_id or phone or email as query params" });
    }

    const normPhone = phone ? String(phone).replace(/\D/g, "") : null;
    const normEmail = email ? String(email).trim().toLowerCase() : null;

    // Build queries per table depending on provided identifier.
    const queries = Object.keys(TABLE_MAP).map((k) => {
      const meta = TABLE_MAP[k];
      // start select
      const colsSql = meta.cols.join(", ");
      let where = [];
      let params = [];

      if (user_id) {
        where.push("e.user_id = ?");
        params.push(user_id);
      } else {
        // strict phone equality: normalize stored u.phone (remove non-digits) and compare equals
        if (normPhone) {
          // sanitize u.phone in SQL using nested REPLACE
          const sanitizedPhoneExpr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(u.phone,''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', '')";
          where.push(`${sanitizedPhoneExpr} = ?`);
          params.push(normPhone);
        }
        if (normEmail) {
          where.push("LOWER(IFNULL(u.email,'')) = ? OR LOWER(IFNULL(e.email,'')) = ?");
          params.push(normEmail, normEmail);
        }
      }

      const whereClause = where.length ? `WHERE (${where.join(" OR ")})` : "";
      const sql = `
        SELECT ${colsSql}
        FROM ${meta.table} e
        LEFT JOIN users u ON e.user_id = u.id
        ${whereClause}
        ORDER BY e.created_at DESC
      `;
      return { key: k, sql, params };
    });

    const results = await Promise.all(queries.map((q) => allAsync(q.sql, q.params)));
    let combined = results.flat().map((r, idx) => {
      // try to detect its original table by matching columns? We'll trust our queries and annotate by index mapping
      return r;
    });

    // Annotate each row with table correctly: we can recompute by running queries sequentially and tagging
    const tagged = [];
    for (let i = 0; i < queries.length; i++) {
      const rows = await allAsync(queries[i].sql, queries[i].params);
      for (const row of rows) {
        tagged.push({ ...row, table: queries[i].key });
      }
    }

    // dedupe (by table + enquiry_id)
    const seen = new Set();
    const unique = [];
    for (const r of tagged) {
      const key = `${r.table}-${r.enquiry_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    }

    return res.json({ items: unique });
  } catch (err) {
    console.error("GET /api/enquiries/related error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * PUT /api/enquiries/:table/:id
 * Update allowed columns for a given enquiry
 */
router.put("/:table/:id", async (req, res) => {
  try {
    const tableKey = (req.params.table || "").trim();
    const id = req.params.id;
    if (!TABLE_MAP[tableKey]) return res.status(400).json({ error: "Invalid table" });

    const editable = TABLE_MAP[tableKey].editable || [];
    const payload = req.body || {};

    // Build SET clause only from editable fields
    const setParts = [];
    const params = [];
    for (const field of editable) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        setParts.push(`${field} = ?`);
        params.push(payload[field]);
      }
    }

    if (setParts.length === 0) {
      return res.status(400).json({ error: "No editable fields provided" });
    }

    const sql = `UPDATE ${TABLE_MAP[tableKey].table} SET ${setParts.join(", ")} WHERE id = ?`;
    params.push(id);

    const result = await runAsync(sql, params);
    if (result.changes && result.changes > 0) {
      // return updated row
      const selectSql = `
        SELECT e.*, u.name, u.phone as user_phone
        FROM ${TABLE_MAP[tableKey].table} e
        LEFT JOIN users u ON e.user_id = u.id
        WHERE e.id = ?
      `;
      const rows = await allAsync(selectSql, [id]);
      return res.json({ updated: rows[0] || null });
    } else {
      return res.status(404).json({ error: "Enquiry not found or nothing changed" });
    }
  } catch (err) {
    console.error("PUT /api/enquiries/:table/:id error:", err);
    return res.status(500).json({ error: "update failed" });
  }
});

/**
 * DELETE /api/enquiries/:table/:id
 */
router.delete("/:table/:id", async (req, res) => {
  try {
    const tableKey = (req.params.table || "").trim();
    const id = req.params.id;
    if (!TABLE_MAP[tableKey]) return res.status(400).json({ error: "Invalid table" });

    const sql = `DELETE FROM ${TABLE_MAP[tableKey].table} WHERE id = ?`;
    const result = await runAsync(sql, [id]);
    if (result.changes && result.changes > 0) {
      return res.json({ deleted: true });
    } else {
      return res.status(404).json({ error: "Not found" });
    }
  } catch (err) {
    console.error("DELETE /api/enquiries/:table/:id error:", err);
    return res.status(500).json({ error: "delete failed" });
  }
});

module.exports = router;
