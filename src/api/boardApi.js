import { apiUrl } from "../lib/apiClient";

function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchBoardPosts() {
  const res = await fetch(apiUrl("/api/board/posts"), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("게시글 목록 조회 실패");
  return res.json();
}

export async function fetchBoardPost(postId, increaseView = false) {
  const res = await fetch(
    apiUrl(`/api/board/posts/${postId}?increaseView=${increaseView}`),
    {
      headers: getAuthHeaders(),
    }
  );

  if (!res.ok) throw new Error("게시글 조회 실패");
  return res.json();
}

export async function createBoardPost(payload) {
  const res = await fetch(apiUrl("/api/board/posts"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "게시글 작성 실패");
  }

  return res.json();
}

export async function updateBoardPost(postId, payload) {
  const res = await fetch(apiUrl(`/api/board/posts/${postId}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "게시글 수정 실패");
  }

  return res.json();
}

export async function deleteBoardPost(postId) {
  const res = await fetch(apiUrl(`/api/board/posts/${postId}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "게시글 삭제 실패");
  }
}

export async function createBoardComment(postId, payload) {
  const res = await fetch(apiUrl(`/api/board/posts/${postId}/comments`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "댓글 작성 실패");
  }

  return res.json();
}

export async function deleteBoardComment(postId, commentId) {
  const res = await fetch(
    apiUrl(`/api/board/posts/${postId}/comments/${commentId}`),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "댓글 삭제 실패");
  }

  return res.json();
}

export async function toggleBoardPostLike(postId) {
  const res = await fetch(apiUrl(`/api/board/posts/${postId}/like`), {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "추천 처리 실패");
  }

  return res.json();
}