const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Storage location
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads")); // same uploads directory
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random()*1e9);
    cb(null, "testimonial-" + unique + ext);
  },
});

const upload = multer({ storage });

// POST /api/upload-testimonial-image
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const url = "/uploads/" + req.file.filename;

  res.json({
    url,
    filename: req.file.filename,
  });
});

module.exports = router;
