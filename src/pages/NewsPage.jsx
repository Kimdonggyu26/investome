import { Link } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import NewsList from "../components/NewsList";
import { useTicker } from "../hooks/useTicker";

export default function NewsPage() {
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

      <main style={{ padding: "18px 0 36px" }}>
        <div className="container" style={{ display: "grid", gap: 18 }}>
          <div
            className="card"
            style={{
              padding: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                News Room
              </div>
              <h2 style={{ margin: 0 }}>Investome 뉴스</h2>
            </div>

            <Link className="btn" to="/">
              ← 홈으로
            </Link>
          </div>

          <NewsList
            title="실시간 경제/증시/코인 뉴스"
            limit={60}
            pageMode
          />
        </div>
      </main>
    </>
  );
}