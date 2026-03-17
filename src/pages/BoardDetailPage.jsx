import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import {
  addBoardComment,
  formatBoardDateTime,
  getBoardPostById,
  incrementBoardPostViews,
  isBoardPostLiked,
  toggleBoardPostLike,
} from "../utils/boardStorage";
import "../styles/BoardDetailPage.css";

function categoryLabel(category) {
  if (category === "notice") return "공지";
  if (category === "info") return "정보";
  if (category === "trade") return "매매일지";
  return "자유";
}

export default function BoardDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();

  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [commentForm, setCommentForm] = useState({
    author: "",
    content: "",
  });
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    const viewedKey = `investome-board-viewed-${postId}`;

    if (!sessionStorage.getItem(viewedKey)) {
      const viewedPost = incrementBoardPostViews(postId);
      if (viewedPost) {
        setPost(viewedPost);
      }
      sessionStorage.setItem(viewedKey, "true");
    } else {
      setPost(getBoardPostById(postId));
    }

    setLiked(isBoardPostLiked(postId));
  }, [postId]);

  function handleLike() {
    const result = toggleBoardPostLike(postId);
    if (!result?.post) return;
    setPost(result.post);
    setLiked(result.liked);
  }

  function handleCommentSubmit(e) {
    e.preventDefault();
    setCommentError("");

    if (!commentForm.content.trim()) {
      setCommentError("내용을 입력해 주세요.");
      return;
    }

    const nextPost = addBoardComment(postId, commentForm);
    if (!nextPost) {
      setCommentError("댓글 등록 중 오류가 발생 했습니다. 다시 시도해 주세요.");
      return;
    }

    setPost(nextPost);
    setCommentForm({
      author: "",
      content: "",
    });
  }

  if (!post) {
    return (
      <>
        <TopTickerBar
          prices={prices}
          changes={changes}
          loading={loading}
          error={error}
        />
        <Header />
        <main className="boardDetailPage">
          <div className="container">
            <div className="boardDetailEmpty">
              존재하지 않는 게시글이야.
              <button type="button" onClick={() => navigate("/board")}>
                게시판으로 돌아가기
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopTickerBar
        prices={prices}
        changes={changes}
        loading={loading}
        error={error}
      />
      <Header />

      <main className="boardDetailPage">
        <div className="container">
          <section className="boardDetailCard">
            <div className="boardDetailTopBar">
              <button
                type="button"
                className="boardDetailGhostBtn"
                onClick={() => navigate("/board")}
              >
                목록으로
              </button>
            </div>

            <div className="boardDetailBadgeRow">
              <span className="boardDetailBadge">{categoryLabel(post.category)}</span>
            </div>

            <h1 className="boardDetailTitle">{post.title}</h1>

            <div className="boardDetailMeta">
              <span>{post.author}</span>
              <span>{formatBoardDateTime(post.createdAt)}</span>
              <span>조회 {post.views}</span>
              <span>추천 {post.likes}</span>
              <span>댓글 {post.commentCount || 0}</span>
            </div>

            <div className="boardDetailContent">{post.content}</div>

            <div className="boardDetailActionRow">
              <button
                type="button"
                className={`boardDetailLikeBtn ${liked ? "active" : ""}`}
                onClick={handleLike}
              >
                {liked ? "추천 취소" : "추천하기"} · {post.likes}
              </button>
            </div>
          </section>

          <section className="boardCommentCard">
            <div className="boardCommentHead">
              <h3>댓글</h3>
              <span>{post.commentCount || 0}개</span>
            </div>

            <form className="boardCommentForm" onSubmit={handleCommentSubmit}>
              <div className="boardCommentFormTop">
                <input
                  type="text"
                  placeholder="닉네임"
                  value={commentForm.author}
                  onChange={(e) =>
                    setCommentForm((prev) => ({ ...prev, author: e.target.value }))
                  }
                />
              </div>

              <textarea
                placeholder="댓글을 입력해 주세요."
                value={commentForm.content}
                onChange={(e) =>
                  setCommentForm((prev) => ({ ...prev, content: e.target.value }))
                }
              />

              {commentError ? (
                <div className="boardCommentError">{commentError}</div>
              ) : null}

              <div className="boardCommentSubmitRow">
                <button type="submit">댓글 등록</button>
              </div>
            </form>

            <div className="boardCommentList">
              {(post.comments || []).length === 0 ? (
                <div className="boardCommentEmpty">아직 댓글이 없는 게시글이에요.</div>
              ) : (
                [...post.comments].reverse().map((comment) => (
                  <div className="boardCommentItem" key={comment.id}>
                    <div className="boardCommentItemTop">
                      <strong>{comment.author}</strong>
                      <span>{formatBoardDateTime(comment.createdAt)}</span>
                    </div>
                    <div className="boardCommentItemContent">{comment.content}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}