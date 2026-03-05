// src/pages/Home.jsx
import { useTicker } from "../hooks/useTicker";
import TopTickerBar from "../components/TopTickerBar";
import Header from "../components/Header";
import Hero from "../components/Hero";
import RankingTable from "../components/RankingTable";
import NewsList from "../components/NewsList";
import CommunityFeed from "../components/CommunityFeed";
import MyPortfolio from "../components/MyPortfolio";
import FxRates from "../components/FxRates";

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

      <main>
        <Hero />

        {/* ✅ Hero 아래 2열 레이아웃(정석) */}
        <section style={{ padding: "10px 0 18px" }}>
          <div
            className="container"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 18 }}>
              <RankingTable />
              <FxRates />
              <NewsList />
            </div>

            <div style={{ position: "sticky", top: 120 }}>
              <MyPortfolio prices={prices} />
            </div>
          </div>
        </section>

        <CommunityFeed />
      </main>

      <footer style={{ padding: "20px 0 40px" }}>
        <div className="container muted" style={{ fontSize: 13 }}>
          © {new Date().getFullYear()} Investome • Market Intelligence
        </div>
      </footer>
    </>
  );
}