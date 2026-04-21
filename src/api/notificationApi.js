import { apiUrl } from "../lib/apiClient";
import { getAuthHeaders } from "../utils/auth";

async function readJsonOrThrow(res, fallback) {
  if (!res.ok) {
    throw new Error(fallback);
  }
  return res.json();
}

export async function fetchNotifications() {
  const res = await fetch(apiUrl("/api/notifications"), {
    headers: getAuthHeaders(),
  });

  return readJsonOrThrow(res, "알림을 불러오지 못했어요.");
}

export async function markNotificationRead(notificationId) {
  const res = await fetch(apiUrl(`/api/notifications/${notificationId}/read`), {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return readJsonOrThrow(res, "알림을 읽음 처리하지 못했어요.");
}

export async function markAllNotificationsRead() {
  const res = await fetch(apiUrl("/api/notifications/read-all"), {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return readJsonOrThrow(res, "알림을 읽음 처리하지 못했어요.");
}
