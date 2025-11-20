// src/lib/api.js
// NOTE: Vite exposes env vars on import.meta.env (not process.env)
const VITE_BACKEND = import.meta.env.VITE_BACKEND_BASE || "";

// Default dev backend (used when explicitly running locally)
const DEFAULT_DEV_BACKEND = VITE_BACKEND || "http://localhost:5000";

/* -------------------------
   Backend base resolver
   ------------------------- */
function getBackendBase() {
  // Server-side (SSR) or bundling time: return DEFAULT_DEV_BACKEND
  if (typeof window === "undefined") return DEFAULT_DEV_BACKEND;

  // If a build-time backend was provided (VITE_BACKEND), use it in the browser too
  if (VITE_BACKEND) return VITE_BACKEND;

  // Otherwise, detect local dev hostnames
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return DEFAULT_DEV_BACKEND;

  // No explicit backend configured — use empty string so relative URLs point to same origin
  return "";
}
const BASE = getBackendBase();

/* -------------------------
   URL helpers
   ------------------------- */
function looksAbsoluteUrl(s) {
  if (!s) return false;
  const t = String(s).trim();
  if (!t) return false;
  return /^https?:\/\//i.test(t) || /^\/\//.test(t) || t.includes("://");
}

/* -------------------------
   Image helper (getImageUrl)
   ------------------------- */
export function getImageUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s; // signed/public URL -> return unchanged
  // if it's an absolute path returned by server (e.g., '/uploads/xyz.jpg'), prefix backend base
  const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE || "";
  if (s.startsWith("/")) return `${BACKEND_BASE}${s}`;
  // if it's a raw storage path like 'projects/abc.jpg', you can either:
  // - ask server to return signedUrl/publicUrl (recommended), or
  // - construct a public url (not ideal for private buckets)
  return s;
}


/* -------------------------
   Auth helpers + fetch wrappers
   ------------------------- */

export function getAuthToken() {
  try {
    return localStorage.getItem("auth_token") || null;
  } catch (e) {
    console.warn("getAuthToken error", e);
    return null;
  }
}

export async function sendWithAuth(rawPathOrUrl, opts = {}) {
  const url = looksAbsoluteUrl(rawPathOrUrl)
    ? rawPathOrUrl
    : `${BASE}${rawPathOrUrl.startsWith("/") ? "" : "/"}${rawPathOrUrl}`;

  const token = getAuthToken();
  const headers = new Headers(opts.headers || {});

  if (!headers.has("Content-Type") && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...opts, headers, credentials: "include" });

  const text = await response.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (response.status === 401 || response.status === 403) {
    const err = new Error("Unauthorized");
    err.status = response.status;
    err.body = data;
    throw err;
  }

  return { ok: response.ok, status: response.status, data };
}

export async function apiFetch(path, opts = {}) {
  return sendWithAuth(path, opts);
}

export default { getImageUrl, getAuthToken, sendWithAuth, apiFetch };
