import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import WatchlistPanel from "../components/WatchlistPanel";
import MyPortfolio from "../components/MyPortfolio";
import { useTicker } from "../hooks/useTicker";

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
                  MY PAGE
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: 38,
                    lineHeight: 1.15,
                    letterSpacing: "-1px",
                  }}
                >
                  내 관심종목과 포트폴리오
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
                  관심종목과 포트폴리오를 한 페이지에서 확인할 수 있도록 기본 구조를 먼저 잡아뒀어요.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div
              className="container"
              style={{
                width: "100%",
                padding: 0,
                display: "grid",
                gridTemplateColumns: "1.1fr 1.2fr",
                gap: 18,
                alignItems: "start",
              }}
            >
              <WatchlistPanel />
              <MyPortfolio prices={prices} />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}