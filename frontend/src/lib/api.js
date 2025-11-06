// frontend/src/lib/api.js

const DEFAULT_DEV_BACKEND = "http://localhost:5000";

// Auto-detect backend base
function getBackendBase() {
  if (typeof window === "undefined") return DEFAULT_DEV_BACKEND;

  const host = window.location.hostname;

  // Development
  if (host === "localhost" || host === "127.0.0.1") {
    return DEFAULT_DEV_BACKEND;
  }

  // Production: assume backend is same origin OR set via env
  const origin = window.location.origin;
  return origin; // or use VITE_BACKEND_URL if using Vite
}

function looksAbsoluteUrl(s) {
  if (!s) return false;
  const t = String(s).trim();
  if (!t) return false;
  return /^https?:\/\//i.test(t) || /^\/\//.test(t) || t.includes("://");
}

export function getImageUrl(raw) {
  if (raw === null || raw === undefined) return null;

  let s = Array.isArray(raw) ? raw[0] : raw;
  if (s === null || s === undefined) return null;
  s = String(s).trim();
  if (!s) return null;

  if (looksAbsoluteUrl(s)) return s;

  const base = getBackendBase();

  // If path starts with /uploads, ensure base is prepended
  if (s.startsWith("/uploads/") || s.startsWith("uploads/")) {
    return `${base}${s.startsWith("/") ? "" : "/"}${s}`;
  }

  // Relative path: treat as /uploads/...
  if (!s.startsWith("/")) {
    s = `/uploads/${s}`;
  } else if (!s.startsWith("/uploads/")) {
    s = `/uploads${s}`;
  }

  return `${base}${s}`;
}

export default { getImageUrl };