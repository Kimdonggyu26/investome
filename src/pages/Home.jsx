// src/pages/Home.jsx
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
        {/* ✅ Hero가 prices를 받아서 MyPortfolio를 내부에서 렌더 */}
        <Hero prices={prices} />

        {/* ✅ Hero 아래: 랭킹 + (원래 환율 자리로) 뉴스 */}
        <section style={{ padding: "0px 0 18px", marginTop: -10 }}>
          <div
            className="container"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 18 }}>
              <RankingTable />
              <NewsList />
            </div>

            {/* 오른쪽 컬럼은 일단 비워둠 (나중에 커뮤니티 위젯/인기글/미니티커 넣기 좋음) */}
            <div style={{ position: "sticky", top: 120 }}>
              {/* 추후 위젯 자리 */}
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