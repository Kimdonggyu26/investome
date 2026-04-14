import { Link } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import NewsList from "../components/NewsList";
import { useTicker } from "../hooks/useTicker";
import "../styles/NewsPage.css";

function signedPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function NewsPage() {
  const { prices, changes, loading, error } = useTicker();

  const marketPulses = [
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
    },
    {
      label: "비트코인",
      value:
        typeof prices?.BTC === "number"
          ? `${Math.round(prices.BTC).toLocaleString("ko-KR")}원`
          : "-",
      change: signedPercent(changes?.BTC),
    },
  ];

  return (
    <>
      <TopTickerBar
        prices={prices}
        changes={changes}
        loading={loading}
        error={error}
      />
      <Header />

      <main className="newsPageMain">
        <div className="container newsPageContainer">
          <section className="newsPageHero card">
            <div className="newsPageHeroTop">
              <div className="newsPageHeroCopy">
                <div className="newsPageBadge">INVESTOME NEWS ROOM</div>
                <h1>지금 시장에서 봐야 할 뉴스만 빠르게</h1>
                <p>
                  카테고리별로 뉴스를 정리하고, 대표 기사와 최신 흐름을 한 번에
                  읽을 수 있게 구성했습니다.
                </p>
              </div>

              <div className="newsPageHeroActions">
                <Link className="btn" to="/">
                  홈으로 가기
                </Link>
              </div>
            </div>

            <div className="newsPagePulseGrid">
              {marketPulses.map((item) => (
                <article key={item.label} className="newsPagePulseCard">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <em className={item.change.startsWith("+") ? "up" : item.change.startsWith("-") ? "down" : ""}>
                    {item.change}
                  </em>
                </article>
              ))}
            </div>
          </section>

          <NewsList title="실시간 뉴스룸" limit={60} pageMode />
        </div>
      </main>
    </>
  );
}
