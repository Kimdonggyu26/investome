const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  return `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
}