import { apiUrl } from "../lib/apiClient";
import { clearAuth } from "../utils/auth";

function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readErrorMessage(res, fallback) {
  let text = "";

  try {
    text = await res.text();
  } catch {
    text = "";
  }

  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event("investome-auth-changed"));
    return "로그인이 만료되었어요. 다시 로그인해주세요.";
  }

  if (res.status === 403) {
    return "권한이 없어요.";
  }

  try {
    const parsed = text ? JSON.parse(text) : null;
    if (parsed?.message) return parsed.message;
    if (parsed?.error) return String(parsed.error);
  } catch {
    // plain text response
  }

  return text || fallback;
}

async function readJsonOrThrow(res, fallback) {
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, fallback));
  }

  return res.json();
}

export async function fetchBoardPosts() {
  const res = await fetch(apiUrl("/api/board/posts"), {
    headers: getAuthHeaders(),
  });

  return readJsonOrThrow(res, "게시글 목록을 불러오지 못했어요.");
}

export async function fetchBoardPost(postId, increaseView = false) {
  const res = await fetch(
    apiUrl(`/api/board/posts/${postId}?increaseView=${increaseView}`),
    {
      headers: getAuthHeaders(),
    }
  );

  return readJsonOrThrow(res, "게시글을 불러오지 못했어요.");
}

export async function createBoardPost(payload) {
  const res = await fetch(apiUrl("/api/board/posts"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return readJsonOrThrow(res, "게시글 작성에 실패했어요.");
}

export async function updateBoardPost(postId, payload) {
  const res = await fetch(apiUrl(`/api/board/posts/${postId}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return readJsonOrThrow(res, "게시글 수정에 실패했어요.");
}

export async function deleteBoardPost(postId) {
  const res = await fetch(apiUrl(`/api/board/posts/${postId}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "게시글 삭제에 실패했어요."));
  }
}

export async function createBoardComment(postId, payload) {
  const res = await fetch(apiUrl(`/api/board/posts/${postId}/comments`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return readJsonOrThrow(res, "댓글 작성에 실패했어요.");
}

export async function deleteBoardComment(postId, commentId) {
  const res = await fetch(
    apiUrl(`/api/board/posts/${postId}/comments/${commentId}`),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return readJsonOrThrow(res, "댓글 삭제에 실패했어요.");
}

export async function toggleBoardPostLike(postId) {
  const res = await fetch(apiUrl(`/api/board/posts/${postId}/like`), {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return readJsonOrThrow(res, "추천 처리에 실패했어요.");
}
