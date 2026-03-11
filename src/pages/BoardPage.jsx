import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import { getBoardPosts } from "../utils/boardStorage";
import "../styles/BoardPage.css";

export default function BoardPage() {
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();

  const [tab, setTab] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    setPosts(getBoardPosts());
  }, []);

  const filteredPosts = useMemo(() => {
    let arr = [...posts];

    if (tab === "popular") {
      arr = [...arr].sort(
        (a, b) => (b.likes + b.views + b.comments * 2) - (a.likes + a.views + a.comments * 2)
      );
    } else if (tab === "notice") {
      arr = arr.filter((post) => post.category === "notice");
    }

    const q = keyword.trim().toLowerCase();

    if (q) {
      arr = arr.filter((post) => {
        const source = `${post.title} ${post.content} ${post.author}`.toLowerCase();
        return source.includes(q);
      });
    }

    return arr;
  }, [posts, tab, keyword]);

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
                시장 이야기, 종목 토론, 관점 공유를 자유롭게 올릴 수 있는 커뮤니티 공간이야.
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
              <input
                type="text"
                placeholder="제목, 내용, 글쓴이 검색"
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
              {filteredPosts.map((post) => (
                <div className="boardRow" key={post.id}>
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

                    <div className="boardExcerpt">{post.content}</div>
                  </div>

                  <div className="boardAuthor">{post.author}</div>
                  <div className="boardDate">{post.date}</div>
                  <div className="boardViews">{post.views}</div>
                  <div className="boardLikes">{post.likes}</div>
                </div>
              ))}

              {filteredPosts.length === 0 ? (
                <div className="boardEmpty">조건에 맞는 게시글이 없어.</div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}