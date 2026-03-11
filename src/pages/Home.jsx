import { Link } from "react-router-dom";
import { useTicker } from "../hooks/useTicker";
import TopTickerBar from "../components/TopTickerBar";
import Header from "../components/Header";
import RankingTable from "../components/RankingTable";
import NewsList from "../components/NewsList";
import CommunityFeed from "../components/CommunityFeed";
import FxRates from "../components/FxRates";
import "../styles/Home.css";

export default function Home() {
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

      <main className="homePage">
        <div className="container homeContainer">
          <section className="homeTopSection">
            <div className="homeTopGrid">
              <RankingTable />
              <FxRates />
            </div>
          </section>

          <section className="homeNewsSection">
            <div className="homeNewsSectionHeader">
              <div>
                <div className="homeNewsEyebrow">REALTIME NEWS</div>
                <h2 className="homeNewsTitle">글로벌 경제 주요 소식</h2>
                <p className="homeNewsDesc">
                  홈에서는 핵심 뉴스만 먼저 보여주고, 실시간 뉴스 페이지에서 더 많이 확인할 수 있어.
                </p>
              </div>

              <Link to="/news" className="homeNewsMoreBtn">
                실시간 뉴스 더보기
              </Link>
            </div>

            <NewsList limit={6} />
          </section>
        </div>

        <aside className="homeRightFloat">
          <CommunityFeed />
        </aside>
      </main>

      <footer style={{ padding: "20px 0 40px" }}>
        <div className="container muted" style={{ fontSize: 13 }}>
          © {new Date().getFullYear()} Investome • Market Intelligence
        </div>
      </footer>
    </>
  );
}