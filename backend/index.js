// backend/index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const enquiryRoutes = require("./routes/enquiryRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const kbEnquiryRoutes = require("./routes/kbEnquiryRoutes");
const customEnquiryRoutes = require("./routes/customEnquiryRoutes");
const projectsRoutes = require("./routes/projects");
const uploads = require("./routes/uploads");
const path = require("path");
const importProjectsRouter = require("./routes/importProjects");
const uploadsRouter = require("./routes/getUploads");
const importImages = require("./routes/importImages")

const app = express();
const UPLOADS_DIR = path.join(__dirname, "uploads");
app.use("/uploads", express.static(UPLOADS_DIR, {
  maxAge: "7d",
}));

// CORS must be before routes
app.use(cors());
app.use(bodyParser.json());

// CRITICAL FIX: Static files MUST be served BEFORE API routes
// This line needs to come early
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use("/api/kb_enquiries", kbEnquiryRoutes);
app.use("/api/custom_enquiries", customEnquiryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/auth", adminRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/uploads", uploads);
app.use("/api/import-projects", importProjectsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/import-images", importImages);
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

const PORT = 5000;
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