import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import {
  createBoardComment,
  deleteBoardComment,
  deleteBoardPost,
  fetchBoardPost,
  toggleBoardPostLike,
} from "../api/boardApi";
import { getAuthUser, isLoggedIn } from "../utils/auth";
import "../styles/BoardDetailPage.css";

function formatBoardDateTime(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";

  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function BoardDetailPage() {
  const navigate = useNavigate();
  const { postId } = useParams();

  const authUser = useMemo(() => getAuthUser(), []);
  const loggedIn = isLoggedIn();
  const nickname = authUser?.nickname || authUser?.name || "사용자";

  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [loading, setLoading] = useState(true);

  const [commentForm, setCommentForm] = useState({
    author: nickname,
    content: "",
  });

  useEffect(() => {
    setCommentForm((prev) => ({
      ...prev,
      author: nickname,
    }));
  }, [nickname]);

  useEffect(() => {
    let mounted = true;
    const viewedKey = `investome-board-viewed-${postId}`;
    const shouldIncrease = !sessionStorage.getItem(viewedKey);

    setLoading(true);

    fetchBoardPost(postId, shouldIncrease)
      .then((data) => {
        if (!mounted) return;

        setPost(data);
        setLiked(!!data.likedByMe);

        if (shouldIncrease) {
          sessionStorage.setItem(viewedKey, "true");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setPost(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [postId]);

  async function handleLike() {
    if (!loggedIn) {
      alert("로그인 후 추천할 수 있어요.");
      navigate("/login");
      return;
    }

    try {
      const nextPost = await toggleBoardPostLike(postId);
      setPost(nextPost);
      setLiked(!!nextPost.likedByMe);
    } catch (err) {
      alert(err.message || "추천 처리 중 오류가 발생했어요.");
    }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    setCommentError("");

    if (!loggedIn) {
      setCommentError("댓글 작성은 로그인 후 이용할 수 있어요.");
      return;
    }

    if (!commentForm.content.trim()) {
      setCommentError("내용을 입력해 주세요.");
      return;
    }

    try {
      const nextPost = await createBoardComment(postId, {
        content: commentForm.content,
      });

      setPost(nextPost);
      setLiked(!!nextPost.likedByMe);
      setCommentForm({
        author: nickname,
        content: "",
      });
    } catch (err) {
      setCommentError(err.message || "댓글 등록 중 오류가 발생했습니다.");
    }
  }

  async function handleDeletePost() {
    const ok = window.confirm("정말 이 게시글을 삭제할까요?");
    if (!ok) return;

    try {
      await deleteBoardPost(postId);
      alert("게시글이 삭제되었어요.");
      navigate("/board");
    } catch (err) {
      alert(err.message || "게시글 삭제 중 오류가 발생했어요.");
    }
  }

  async function handleDeleteComment(commentId) {
    const ok = window.confirm("이 댓글을 삭제할까요?");
    if (!ok) return;

    try {
      const nextPost = await deleteBoardComment(postId, commentId);
      setPost(nextPost);
      setLiked(!!nextPost.likedByMe);
    } catch (err) {
      alert(err.message || "댓글 삭제 중 오류가 발생했어요.");
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="boardDetailPage">
          <section className="boardDetailWrap">
            <div className="boardDetailEmpty">게시글을 불러오는 중입니다...</div>
          </section>
        </main>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header />
        <main className="boardDetailPage">
          <section className="boardDetailWrap">
            <div className="boardDetailEmpty">
              게시글을 찾을 수 없습니다.
              <div style={{ marginTop: 16 }}>
                <Link to="/board" className="boardDetailGhostBtn">
                  목록으로
                </Link>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="boardDetailPage">
        <section className="boardDetailWrap">
          <div className="boardDetailTopBar">
            <button
              type="button"
              className="boardDetailGhostBtn"
              onClick={() => navigate("/board")}
            >
              목록으로
            </button>

            {post.mine ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="boardDetailGhostBtn"
                  onClick={() => navigate(`/board/${post.id}/edit`)}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="boardDetailGhostBtn"
                  onClick={handleDeletePost}
                >
                  삭제
                </button>
              </div>
            ) : null}
          </div>

          <article className="boardDetailCard">
            <div className="boardDetailCategory">
              {post.category === "free" ? "자유게시판" : post.category}
            </div>

            <h1 className="boardDetailTitle">{post.title}</h1>

            <div className="boardDetailMeta">
              <span>작성자 {post.author}</span>
              <span>작성일 {formatBoardDateTime(post.createdAt)}</span>
              <span>조회수 {post.views ?? 0}</span>
              <span>추천 {post.likes ?? 0}</span>
              <span>댓글 {post.commentCount ?? 0}</span>
            </div>

            {post.imageData ? (
              <div className="boardDetailImageWrap">
                <img
                  src={post.imageData}
                  alt={post.imageName || post.title}
                  className="boardDetailImage"
                />
              </div>
            ) : null}

            <div className="boardDetailContent">{post.content}</div>

            <div className="boardDetailActionRow">
              <button
                type="button"
                className={`boardDetailLikeBtn ${liked ? "isActive" : ""}`}
                onClick={handleLike}
              >
                {liked ? "추천 취소" : "추천"}
              </button>
            </div>
          </article>

          <section className="boardCommentSection">
            <div className="boardCommentHeader">
              <h2>댓글</h2>
              <span>{post.comments?.length ?? 0}개</span>
            </div>

            <form className="boardCommentForm" onSubmit={handleCommentSubmit}>
              <div className="boardCommentAuthor">
                {loggedIn ? `${nickname} 님` : "로그인 후 댓글 작성 가능"}
              </div>

              <textarea
                className="boardCommentTextarea"
                placeholder={
                  loggedIn
                    ? "댓글을 입력해 주세요."
                    : "로그인 후 댓글을 작성할 수 있어요."
                }
                value={commentForm.content}
                onChange={(e) =>
                  setCommentForm((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                disabled={!loggedIn}
              />

              {commentError ? (
                <div className="boardCommentError">{commentError}</div>
              ) : null}

              <div className="boardCommentSubmitRow">
                <button
                  type="submit"
                  className="boardCommentSubmitBtn"
                  disabled={!loggedIn}
                >
                  댓글 등록
                </button>
              </div>
            </form>

            <div className="boardCommentList">
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment) => (
                  <div key={comment.id} className="boardCommentItem">
                    <div className="boardCommentItemTop">
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <strong>{comment.author}</strong>
                        <span>{formatBoardDateTime(comment.createdAt)}</span>
                      </div>

                      {comment.mine ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#ff8a8a",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                        >
                          삭제
                        </button>
                      ) : null}
                    </div>

                    <div className="boardCommentItemContent">{comment.content}</div>
                  </div>
                ))
              ) : (
                <div className="boardCommentEmpty">아직 댓글이 없습니다.</div>
              )}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}