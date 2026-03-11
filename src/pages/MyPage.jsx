import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import MyPortfolio from "../components/MyPortfolio";
import { useTicker } from "../hooks/useTicker";
import "../styles/MyPage.css";

export default function MyPage() {
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

      <main className="myPage">
        <div className="container myPageContainer">
          <section className="myHero card">
            <div className="myHeroBadge">MY PAGE</div>

            <div className="myHeroTop">
              <div>
                <h1 className="myHeroTitle">내 자산 흐름과 포트폴리오</h1>
                <p className="myHeroDesc">
                  지금은 기본 대시보드 형태로 구성했고, 다음 단계에서는 내가 보유한 종목을
                  직접 추가해서 원형차트, 자산 흐름 그래프, 종목별 비중까지 한눈에 볼 수
                  있도록 확장하면 돼.
                </p>
              </div>

              <div className="myHeroSide">
                <div className="myMiniMetric">
                  <span className="label">상태</span>
                  <strong>Portfolio Beta</strong>
                </div>
                <div className="myMiniMetric">
                  <span className="label">기반</span>
                  <strong>실시간 가격 + 로컬 보유수량</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="myDashboard">
            <MyPortfolio prices={prices} />
          </section>
        </div>
      </main>
    </>
  );
}