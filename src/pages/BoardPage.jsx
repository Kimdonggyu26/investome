import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import { getBoardPosts } from "../utils/boardStorage";
import "../styles/BoardPage.css";

const POSTS_PER_PAGE = 10;

export default function BoardPage() {
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();

  const [tab, setTab] = useState("all");
  const [searchType, setSearchType] = useState("titleContent");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    setPosts(getBoardPosts());
  }, []);

  const filteredPosts = useMemo(() => {
    let next = [...posts];

    if (tab === "popular") {
      next.sort(
        (a, b) =>
          b.likes - a.likes ||
          b.views - a.views ||
          b.comments - a.comments ||
          b.no - a.no
      );
    } else if (tab === "notice") {
      next = next.filter((post) => post.category === "notice");
    }

    const q = keyword.trim().toLowerCase();

    if (q) {
      next = next.filter((post) => {
        const title = String(post.title || "").toLowerCase();
        const content = String(post.content || "").toLowerCase();
        const author = String(post.author || "").toLowerCase();

        if (searchType === "title") return title.includes(q);
        if (searchType === "author") return author.includes(q);

        return title.includes(q) || content.includes(q);
      });
    }

    return next;
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
                시장 이야기, 종목 토론, 관점 공유를 자유롭게 올릴 수 있는 커뮤니티형 게시판 기본 화면이야.
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

              <input
                type="text"
                placeholder="게시판 검색"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />

              <button type="button">검색</button>
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
                <div className="boardRow" key={post.id ?? post.no}>
                  <div className="boardNo">{post.no}</div>

                  <div className="boardSubject">
                    <button type="button" className="boardSubjectBtn">
                      {post.category === "notice" ? (
                        <span className="boardNoticeBadge">공지</span>
                      ) : null}

                      <span className="boardSubjectText">{post.title}</span>

                      {post.comments > 0 ? (
                        <span className="boardComments">[{post.comments}]</span>
                      ) : null}
                    </button>

                    {post.content ? (
                      <div className="boardExcerpt">{post.content}</div>
                    ) : null}
                  </div>

                  <div className="boardAuthor">{post.author}</div>
                  <div className="boardDate">{post.date}</div>
                  <div className="boardViews">{post.views}</div>
                  <div className="boardLikes">{post.likes}</div>
                </div>
              ))}

              {pagePosts.length === 0 && (
                <div className="boardEmpty">검색 결과가 없어.</div>
              )}
            </div>
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