// server/routes/uploadTestimonialImage.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const supabase = require("../supabase");


const router = express.Router();

// Use in-memory storage for Supabase uploads
const upload = multer({ storage: multer.memoryStorage() });

const BUCKET = "uploads"; // change if your bucket name is different

function generateFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const rand = crypto.randomBytes(8).toString("hex");
  return `testimonial-${Date.now()}-${rand}${ext}`;
}

/**
 * POST /api/upload-testimonial-image
 * Field: image
 */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded (field name: image)" });
    }

    const filename = generateFilename(req.file.originalname);

    // folder structure (optional)
    const prefix = req.firebaseUser?.uid
      ? `testimonials/${req.firebaseUser.uid}`
      : `testimonials/general`;

    const filePath = `${prefix}/${filename}`;

    // Upload buffer to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({ error: "Upload failed", details: uploadError.message });
    }

    // Generate public URL
    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    res.json({
      url: publicUrlData.publicUrl,
      path: filePath,
      message: "Uploaded successfully",
    });
  } catch (err) {
    console.error("Upload testimonial image error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;
