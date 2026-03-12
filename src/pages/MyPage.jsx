import { Link } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import MyPortfolio from "../components/MyPortfolio";
import { useTicker } from "../hooks/useTicker";
import "../styles/MyPage.css";

function MyPagePreviewMock() {
  return (
    <div className="mypagePreviewMock">
      <div className="mypagePreviewMockTop">
        <div className="mypagePreviewMockCard hero">
          <div className="mypagePreviewMiniEyebrow">PORTFOLIO OVERVIEW</div>
          <h4>전체 포트폴리오</h4>
          <div className="mypagePreviewTotal">₩32,684,000</div>
          <div className="mypagePreviewProfit">+₩4,281,000 (+15.07%)</div>

          <div className="mypagePreviewSummaryRow">
            <div className="mypagePreviewMiniStat">
              <span>매수원금</span>
              <strong>₩28,403,000</strong>
            </div>
            <div className="mypagePreviewMiniStat">
              <span>평가자산</span>
              <strong>₩32,684,000</strong>
            </div>
            <div className="mypagePreviewMiniStat">
              <span>보유종목</span>
              <strong>3개</strong>
            </div>
          </div>

          <div className="mypagePreviewAccentBar">
            <div className="mypagePreviewAccentFill" />
          </div>
        </div>

        <div className="mypagePreviewMockCard alloc">
          <div className="mypagePreviewMiniEyebrow">ALLOCATION</div>
          <h4>자산 비중</h4>

          <div className="mypagePreviewAllocBody">
            <div className="mypagePreviewRing">
              <div className="mypagePreviewRingInner">
                <span>총 자산</span>
                <strong>₩32.6M</strong>
              </div>
            </div>

            <div className="mypagePreviewLegend">
              <div className="mypagePreviewLegendItem">
                <span className="dot btc" />
                <strong>BTC</strong>
                <em>41.2%</em>
              </div>
              <div className="mypagePreviewLegendItem">
                <span className="dot ss" />
                <strong>005930</strong>
                <em>33.5%</em>
              </div>
              <div className="mypagePreviewLegendItem">
                <span className="dot tsla" />
                <strong>TSLA</strong>
                <em>25.3%</em>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mypagePreviewMockBottom">
        <div className="mypagePreviewMockCard flow">
          <div className="mypagePreviewMiniEyebrow">ASSET FLOW</div>
          <h4>전체 자산 흐름</h4>

          <div className="mypagePreviewFlowBox">
            <svg
              className="mypagePreviewFlowSvg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="mypage-preview-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#37d5ff" />
                  <stop offset="100%" stopColor="#7d52ff" />
                </linearGradient>
                <linearGradient id="mypage-preview-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(55,213,255,0.24)" />
                  <stop offset="100%" stopColor="rgba(55,213,255,0)" />
                </linearGradient>
              </defs>

              <polygon
                points="0,90 8,78 18,74 30,64 42,55 58,60 72,47 85,38 100,22 100,100 0,100"
                fill="url(#mypage-preview-fill)"
              />
              <polyline
                points="0,90 8,78 18,74 30,64 42,55 58,60 72,47 85,38 100,22"
                fill="none"
                stroke="url(#mypage-preview-line)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="mypagePreviewFlowMeta">
            <div>
              <span>1M 수익률</span>
              <strong>+12.8%</strong>
            </div>
            <div>
              <span>보유 종목수</span>
              <strong>3개</strong>
            </div>
          </div>
        </div>

        <div className="mypagePreviewMockCard holdings">
          <div className="mypagePreviewMiniEyebrow">HOLDINGS</div>
          <h4>보유 종목</h4>

          <div className="mypagePreviewHoldingList">
            <div className="mypagePreviewHoldingItem">
              <div className="mypagePreviewHoldingTop">
                <div>
                  <strong>비트코인</strong>
                  <span>BTC · Crypto</span>
                </div>
                <b>₩13,470,000</b>
              </div>
              <div className="mypagePreviewHoldingMeta">
                평균단가 ₩118,000,000 · 현재가 ₩134,700,000
              </div>
              <div className="mypagePreviewHoldingBottom">
                <em className="up">+₩1,670,000 (+14.15%)</em>
                <span>비중 41.2%</span>
              </div>
              <div className="mypagePreviewHoldingBar">
                <div className="fill btc" style={{ width: "41.2%" }} />
              </div>
            </div>

            <div className="mypagePreviewHoldingItem">
              <div className="mypagePreviewHoldingTop">
                <div>
                  <strong>삼성전자</strong>
                  <span>005930 · KOSPI</span>
                </div>
                <b>₩10,950,000</b>
              </div>
              <div className="mypagePreviewHoldingMeta">
                평균단가 ₩63,500 · 현재가 ₩72,300
              </div>
              <div className="mypagePreviewHoldingBottom">
                <em className="up">+₩1,420,000 (+14.90%)</em>
                <span>비중 33.5%</span>
              </div>
              <div className="mypagePreviewHoldingBar">
                <div className="fill ss" style={{ width: "33.5%" }} />
              </div>
            </div>

            <div className="mypagePreviewHoldingItem">
              <div className="mypagePreviewHoldingTop">
                <div>
                  <strong>테슬라</strong>
                  <span>TSLA · NASDAQ</span>
                </div>
                <b>₩8,264,000</b>
              </div>
              <div className="mypagePreviewHoldingMeta">
                평균단가 ₩248,000 · 현재가 ₩286,000
              </div>
              <div className="mypagePreviewHoldingBottom">
                <em className="up">+₩1,191,000 (+16.84%)</em>
                <span>비중 25.3%</span>
              </div>
              <div className="mypagePreviewHoldingBar">
                <div className="fill tsla" style={{ width: "25.3%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyPageGuestView() {
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
            <span className="mypageGuestPreviewChip">Samsung · Bitcoin · Tesla</span>
          </div>

          <div className="mypagePreviewShell">
            <div className="mypagePreviewOverlay">
              <div className="mypagePreviewBadge">LOGIN TO UNLOCK</div>
            </div>

            <div className="mypagePreviewScale">
              <MyPagePreviewMock />
            </div>
          </div>
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

export default function MyPage() {
  const { prices, changes, loading, error } = useTicker();
  const isLoggedIn = localStorage.getItem("investome_logged_in") === "true";

  return (
    <>
      <TopTickerBar
        prices={prices}
        changes={changes}
        loading={loading}
        error={error}
      />
      <Header />

      <main className="myPageMain">
        {isLoggedIn ? <MyPortfolio /> : <MyPageGuestView />}
      </main>
    </>
  );
}