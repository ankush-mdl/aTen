// server/index.js
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

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/api/kb_enquiries", kbEnquiryRoutes);
app.use("/api/custom_enquiries", customEnquiryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/auth", adminRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/uploads", uploads);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.send("A10 backend is running 🚀");
});

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
