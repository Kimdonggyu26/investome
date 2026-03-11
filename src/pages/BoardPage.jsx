import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import "../styles/BoardPage.css";

const posts = [
  { no: 231, title: "비트 조정 오면 어디까지 볼까", comments: 12, author: "코직", date: "03.10", views: 182, likes: 7 },
  { no: 230, title: "솔라나 다시 강하게 보는 사람 있음?", comments: 6, author: "차트러", date: "03.10", views: 146, likes: 4 },
  { no: 229, title: "한화에어로스페이스 오늘 눌림 괜찮아보임", comments: 9, author: "국장매매", date: "03.10", views: 221, likes: 11 },
  { no: 228, title: "나스닥 오늘 CPI 앞두고 관망이 맞나", comments: 3, author: "미장데이", date: "03.10", views: 97, likes: 2 },
  { no: 227, title: "요즘 환율 때문에 미국주식 진입 고민됨", comments: 15, author: "달러체크", date: "03.10", views: 258, likes: 10 },
  { no: 226, title: "엔비디아 조정이면 오히려 기회 아님?", comments: 21, author: "반도체왕", date: "03.10", views: 314, likes: 18 },
  { no: 225, title: "비트 도미넌스 보면 알트 아직 애매한듯", comments: 8, author: "알트주의", date: "03.09", views: 201, likes: 6 },
  { no: 224, title: "국장 단타하기 좋은 종목 뭐 보냐", comments: 5, author: "스윙러", date: "03.09", views: 113, likes: 3 },
];

export default function BoardPage() {
  const { prices, changes, loading, error } = useTicker();

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
              <button type="button" className="active">전체글</button>
              <button type="button">인기글</button>
              <button type="button">공지</button>
            </div>

            <div className="boardSearch">
              <select>
                <option>제목+내용</option>
                <option>제목</option>
                <option>글쓴이</option>
                <option>댓글</option>
              </select>
              <input type="text" placeholder="게시판 검색" />
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
              {posts.map((post) => (
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
            </div>
          </section>

          <div className="boardBottom">
            <div className="boardPager">
              <button type="button" className="active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}