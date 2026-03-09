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

      <main style={{ padding: "18px 0 40px" }}>
        <div className="container" style={{ display: "grid", gap: 18 }}>
          <section
            className="card"
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "28px 24px",
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "radial-gradient(circle at top left, rgba(14,165,255,0.18), transparent 24%), radial-gradient(circle at top right, rgba(120,80,255,0.18), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-30% auto auto -10%",
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "rgba(14,165,255,0.12)",
                filter: "blur(40px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "auto -6% -18% auto",
                width: 260,
                height: 260,
                borderRadius: "50%",
                background: "rgba(120,80,255,0.14)",
                filter: "blur(46px)",
              }}
            />

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
                  경제 · 증시 · 코인 뉴스를
                  <br />
                  한눈에 보는 뉴스룸
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
                  최신 이슈를 카테고리별로 빠르게 훑고, 클릭 한 번으로 원문 기사까지
                  이어서 볼 수 있게 구성했어.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div
                  style={{
                    minWidth: 120,
                    padding: "14px 16px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="muted" style={{ fontSize: 12 }}>카테고리</div>
                  <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>4개</div>
                </div>

                <div
                  style={{
                    minWidth: 120,
                    padding: "14px 16px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="muted" style={{ fontSize: 12 }}>정렬</div>
                  <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>최신/인기</div>
                </div>

                <Link className="btn" to="/">
                  ← 홈으로
                </Link>
              </div>
            </div>
          </section>

          <NewsList
            title="실시간 뉴스 피드"
            limit={60}
            pageMode
          />
        </div>
      </main>
    </>
  );
}