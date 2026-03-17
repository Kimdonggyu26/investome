import { boardSeed } from "../data/boardSeed";

const STORAGE_KEY = "investome-board-posts-v2";
const LIKE_STORAGE_KEY = "investome-board-liked-posts-v1";

function emitBoardUpdate() {
  window.dispatchEvent(new Event("board-storage-updated"));
}

function nowIso() {
  return new Date().toISOString();
}

function toDisplayDate(dateValue) {
  const d = new Date(dateValue);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function seedToNormalized(posts) {
  const year = new Date().getFullYear();

  return posts.map((post, index) => {
    const [mm = "01", dd = "01"] = String(post.date || "01.01").split(".");
    const createdAt = new Date(
      year,
      Number(mm) - 1,
      Number(dd),
      9,
      index % 60,
      0
    ).toISOString();

    const commentCount = Number(post.comments) || 0;

    return {
      ...post,
      createdAt,
      updatedAt: createdAt,
      comments: Array.isArray(post.comments) ? post.comments : [],
      commentCount,
    };
  });
}

function normalizePost(post) {
  const createdAt = post.createdAt || nowIso();
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const commentCount =
    typeof post.commentCount === "number"
      ? post.commentCount
      : typeof post.comments === "number"
        ? post.comments
        : comments.length;

  return {
    id: post.id,
    no: Number(post.no) || 0,
    category: post.category || "free",
    title: String(post.title || ""),
    content: String(post.content || ""),
    author: String(post.author || "익명"),
    imageData: String(post.imageData || ""),
    imageName: String(post.imageName || ""),
    date: post.date || toDisplayDate(createdAt),
    createdAt,
    updatedAt: post.updatedAt || createdAt,
    views: Number(post.views) || 0,
    likes: Number(post.likes) || 0,
    comments,
    commentCount,
  };
}

function readRawPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const seeded = seedToNormalized(boardSeed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const seeded = seedToNormalized(boardSeed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    return parsed.map(normalizePost);
  } catch {
    return seedToNormalized(boardSeed);
  }
}

export function getBoardPosts() {
  return readRawPosts().sort((a, b) => {
    if (a.category === "notice" && b.category !== "notice") return -1;
    if (a.category !== "notice" && b.category === "notice") return 1;
    return (b.no || 0) - (a.no || 0);
  });
}

export function saveBoardPosts(posts) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(posts.map(normalizePost))
  );
  emitBoardUpdate();
}

export function getBoardPostById(postId) {
  const id = String(postId);
  return getBoardPosts().find((post) => String(post.id) === id) || null;
}

export function createBoardPost({ category, title, content, author, imageData, imageName }) {
  const posts = getBoardPosts();
  const maxNo = posts.reduce((max, post) => Math.max(max, Number(post.no) || 0), 0);
  const createdAt = nowIso();

  const next = normalizePost({
    id: Date.now(),
    no: maxNo + 1,
    category: category || "free",
    title: String(title || "").trim(),
    content: String(content || "").trim(),
    author: String(author || "").trim() || "익명",
    imageData: String(imageData || ""),
    imageName: String(imageName || ""),
    date: toDisplayDate(createdAt),
    createdAt,
    updatedAt: createdAt,
    views: 0,
    likes: 0,
    comments: [],
    commentCount: 0,
  });

  saveBoardPosts([next, ...posts]);
  return next;
}

export function incrementBoardPostViews(postId) {
  const id = String(postId);
  const posts = getBoardPosts();
  let updatedPost = null;

  const next = posts.map((post) => {
    if (String(post.id) !== id) return post;
    updatedPost = { ...post, views: (post.views || 0) + 1 };
    return updatedPost;
  });

  saveBoardPosts(next);
  return updatedPost;
}

function getLikedPostIds() {
  try {
    const raw = localStorage.getItem(LIKE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveLikedPostIds(set) {
  localStorage.setItem(LIKE_STORAGE_KEY, JSON.stringify(Array.from(set)));
}

export function isBoardPostLiked(postId) {
  return getLikedPostIds().has(String(postId));
}

export function toggleBoardPostLike(postId) {
  const id = String(postId);
  const likedIds = getLikedPostIds();
  const willLike = !likedIds.has(id);

  if (willLike) likedIds.add(id);
  else likedIds.delete(id);

  saveLikedPostIds(likedIds);

  const posts = getBoardPosts();
  let updatedPost = null;

  const next = posts.map((post) => {
    if (String(post.id) !== id) return post;

    const likes = Math.max(0, (post.likes || 0) + (willLike ? 1 : -1));
    updatedPost = { ...post, likes };
    return updatedPost;
  });

  saveBoardPosts(next);

  return {
    liked: willLike,
    post: updatedPost,
  };
}

export function addBoardComment(postId, { author, content }) {
  const id = String(postId);
  const posts = getBoardPosts();
  let updatedPost = null;

  const comment = {
    id: `comment-${Date.now()}`,
    author: String(author || "").trim() || "익명",
    content: String(content || "").trim(),
    createdAt: nowIso(),
  };

  const next = posts.map((post) => {
    if (String(post.id) !== id) return post;

    const comments = [...(post.comments || []), comment];
    updatedPost = {
      ...post,
      comments,
      commentCount: comments.length,
      updatedAt: nowIso(),
    };
    return updatedPost;
  });

  saveBoardPosts(next);
  return updatedPost;
}

export function formatBoardDateTime(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";

  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function isTodayBoardPost(post) {
  const base = post?.createdAt ? new Date(post.createdAt) : null;
  if (!base || Number.isNaN(base.getTime())) return false;

  const now = new Date();
  return (
    base.getFullYear() === now.getFullYear() &&
    base.getMonth() === now.getMonth() &&
    base.getDate() === now.getDate()
  );
}

export function getTodayPopularPosts(limit = 5) {
  return getBoardPosts()
    .filter((post) => post.category !== "notice")
    .filter(isTodayBoardPost)
    .sort(
      (a, b) =>
        (b.views || 0) - (a.views || 0) ||
        (b.likes || 0) - (a.likes || 0) ||
        (b.commentCount || 0) - (a.commentCount || 0) ||
        (b.no || 0) - (a.no || 0)
    )
    .slice(0, limit);
}