import "./Header.css";

export default function Header() {
  return (
    <header className="headerWrap">
      <div className="container header">
        <div className="brand">
          <div className="logoMark" />
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