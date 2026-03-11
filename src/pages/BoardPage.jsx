import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import "../styles/BoardPage.css";

const posts = [
  { no: 231, category: "all", title: "비트 조정 오면 어디까지 볼까", comments: 12, author: "코직", date: "03.10", views: 182, likes: 7 },
  { no: 230, category: "all", title: "솔라나 다시 강하게 보는 사람 있음?", comments: 6, author: "차트러", date: "03.10", views: 146, likes: 4 },
  { no: 229, category: "all", title: "한화에어로스페이스 오늘 눌림 괜찮아보임", comments: 9, author: "국장매매", date: "03.10", views: 221, likes: 11 },
  { no: 228, category: "all", title: "나스닥 오늘 CPI 앞두고 관망이 맞나", comments: 3, author: "미장데이", date: "03.10", views: 97, likes: 2 },
  { no: 227, category: "all", title: "요즘 환율 때문에 미국주식 진입 고민됨", comments: 15, author: "달러체크", date: "03.10", views: 258, likes: 10 },
  { no: 226, category: "all", title: "엔비디아 조정이면 오히려 기회 아님?", comments: 21, author: "반도체왕", date: "03.10", views: 314, likes: 18 },
  { no: 225, category: "all", title: "비트 도미넌스 보면 알트 아직 애매한듯", comments: 8, author: "알트주의", date: "03.09", views: 201, likes: 6 },
  { no: 224, category: "all", title: "국장 단타하기 좋은 종목 뭐 보냐", comments: 5, author: "스윙러", date: "03.09", views: 113, likes: 3 },
  { no: 223, category: "notice", title: "게시판 이용 안내", comments: 2, author: "운영자", date: "03.09", views: 420, likes: 14 },
  { no: 222, category: "all", title: "리플은 이번에 신고점 다시 도전할까", comments: 11, author: "리플러", date: "03.08", views: 163, likes: 5 },
  { no: 221, category: "all", title: "국내 반도체주 지금 담기 괜찮냐", comments: 7, author: "주식초보", date: "03.08", views: 145, likes: 4 },
  { no: 220, category: "notice", title: "허위정보 및 분쟁 유발 게시물 주의", comments: 0, author: "운영자", date: "03.07", views: 388, likes: 12 },
];

const POSTS_PER_PAGE = 10;

export default function BoardPage() {
  const { prices, changes, loading, error } = useTicker();

  const [tab, setTab] = useState("all");
  const [searchType, setSearchType] = useState("titleContent");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPosts = useMemo(() => {
    let next = [...posts];

    if (tab === "popular") {
      next.sort((a, b) => b.likes - a.likes || b.views - a.views || b.no - a.no);
    } else if (tab === "notice") {
      next = next.filter((post) => post.category === "notice");
    }

    const q = keyword.trim().toLowerCase();

    if (q) {
      next = next.filter((post) => {
        const title = post.title.toLowerCase();
        const author = post.author.toLowerCase();
        const commentText = String(post.comments);

        if (searchType === "title") return title.includes(q);
        if (searchType === "author") return author.includes(q);
        if (searchType === "comments") return commentText.includes(q);

        return title.includes(q) || author.includes(q);
      });
    }

    return next;
  }, [tab, keyword, searchType]);

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

            <button type="button" className="boardWriteBtn">
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
                <option value="comments">댓글</option>
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
                <div className="boardRow" key={post.no}>
                  <div className="boardNo">{post.no}</div>

                  <div className="boardSubject">
                    <button type="button" className="boardSubjectBtn">
                      <span className="boardSubjectText">{post.title}</span>
                      {post.comments > 0 && (
                        <span className="boardComments">[{post.comments}]</span>
                      )}
                    </button>
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