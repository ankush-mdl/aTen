// utils/getBackendImage.js (or inline)
export function resolveImageUrl(raw) {
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/uploads")) {
    // backend host in dev:
    const backend = (typeof window !== "undefined" && window.location && window.location.hostname === "localhost") ? "http://localhost:5000" : "";
    return backend + raw;
  }
  // if it's just a filename, also prefix
  const backend = (typeof window !== "undefined" && window.location && window.location.hostname === "localhost") ? "http://localhost:5000" : "";
  return backend + "/uploads/" + raw;
}
