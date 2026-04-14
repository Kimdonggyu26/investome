import { Link } from "react-router-dom";
import { useTicker } from "../hooks/useTicker";
import TopTickerBar from "../components/TopTickerBar";
import Header from "../components/Header";
import RankingTable from "../components/RankingTable";
import NewsList from "../components/NewsList";
import CommunityFeed from "../components/CommunityFeed";
import FxRates from "../components/FxRates";
import "../styles/Home.css";

function trendText(change, upLabel, downLabel) {
  if (typeof change !== "number" || Number.isNaN(change)) return "데이터를 불러오는 중입니다.";
  if (change > 0) return upLabel;
  if (change < 0) return downLabel;
  return "전일과 비슷한 흐름을 보이고 있습니다.";
}

function signedPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function Home() {
  const { prices, changes, loading, error } = useTicker();

  const marketBriefs = [
    {
      label: "코스피",
      value:
        typeof prices?.KOSPI === "number"
          ? prices.KOSPI.toLocaleString("ko-KR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "-",
      change: signedPercent(changes?.KOSPI),
      summary: trendText(
        changes?.KOSPI,
        "반도체와 대형주 중심으로 매수 흐름이 이어지고 있습니다.",
        "차익 실현 매물이 나오며 숨 고르기 흐름이 나타나고 있습니다."
      ),
    },
    {
      label: "나스닥",
      value:
        typeof prices?.NASDAQ === "number"
          ? prices.NASDAQ.toLocaleString("ko-KR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "-",
      change: signedPercent(changes?.NASDAQ),
      summary: trendText(
        changes?.NASDAQ,
        "기술주 강세가 이어지며 성장주 심리가 살아나고 있습니다.",
        "대형 기술주 조정으로 변동성이 다소 커진 상태입니다."
      ),
    },
    {
      label: "비트코인",
      value:
        typeof prices?.BTC === "number"
          ? `${Math.round(prices.BTC).toLocaleString("ko-KR")}원`
          : "-",
      change: signedPercent(changes?.BTC),
      summary: trendText(
        changes?.BTC,
        "가상자산 시장 전반의 위험 선호 심리가 살아나고 있습니다.",
        "단기 변동성이 커져 보수적인 접근이 필요한 구간입니다."
      ),
    },
  ];

  const topMover = marketBriefs.reduce((best, item) => {
    const current = Number.parseFloat(item.change);
    const bestValue = Number.parseFloat(best?.change);
    if (!Number.isFinite(current)) return best;
    if (!Number.isFinite(bestValue) || Math.abs(current) > Math.abs(bestValue)) return item;
    return best;
  }, null);

  return (
    <>
      <TopTickerBar
        prices={prices}
        changes={changes}
        loading={loading}
        error={error}
      />
      <Header />

      <main className="homePage">
        <div className="container homeContainer">
          <section className="homeHeroSection">
            <div className="homeHeroPanel">
              <div className="homeHeroBadge">MARKET INTELLIGENCE</div>
              <h1 className="homeHeroTitle">오늘 시장에서 중요한 흐름만 빠르게</h1>
              <p className="homeHeroLead">
                코스피, 나스닥, 가상자산, 환율, 주요 뉴스를 한 화면에 모아
                더 빠르게 투자 판단할 수 있도록 정리했습니다.
              </p>

              <div className="homeHeroActions">
                <Link to="/news" className="homeHeroPrimaryBtn">
                  오늘 시장 보기
                </Link>
                <Link to="/mypage" className="homeHeroGhostBtn">
                  내 포트폴리오 보기
                </Link>
              </div>

              <div className="homeHeroPoints">
                <div className="homeHeroPoint">
                  <span>실시간 흐름</span>
                  <strong>랭킹, 환율, 뉴스까지 한 번에</strong>
                </div>
                <div className="homeHeroPoint">
                  <span>빠른 판단</span>
                  <strong>오늘 움직이는 자산만 먼저 체크</strong>
                </div>
                <div className="homeHeroPoint">
                  <span>투자 관리</span>
                  <strong>내 포트폴리오 상태를 한눈에 점검</strong>
                </div>
              </div>
            </div>

            <div className="homeBriefPanel">
              <div className="homeSectionEyebrow">TODAY SNAPSHOT</div>
              <h2 className="homeSectionTitle">오늘 시장 한눈에 보기</h2>
              <p className="homeSectionLead">
                장중 흐름을 빠르게 훑고, 어떤 시장부터 볼지 바로 정할 수 있게
                정리한 브리핑입니다.
              </p>

              <div className="homeBriefList">
                {marketBriefs.map((item) => (
                  <article key={item.label} className="homeBriefCard">
                    <div className="homeBriefTop">
                      <span>{item.label}</span>
                      <strong>{item.change}</strong>
                    </div>
                    <div className="homeBriefValue">{item.value}</div>
                    <p>{item.summary}</p>
                  </article>
                ))}
              </div>

              <div className="homeBriefFocus">
                <span>오늘 가장 크게 움직인 자산</span>
                <strong>
                  {topMover ? `${topMover.label} ${topMover.change}` : "데이터를 확인하는 중입니다."}
                </strong>
              </div>
            </div>
          </section>

          <section className="homeSignalSection">
            <article className="homeSignalCard">
              <div className="homeSignalLabel">지금 많이 보는 자산</div>
              <strong>실시간 랭킹으로 시장 관심도를 빠르게 확인</strong>
              <p>가격 변화와 시가총액 흐름을 함께 보면서 먼저 볼 자산을 고를 수 있습니다.</p>
            </article>

            <article className="homeSignalCard">
              <div className="homeSignalLabel">지금 체크할 이슈</div>
              <strong>환율과 뉴스를 같이 보면 시장 맥락이 더 선명해집니다</strong>
              <p>가격만 보지 않고 거시 흐름과 헤드라인까지 함께 확인할 수 있습니다.</p>
            </article>

            <article className="homeSignalCard portfolio">
              <div className="homeSignalLabel">포트폴리오 미리보기</div>
              <strong>보유 자산, 수익률, 비중을 한 번에 점검하는 화면으로 이어집니다</strong>
              <p>평가금액, 손익, 집중도, 목표 자산까지 한눈에 보는 투자 관리 경험을 준비했습니다.</p>
            </article>
          </section>

          <section className="homeTopSection">
            <div className="homeTopGrid">
              <RankingTable />
              <FxRates />
            </div>
          </section>

          <section className="homeBottomSection">
            <div className="homeBottomGrid">
              <div className="homeNewsSection">
                <NewsList limit={6} moreLink="/news" />
              </div>

              <div className="homePortfolioPreview card">
                <div className="homeSectionEyebrow">PORTFOLIO PREVIEW</div>
                <h2 className="homeSectionTitle">포트폴리오는 이렇게 더 좋아질 수 있어요</h2>
                <p className="homeSectionLead">
                  단순 보유 종목 목록이 아니라, 지금 내 투자 상태를 진단하는 화면으로
                  발전시키는 방향입니다.
                </p>

                <div className="homePortfolioStats">
                  <div className="homePortfolioStat">
                    <span>총 평가금액</span>
                    <strong>내 자산 규모를 바로 확인</strong>
                  </div>
                  <div className="homePortfolioStat">
                    <span>총 손익 / 수익률</span>
                    <strong>성과를 숫자로 빠르게 파악</strong>
                  </div>
                  <div className="homePortfolioStat">
                    <span>자산 비중 / 집중도</span>
                    <strong>한 종목 쏠림 여부를 즉시 점검</strong>
                  </div>
                </div>

                <div className="homePortfolioInsight">
                  <div className="homePortfolioInsightHeader">
                    <span>예상 화면 톤</span>
                    <strong>내 투자 상태 진단형 대시보드</strong>
                  </div>

                  <ul className="homePortfolioList">
                    <li>가장 비중이 큰 자산과 가장 수익률이 좋은 자산을 바로 보여주기</li>
                    <li>국내, 해외, 가상자산 분산 상태를 짧은 문장으로 설명해주기</li>
                    <li>목표 금액까지 얼마나 남았는지와 예상 수익 계산을 함께 배치하기</li>
                  </ul>
                </div>

                <Link to="/mypage" className="homePortfolioLink">
                  마이페이지에서 보기
                </Link>
              </div>
            </div>
          </section>
        </div>

        <aside className="homeRightFloat">
          <CommunityFeed />
        </aside>
      </main>

      <footer className="homeFooter">
        <div className="container homeFooterInner">
          {new Date().getFullYear()} Investome · Market Intelligence
        </div>
      </footer>
    </>
  );
}
