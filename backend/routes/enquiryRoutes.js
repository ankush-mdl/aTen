const express = require("express");
const db = require("../db"); // ensure this is your sqlite3 connection file

const router = express.Router();

router.post("/", (req, res) => {
  const {
    user_id,
    email,
    city,
    bhk_type,
    bathroom_number,
    kitchen_type,
    material,
    area,
    theme,
  } = req.body;

  if (!user_id || !email || !bhk_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `
    INSERT INTO home_enquiries (
      user_id, email, city, bhk_type, bathroom_number, kitchen_type, material,
      area, theme
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      user_id,
      email,
      city,
      bhk_type,
      bathroom_number,
      kitchen_type,
      material,
      area,
      theme,
    ],
    function (err) {
      if (err) {
        console.error("Error inserting enquiry:", err);
        return res.status(500).json({ error: "Database insert failed" });
      }

      res.status(201).json({
        message: "Enquiry saved successfully",
        enquiry_id: this.lastID,
      });
    }
  );
});

module.exports = router;
