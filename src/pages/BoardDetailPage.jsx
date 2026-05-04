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
import { clearAuth, getAuthUser, isLoggedIn } from "../utils/auth";
import { sanitizeBoardContent } from "../utils/boardContent";
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

function categoryLabel(category) {
  if (category === "notice") return "공지게시판";
  if (category === "free") return "자유게시판";
  return category || "게시판";
}

export default function BoardDetailPage() {
  const navigate = useNavigate();
  const { postId } = useParams();

  const authUser = useMemo(() => getAuthUser(), []);
  const loggedIn = isLoggedIn();
  const isAdmin = authUser?.role === "ADMIN";
  const nickname = authUser?.nickname || authUser?.name || "사용자";

  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState(null);
  const [commentForm, setCommentForm] = useState({
    author: nickname,
    content: "",
  });

  function handleExpiredAuth(message = "로그인이 만료되었어요. 다시 로그인해주세요.") {
    clearAuth();
    window.dispatchEvent(new Event("investome-auth-changed"));
    setCommentError(message);
    alert(message);
    navigate("/login");
  }

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
      if (err.message?.includes("로그인이 만료")) {
        handleExpiredAuth();
        return;
      }

      alert(err.message || "추천 처리 중 오류가 발생했어요.");
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    setCommentError("");

    if (!loggedIn) {
      setCommentError("댓글은 로그인 후 작성할 수 있어요.");
      return;
    }

    if (!commentForm.content.trim()) {
      setCommentError("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      const nextPost = await createBoardComment(postId, {
        content: commentForm.content,
        parentCommentId: replyTarget?.id ?? null,
      });

      setPost(nextPost);
      setLiked(!!nextPost.likedByMe);
      setCommentForm({
        author: nickname,
        content: "",
      });
      setReplyTarget(null);
    } catch (err) {
      if (err.message?.includes("로그인이 만료")) {
        handleExpiredAuth();
        return;
      }

      setCommentError(err.message || "댓글 등록 중 오류가 발생했어요.");
    }
  }

  async function handleDeletePost() {
    const ok = window.confirm("정말 이 게시글을 삭제할까요?");
    if (!ok) return;

    try {
      await deleteBoardPost(postId);
      alert("게시글을 삭제했어요.");
      navigate("/board");
    } catch (err) {
      if (err.message?.includes("로그인이 만료")) {
        handleExpiredAuth();
        return;
      }

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
      if (replyTarget?.id === commentId) {
        setReplyTarget(null);
      }
    } catch (err) {
      if (err.message?.includes("로그인이 만료")) {
        handleExpiredAuth();
        return;
      }

      alert(err.message || "댓글 삭제 중 오류가 발생했어요.");
    }
  }

  function handleReplyClick(comment) {
    if (!loggedIn) {
      alert("로그인 후 답글을 작성할 수 있어요.");
      navigate("/login");
      return;
    }

    setReplyTarget(comment);
    setCommentError("");
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
              <div className="boardDetailEmptyAction">
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

            {post.mine || isAdmin ? (
              <div className="boardDetailTopActions">
                {post.mine ? (
                  <button
                    type="button"
                    className="boardDetailGhostBtn"
                    onClick={() => navigate(`/board/${post.id}/edit`)}
                  >
                    수정
                  </button>
                ) : null}
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
            <div className="boardDetailCategory">{categoryLabel(post.category)}</div>
            <h1 className="boardDetailTitle">{post.title}</h1>

            <div className="boardDetailMeta">
              <span>작성자 {post.author}</span>
              <span>작성일 {formatBoardDateTime(post.createdAt)}</span>
              <span>조회 {post.views ?? 0}</span>
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

            <div
              className="boardDetailContent boardRichContent"
              dangerouslySetInnerHTML={{ __html: sanitizeBoardContent(post.content) }}
            />

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
                {loggedIn ? `${nickname}님` : "로그인 후 댓글을 작성할 수 있어요."}
              </div>

              {replyTarget ? (
                <div className="boardReplyNotice">
                  <span>
                    <strong>{replyTarget.author}</strong>님에게 답글 작성 중
                  </span>
                  <button type="button" onClick={() => setReplyTarget(null)}>
                    취소
                  </button>
                </div>
              ) : null}

              <textarea
                className="boardCommentTextarea"
                placeholder={
                  loggedIn
                    ? replyTarget
                      ? "답글 내용을 입력해주세요."
                      : "댓글 내용을 입력해주세요."
                    : "로그인 후 댓글을 작성할 수 있어요."
                }
                value={commentForm.content}
                onChange={(event) =>
                  setCommentForm((prev) => ({
                    ...prev,
                    content: event.target.value,
                  }))
                }
                disabled={!loggedIn}
              />

              {commentError ? <div className="boardCommentError">{commentError}</div> : null}

              <div className="boardCommentSubmitRow">
                <button
                  type="submit"
                  className="boardCommentSubmitBtn"
                  disabled={!loggedIn}
                >
                  {replyTarget ? "답글 등록" : "댓글 등록"}
                </button>
              </div>
            </form>

            <div className="boardCommentList luxuryScroll">
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`boardCommentItem ${comment.depth > 0 ? "isReply" : ""}`}
                  >
                    <div className="boardCommentItemHead">
                      <div className="boardCommentMetaMain">
                        <strong>{comment.author}</strong>
                        <span>{formatBoardDateTime(comment.createdAt)}</span>
                        {comment.depth > 0 ? (
                          <em className="boardCommentReplyBadge">답글</em>
                        ) : null}
                      </div>

                      <div className="boardCommentActions">
                        <button
                          type="button"
                          className="boardCommentActionBtn"
                          onClick={() => handleReplyClick(comment)}
                        >
                          답글
                        </button>
                        {comment.mine || isAdmin ? (
                          <button
                            type="button"
                            className="boardCommentActionBtn danger"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            삭제
                          </button>
                        ) : null}
                      </div>
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
