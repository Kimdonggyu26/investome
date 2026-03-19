export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function getAuthUser() {
  try {
    const token = getAccessToken();
    const raw = localStorage.getItem("investome_user");

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

export function isLoggedIn() {
  return !!getAccessToken() && !!getAuthUser();
}

export function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("investome_user");
  localStorage.removeItem("investome_logged_in");
  localStorage.removeItem("investome_keep_login");
}