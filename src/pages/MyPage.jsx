import { Link } from "react-router-dom";
import MyPortfolio from "../components/MyPortfolio";
import "../styles/MyPage.css";

function MyPagePreview() {
  return (
    <div className="mypagePreviewShell">
      <div className="mypagePreviewOverlay">
        <div className="mypagePreviewBadge">LOGIN TO UNLOCK</div>
      </div>

      <div className="mypagePreviewScale">
        <MyPortfolio />
      </div>
    </div>
  );
}

export default function MyPage() {
  const isLoggedIn = localStorage.getItem("investome_logged_in") === "true";

  if (!isLoggedIn) {
    return (
      <section className="mypageGuestWrap">
        <div className="mypageGuestCard">
          <div className="mypageGuestGlow mypageGuestGlow1" />
          <div className="mypageGuestGlow mypageGuestGlow2" />

          <div className="mypageGuestBadge">MEMBERS ONLY</div>

          <div className="mypageGuestIconWrap">
            <div className="mypageGuestIcon">◌</div>
          </div>

          <h1 className="mypageGuestTitle">로그인 후 이용해주세요</h1>

          <p className="mypageGuestDesc">
            Investome의 마이페이지에서는
            <br />
            보유 종목 관리, 자산 비중 확인, 포트폴리오 흐름 확인 기능을 사용할 수 있어요.
          </p>

          <div className="mypageGuestFeatureRow">
            <div className="mypageGuestFeature">
              <strong>보유 종목 관리</strong>
              <span>주식·코인 포트폴리오를 한눈에</span>
            </div>

            <div className="mypageGuestFeature">
              <strong>자산 비중 분석</strong>
              <span>원형 차트로 직관적인 확인</span>
            </div>

            <div className="mypageGuestFeature">
              <strong>실시간 반영 UI</strong>
              <span>세련된 흐름으로 자연스럽게</span>
            </div>
          </div>

          <div className="mypageGuestPreviewSection">
            <div className="mypageGuestPreviewTop">
              <div>
                <span className="mypageGuestPreviewEyebrow">PREVIEW</span>
                <h3>로그인하면 이런 화면을 볼 수 있어요</h3>
              </div>
              <span className="mypageGuestPreviewChip">My Portfolio</span>
            </div>

            <MyPagePreview />
          </div>

          <div className="mypageGuestActionRow">
            <Link to="/login" className="mypageGuestLoginBtn">
              로그인하러 가기
            </Link>

            <Link to="/" className="mypageGuestHomeBtn">
              홈으로
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <MyPortfolio />;
}