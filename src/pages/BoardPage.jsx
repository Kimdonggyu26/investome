import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import { deleteBoardPost, fetchBoardPosts } from "../api/boardApi";
import { getAuthUser } from "../utils/auth";
import { stripBoardContent } from "../utils/boardContent";
import "../styles/BoardPage.css";

const POSTS_PER_PAGE = 10;

function formatBoardDate(dateValue) {
  if (!dateValue) return "-";

  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}`;
}

export default function BoardPage() {
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();
  const authUser = useMemo(() => getAuthUser(), []);
  const isAdmin = authUser?.role === "ADMIN";

  const [tab, setTab] = useState("all");
  const [searchType, setSearchType] = useState("titleContent");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let mounted = true;

    fetchBoardPosts()
      .then((data) => {
        if (mounted) {
          setPosts(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (mounted) {
          setPosts([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    let next = [...posts];

    if (tab === "notice") {
      next = next.filter((post) => post.category === "notice");
    }

    const q = keyword.trim().toLowerCase();

    if (q) {
      next = next.filter((post) => {
        const title = String(post.title || "").toLowerCase();
        const content = stripBoardContent(post.content).toLowerCase();
        const author = String(post.author || "").toLowerCase();

        if (searchType === "title") return title.includes(q);
        if (searchType === "author") return author.includes(q);

        return title.includes(q) || content.includes(q);
      });
    }

    const sortByRecent = (a, b) => (b.id || 0) - (a.id || 0);

    const sortByPopular = (a, b) =>
      (b.likes || 0) - (a.likes || 0) ||
      (b.views || 0) - (a.views || 0) ||
      (b.commentCount || 0) - (a.commentCount || 0) ||
      sortByRecent(a, b);

    const notices = next.filter((post) => post.category === "notice").sort(sortByRecent);
    const regularPosts = next
      .filter((post) => post.category !== "notice")
      .sort(tab === "popular" ? sortByPopular : sortByRecent);

    return [...notices, ...regularPosts];
  }, [posts, tab, keyword, searchType]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, keyword, searchType]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const pagePosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  async function handleDeletePost(event, postId) {
    event.stopPropagation();
    const ok = window.confirm("이 게시글을 삭제할까요?");
    if (!ok) return;

    try {
      await deleteBoardPost(postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch (err) {
      alert(err.message || "게시글 삭제 중 오류가 발생했어요.");
    }
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

      <main className="boardPage">
        <div className="container">
          <section className="boardHero">
            <div>
              <div className="boardEyebrow">COMMUNITY BOARD</div>
              <h1 className="boardTitle">게시판</h1>
              <p className="boardDesc">
                시장 이야기, 종목 토론, 관심 공유를 자유롭게 나눠 보세요.
              </p>
            </div>

            <button
              type="button"
              className="boardWriteBtn"
              onClick={() => navigate("/board/write")}
            >
              글쓰기
            </button>
          </section>

          <section className="boardContentShell">
            <section className="boardToolbar">
              <div className="boardTabs">
                <button
                  type="button"
                  className={tab === "all" ? "active" : ""}
                  onClick={() => setTab("all")}
                >
                  전체글
                </button>
                <button
                  type="button"
                  className={tab === "popular" ? "active" : ""}
                  onClick={() => setTab("popular")}
                >
                  인기글
                </button>
                <button
                  type="button"
                  className={tab === "notice" ? "active" : ""}
                  onClick={() => setTab("notice")}
                >
                  공지
                </button>
              </div>

              <div className="boardSearch">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  <option value="titleContent">제목+내용</option>
                  <option value="title">제목</option>
                  <option value="author">글쓴이</option>
                </select>

                <div className="boardSearchKeywordRow">
                  <input
                    type="text"
                    placeholder="게시판 검색"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />

                  <button type="button">검색</button>
                </div>
              </div>
            </section>

            <section className="boardTableWrap">
              <div className="boardTableHead">
                <div>번호</div>
                <div>제목</div>
                <div>글쓴이</div>
                <div>작성일</div>
                <div>조회</div>
                <div>추천</div>
              </div>

              <div className="boardTableBody">
                {pagePosts.map((post) => (
                <div
                  className={`boardRow ${post.category === "notice" ? "boardRowNotice" : ""}`}
                  key={post.id ?? post.no}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/board/${post.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/board/${post.id}`);
                    }
                  }}
                >
                    <div className="boardNo">
                      {post.category === "notice" ? "공지" : post.no}
                    </div>

                    <div className="boardSubject">
                      <button
                        type="button"
                        className="boardSubjectBtn"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/board/${post.id}`);
                        }}
                      >
                        {post.category === "notice" ? (
                          <span className="boardNoticeBadge">공지</span>
                        ) : null}

                        <span className="boardSubjectText">{post.title}</span>

                        {(post.commentCount || 0) > 0 ? (
                          <span className="boardComments">[{post.commentCount}]</span>
                        ) : null}

                        {post.hasImage || post.imageData ? (
                          <span className="boardImageBadge">사진</span>
                        ) : null}

                      </button>

                      {isAdmin ? (
                        <button
                          type="button"
                          className="boardAdminDeleteBtn"
                          onClick={(event) => handleDeletePost(event, post.id)}
                        >
                          삭제
                        </button>
                      ) : null}

                      {stripBoardContent(post.content) ? (
                        <div className="boardExcerpt">{stripBoardContent(post.content)}</div>
                      ) : null}

                      <div className="boardMetaCompact">
                        <span className="boardMetaCompactAuthor">{post.author}</span>
                        <span>{formatBoardDate(post.createdAt)}</span>
                        <span>조회 {post.views}</span>
                        <span>추천 {post.likes}</span>
                      </div>
                    </div>

                    <div className="boardAuthor">{post.author}</div>
                    <div className="boardDate">{formatBoardDate(post.createdAt)}</div>
                    <div className="boardViews">{post.views}</div>
                    <div className="boardLikes">{post.likes}</div>
                  </div>
                ))}

                {pagePosts.length === 0 && (
                  <div className="boardEmpty">검색 결과가 없습니다.</div>
                )}
              </div>
            </section>
          </section>

          <div className="boardBottom">
            <div className="boardPager">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const page = idx + 1;
                return (
                  <button
                    key={page}
                    type="button"
                    className={page === currentPage ? "active" : ""}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
