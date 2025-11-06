// src/lib/api.js
// Small helper to return absolute image URLs (backend returns "/uploads/xxx")
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

/**
 * Convert a backend image path ("/uploads/xxx" or "http...") into an absolute URL.
 * If input is already an absolute URL, it is returned unchanged.
 * @param {string} u
 * @returns {string|null}
 */
export function getImageUrl(u) {
  if (!u) return null;
  if (typeof u !== "string") return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  // Ensure leading slash present
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${API_BASE}${path}`;
}

export { API_BASE };
