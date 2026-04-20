import { apiUrl } from "../lib/apiClient";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "investome_user";
const LOGGED_IN_KEY = "investome_logged_in";
const KEEP_LOGIN_KEY = "investome_keep_login";
const ACCESS_EXPIRES_AT_KEY = "accessTokenExpiresAt";

let refreshPromise = null;

function storages() {
  return [window.sessionStorage, window.localStorage];
}

function readValue(key) {
  for (const storage of storages()) {
    const value = storage.getItem(key);
    if (value !== null) return value;
  }
  return null;
}

function activeStorage() {
  if (window.sessionStorage.getItem(LOGGED_IN_KEY) === "true") {
    return window.sessionStorage;
  }
  if (window.localStorage.getItem(LOGGED_IN_KEY) === "true") {
    return window.localStorage;
  }
  return null;
}

function parseJwtPayload(token) {
  try {
    const [, payload = ""] = String(token || "").split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function deriveAccessTokenExpiry(token) {
  const payload = parseJwtPayload(token);
  const expSeconds = payload?.exp;
  return typeof expSeconds === "number" ? expSeconds * 1000 : null;
}

export function getAccessToken() {
  return readValue(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return readValue(REFRESH_TOKEN_KEY);
}

export function getAccessTokenExpiresAt() {
  const raw = readValue(ACCESS_EXPIRES_AT_KEY);
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const token = getAccessToken();
  return token ? deriveAccessTokenExpiry(token) : null;
}

export function getAuthUser() {
  try {
    const token = getAccessToken();
    const raw = readValue(USER_KEY);

    if (!token || !raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return parsed;
  } catch {
    return null;
  }
}

export function getAuthNickname(fallback = "사용자") {
  const user = getAuthUser();
  if (!user) return fallback;

  const nick = user.nickname;
  return String(nick || fallback).trim() || fallback;
}

export function isAccessTokenExpired(bufferMs = 0) {
  const expiresAt = getAccessTokenExpiresAt();
  if (!expiresAt) return !getAccessToken();
  return Date.now() + bufferMs >= expiresAt;
}

export function isLoggedIn() {
  return !!getAccessToken() && !!getAuthUser() && !isAccessTokenExpired();
}

export function clearAuth() {
  storages().forEach((storage) => {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
    storage.removeItem(USER_KEY);
    storage.removeItem(LOGGED_IN_KEY);
    storage.removeItem(KEEP_LOGIN_KEY);
    storage.removeItem(ACCESS_EXPIRES_AT_KEY);
  });
}

export function storeAuthSession(data, keepLogin) {
  clearAuth();

  const storage = keepLogin ? window.localStorage : window.sessionStorage;
  const accessTokenExpiresAt =
    Number(data?.accessTokenExpiresAt) || deriveAccessTokenExpiry(data?.accessToken);

  storage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  storage.setItem(
    USER_KEY,
    JSON.stringify({
      id: data.id,
      email: data.email,
      nickname: data.nickname,
      role: data.role,
    })
  );
  storage.setItem(LOGGED_IN_KEY, "true");
  storage.setItem(KEEP_LOGIN_KEY, keepLogin ? "true" : "false");
  if (accessTokenExpiresAt) {
    storage.setItem(ACCESS_EXPIRES_AT_KEY, String(accessTokenExpiresAt));
  }
}

export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  const keepLogin = readValue(KEEP_LOGIN_KEY) === "true";

  if (!refreshToken) {
    clearAuth();
    window.dispatchEvent(new Event("investome-auth-changed"));
    return false;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        throw new Error("refresh failed");
      }

      const data = await res.json();
      storeAuthSession(data, keepLogin);
      window.dispatchEvent(new Event("investome-auth-changed"));
      return true;
    } catch {
      clearAuth();
      window.dispatchEvent(new Event("investome-auth-changed"));
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function initializeAuthSession() {
  const token = getAccessToken();
  if (!token) {
    clearAuth();
    return false;
  }

  if (!isAccessTokenExpired(60_000)) {
    return true;
  }

  return refreshAccessToken();
}

export async function logoutAuth() {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // Best-effort logout.
  } finally {
    clearAuth();
    window.dispatchEvent(new Event("investome-auth-changed"));
  }
}

export function getAuthHeaders() {
  const token = getAccessToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
