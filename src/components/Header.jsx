import "./Header.css";

export default function Header() {
  return (
    <header className="headerWrap">
      <div className="container header">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 15.5L10.2 10.3L13.2 13.3L19 7.5"
                stroke="rgba(80,255,170,0.95)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 4.8C4 4.36 4.36 4 4.8 4H19.2C19.64 4 20 4.36 20 4.8V19.2C20 19.64 19.64 20 19.2 20H4.8C4.36 20 4 19.64 4 19.2V4.8Z"
                stroke="rgba(14,165,255,0.55)"
                strokeWidth="1.4"
              />
            </svg>
          </div>
          <span className="brandName">Investome</span>
        </div>

        <nav className="nav">
          <a className="navItem" href="#ranking">랭킹</a>
          <a className="navItem" href="#charts">차트</a>
          <a className="navItem" href="#news">뉴스</a>
          <a className="navItem" href="#community">커뮤니티</a>
        </nav>

        <div className="headerRight">
          <button className="btn">검색</button>
          <button className="btn primary">로그인</button>
        </div>
      </div>
    </header>
  );
}