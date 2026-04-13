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

      <main style={{ padding: "18px 0 40px", background: "var(--bg)" }}>
        <div className="container" style={{ display: "grid", gap: 18 }}>
          <section
            className="card"
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "28px 24px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 30,
                    padding: "0 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#dff6ff",
                    background: "rgba(14,165,255,0.16)",
                    border: "1px solid rgba(14,165,255,0.28)",
                    marginBottom: 14,
                  }}
                >
                  INVESTOME NEWS ROOM
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: 38,
                    lineHeight: 1.15,
                    letterSpacing: "-1px",
                  }}
                >
                  Economy, stocks, crypto, and macro headlines
                </h1>

                <p
                  style={{
                    margin: "14px 0 0",
                    color: "rgba(255,255,255,0.66)",
                    fontSize: 15,
                    lineHeight: 1.7,
                    maxWidth: 760,
                  }}
                >
                  Browse the latest market news by category and open full articles in one click.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn" to="/">
                  Back to home
                </Link>
              </div>
            </div>
          </section>

          <NewsList title="Live News Feed" limit={60} pageMode />
        </div>
      </main>
    </>
  );
}
