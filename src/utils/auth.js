export function getAuthUser() {
  try {
    const loggedIn = localStorage.getItem("investome_logged_in") === "true";
    const raw = localStorage.getItem("investome_user");
    if (!loggedIn || !raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getAuthUser();
}

export function getAuthNickname(fallback = "사용자") {
  const nick = getAuthUser()?.nickname;
  return String(nick || fallback).trim() || fallback;
}