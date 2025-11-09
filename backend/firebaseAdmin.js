// backend/firebaseAdmin.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (!admin.apps.length) {
  let serviceAccount;

  // Preferred: full JSON stored in FIREBASE_SERVICE_ACCOUNT env var (recommended for cloud)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", err);
      throw err;
    }
  }
  // Fallback: GOOGLE_APPLICATION_CREDENTIALS can be either a JSON string OR a path to file
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
    try {
      if (raw.startsWith("{")) {
        // env var contains JSON
        serviceAccount = JSON.parse(raw);
      } else {
        // treat it as a file path relative to this file
        const fp = path.isAbsolute(raw) ? raw : path.join(__dirname, raw);
        if (!fs.existsSync(fp)) {
          throw new Error(`Service account file not found at ${fp}`);
        }
        serviceAccount = require(fp);
      }
    } catch (err) {
      console.error("Failed to load GOOGLE_APPLICATION_CREDENTIALS:", err);
      throw err;
    }
  } else {
    throw new Error(
      "Firebase service account not configured. Set FIREBASE_SERVICE_ACCOUNT (recommended) or GOOGLE_APPLICATION_CREDENTIALS."
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase admin initialized");
}

module.exports = admin;
