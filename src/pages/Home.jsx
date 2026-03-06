import { useTicker } from "../hooks/useTicker";
import TopTickerBar from "../components/TopTickerBar";
import Header from "../components/Header";
import Hero from "../components/Hero";
import RankingTable from "../components/RankingTable";
import NewsList from "../components/NewsList";
import CommunityFeed from "../components/CommunityFeed";

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
        {/* 1행: My Portfolio | 환율 모아보기 */}
        <Hero prices={prices} />

        {/* 2행: 시가총액 TOP30 | 커뮤니티 피드 */}
        <section style={{ padding: "0 0 12px" }}>
          <div
            className="container"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            <RankingTable />
            <CommunityFeed />
          </div>
        </section>

        {/* 3행: 글로벌 경제 주요 소식 */}
        <section style={{ padding: "0 0 18px" }}>
          <div className="container">
            <NewsList />
          </div>
        </section>
      </main>

      <footer style={{ padding: "20px 0 40px" }}>
        <div className="container muted" style={{ fontSize: 13 }}>
          © {new Date().getFullYear()} Investome • Market Intelligence
        </div>
      </footer>
    </>
  );
}