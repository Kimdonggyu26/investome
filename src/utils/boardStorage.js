import { boardSeed } from "../data/boardSeed";

const STORAGE_KEY = "investome-board-posts-v1";

export function getBoardPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(boardSeed));
      return boardSeed;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : boardSeed;
  } catch {
    return boardSeed;
  }
}

export function saveBoardPosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export function createBoardPost({ category, title, content, author }) {
  const posts = getBoardPosts();
  const maxNo = posts.reduce((max, post) => Math.max(max, Number(post.no) || 0), 0);

  const now = new Date();
  const date = `${String(now.getMonth() + 1).padStart(2, "0")}.${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const next = {
    id: Date.now(),
    no: maxNo + 1,
    category: category || "free",
    title: String(title || "").trim(),
    content: String(content || "").trim(),
    author: String(author || "").trim() || "익명",
    date,
    views: 0,
    likes: 0,
    comments: 0,
  };

  const merged = [next, ...posts];
  saveBoardPosts(merged);

  return next;
}