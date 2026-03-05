import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";

function makeMockSeries() {
  // 간단한 랜덤 시계열(차트용) - 새로고침마다 조금 달라짐
  const n = 40;
  let v = 100;
  const out = [];
  for (let i = 0; i < n; i++) {
    v = v + (Math.random() - 0.5) * 6;
    out.push(Math.max(60, Math.min(140, v)));
  }
  return out;
}

function SparkLine({ data }) {
  const w = 520;
  const h = 160;
  const pad = 12;

  const min = Math.min(...data);
  const max = Math.max(...data);

  const pts = data.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1);
    const t = (v - min) / (max - min || 1);
    const y = pad + (1 - t) * (h - pad * 2);
    return [x, y];
  });

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Mock chart (나중에 실데이터로 교체)
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={d} fill="none" stroke="rgba(54,213,255,.9)" strokeWidth="2.2" />
      </svg>
    </div>
  );
}

export default function AssetDetail() {
  const { market, symbol } = useParams(); // market: KOSPI/NASDAQ/CRYPTO, symbol: BTC/AAPL/005930 등
  const { prices, changes, loading, error } = useTicker();

  const series = useMemo(() => makeMockSeries(), [market, symbol]);

  const price = prices?.[symbol]; // CRYPTO(BTC/ETH/XRP)만 현재 연결돼있음
  const change = changes?.[symbol];

  const hasPrice = typeof price === "number";
  const hasChange = typeof change === "number";

  return (
    <>
      <TopTickerBar prices={prices} changes={changes} loading={loading} error={error} />
      <Header />

      <main style={{ padding: "18px 0 42px" }}>
        <div className="container" style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>
                {market} • <span style={{ fontWeight: 800, color: "rgba(255,255,255,.85)" }}>{symbol}</span>
              </div>
              <h2 style={{ margin: "6px 0 0" }}>Asset Detail</h2>
            </div>

            <Link className="btn" to="/">
              ← 홈으로
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            <SparkLine data={series} />

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>
                현재 정보
              </div>

              <div className="muted" style={{ fontSize: 13 }}>Price</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
                {hasPrice ? `₩${Math.round(price).toLocaleString("ko-KR")}` : "불러오는중 / 미지원"}
              </div>

              <div style={{ marginTop: 8 }}>
                <span className="muted" style={{ fontSize: 13 }}>Change</span>
                <div
                  style={{
                    marginTop: 6,
                    fontWeight: 900,
                    color: hasChange
                      ? change >= 0
                        ? "rgba(54,213,255,.95)"
                        : "rgba(255,120,170,.95)"
                      : "rgba(255,255,255,.6)",
                  }}
                >
                  {hasChange ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "불러오는중 / 미지원"}
                </div>
              </div>

              <hr className="hr" />

              <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                • 지금은 구조 먼저 잡는 단계라 차트/데이터는 mock이야.<br />
                • 다음 단계에서 KOSPI/NASDAQ/환율/뉴스 API를 붙이면 진짜로 바뀜.
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}