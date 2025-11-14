// backend/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

// Routes
const enquiryRoutes = require("./routes/enquiryRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const kbEnquiryRoutes = require("./routes/kbEnquiryRoutes");
const customEnquiryRoutes = require("./routes/customEnquiryRoutes");
const projectsRoutes = require("./routes/projects");
const uploads = require("./routes/uploads");
const importProjectsRouter = require("./routes/importProjects");
const uploadsRouter = require("./routes/getUploads");
const importImages = require("./routes/importImages");
const enquiries = require("./routes/enquiriesRoute");
const verifyFirebaseToken = require("./middleware/verifyFirebaseToken");
const requireAdmin = require("./middleware/requireAdmin");
const adminsRouter = require("./routes/addAdmin");
const testimonials = require("./routes/testimonialsRoutes");
const uploadTestimonialImage = require("./routes/uploadTestimonialImage");

const app = express();

// Static uploads - serve early
const UPLOADS_DIR = path.join(__dirname, "uploads");
app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "7d" }));

// === CREDENTIALS-AWARE CORS CONFIGURATION ===
// Set CLIENT_URL in your env (e.g. "http://localhost:5173").
// You can provide a comma-separated list if you need multiple origins.
const rawClientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = Array.isArray(rawClientUrl)
  ? rawClientUrl
  : String(rawClientUrl).split(",").map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    }
  },
  credentials: true, // Access-Control-Allow-Credentials: true
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// ensure preflight requests get the same CORS rules
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    // run the cors middleware for preflight and then continue
    return cors(corsOptions)(req, res, next);
  }
  next();
});

// Body parser
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes (kept exactly as your original names/paths)
app.use("/api/admins", adminsRouter);
app.use("/api/admin", verifyFirebaseToken, requireAdmin, adminRoutes);
app.use("/api/kb_enquiries", kbEnquiryRoutes);
app.use("/api/custom_enquiries", customEnquiryRoutes);
app.use("/auth", authRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/auth", adminRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/uploads", uploads);
app.use("/api/import-projects", importProjectsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/import-images", importImages);
app.use("/api/enquiries", enquiries);
app.use("/api/upload-testimonial-image", uploadTestimonialImage);
app.use("/api/testimonials", testimonials);
// Root endpoint
app.get("/", (req, res) => {
  res.send("A10 backend is running 🚀");
});

// Test endpoint to verify uploads folder
app.get("/test-uploads", (req, res) => {
  const fs = require("fs");
  const uploadsPath = path.join(__dirname, "uploads");
  
  if (!fs.existsSync(uploadsPath)) {
    return res.json({ error: "Uploads folder doesn't exist", path: uploadsPath });
  }
  
  const files = fs.readdirSync(uploadsPath);
  res.json({ 
    uploadsPath, 
    fileCount: files.length, 
    files: files.slice(0, 10) // Show first 10 files
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  
  // Verify uploads folder exists
  const fs = require("fs");
  const uploadsPath = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsPath)) {
    console.log("⚠️  Creating uploads folder...");
    fs.mkdirSync(uploadsPath);
  }
  console.log(`📁 Uploads folder: ${uploadsPath}`);
});
