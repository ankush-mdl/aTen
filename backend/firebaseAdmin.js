// backend/firebaseAdmin.js
const admin = require("firebase-admin");
const path = require("path");

// Load service account path via env var or local path
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, "firebase-service-account.json");

if (!admin.apps.length) {
  const serviceAccount = require(keyPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    
  });
}

module.exports = admin;
