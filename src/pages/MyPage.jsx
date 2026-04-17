import { Link } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import MyPortfolio from "../components/MyPortfolio";
import WatchlistPanel from "../components/WatchlistPanel";
import { useTicker } from "../hooks/useTicker";
import "../styles/MyPage.css";
import { isLoggedIn as getIsLoggedIn } from "../utils/auth";

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
              <span>매수금액</span>
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
          <div className="mypagePreviewFlowHead">
            <div>
              <div className="mypagePreviewMiniEyebrow">PERFORMANCE</div>
              <h4>수익률 추이</h4>
            </div>

            <div className="mypagePreviewRangeTabs">
              <button className="active">1M</button>
              <button>3M</button>
              <button>1Y</button>
              <button>ALL</button>
            </div>
          </div>

          <div className="mypagePreviewFlowValue">+15.07%</div>
          <div className="mypagePreviewFlowSub">최근 한 달 기준 포트폴리오 수익률</div>

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
                points="0,90 8,86 18,84 30,78 42,62 58,52 72,46 85,28 100,22 100,100 0,100"
                fill="url(#mypage-preview-fill)"
              />
              <polyline
                points="0,90 8,86 18,84 30,78 42,62 58,52 72,46 85,28 100,22"
                fill="none"
                stroke="url(#mypage-preview-line)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
                평균단가 ₩73,500 · 현재가 ₩82,300
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

        <div className="mypageGuestIconWrap" aria-hidden="true">
          <div className="mypageGuestIcon">
            <span className="mypageGuestIconHalo" />
            <span className="mypageGuestIconCore" />
          </div>
        </div>

        <h1 className="mypageGuestTitle">로그인 후 이용해주세요</h1>

        <div className="mypageGuestFeatureRow">
          <div className="mypageGuestFeature">
            <strong>보유 종목 관리</strong>
            <span>주식과 코인 포트폴리오를 한눈에 정리할 수 있어요.</span>
          </div>

          <div className="mypageGuestFeature">
            <strong>자산 비중 분석</strong>
            <span>원형 차트로 내 투자 비중을 빠르게 확인할 수 있어요.</span>
          </div>

          <div className="mypageGuestFeature">
            <strong>실시간 반영 UI</strong>
            <span>시장 흐름에 따라 포트폴리오를 더 자연스럽게 볼 수 있어요.</span>
          </div>
        </div>

        <div className="mypageGuestPreviewSection">
          <div className="mypageGuestPreviewTop">
            <div>
              <span className="mypageGuestPreviewEyebrow">PREVIEW</span>
              <h3>마이페이지에서는 이런 화면을 바로 볼 수 있어요</h3>
            </div>
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
  const isLoggedIn = getIsLoggedIn();

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
        {isLoggedIn ? (
          <div className="myPageFloatingShell">
            <aside className="myPageFloatingWatch">
              <WatchlistPanel />
            </aside>

            <MyPortfolio />
          </div>
        ) : (
          <MyPageGuestView />
        )}
      </main>
    </>
  );
}
