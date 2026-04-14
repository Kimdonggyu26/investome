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
            <NewsList limit={6} moreLink="/news" />
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