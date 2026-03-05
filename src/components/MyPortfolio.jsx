// src/components/MyPortfolio.jsx
import { portfolio } from "../data/portfolio";

function formatKRW(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

export default function MyPortfolio({ prices }) {
  let totalValue = 0;
  let totalCost = 0;

  const items = portfolio.map((coin) => {
    const currentPrice = typeof prices?.[coin.symbol] === "number" ? prices[coin.symbol] : null;

    const value = currentPrice === null ? 0 : coin.amount * currentPrice;
    const cost = coin.amount * coin.avgPrice;

    totalValue += value;
    totalCost += cost;

    return {
      ...coin,
      currentPrice,
      value,
      pnl: value - cost,
      rate: cost ? ((value - cost) / cost) * 100 : 0,
    };
  });

  const totalPnl = totalValue - totalCost;
  const totalRate = totalCost ? (totalPnl / totalCost) * 100 : 0;

  const pnlColor =
    totalPnl >= 0 ? "rgba(54,213,255,.95)" : "rgba(255,120,170,.95)";

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>My Portfolio</h3>
        <span className="muted" style={{ fontSize: 12 }}>local data</span>
      </div>

      <hr className="hr" />

      <div style={{ marginBottom: 14 }}>
        <div className="muted" style={{ fontSize: 13 }}>Total Assets</div>
        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>
          {formatKRW(totalValue)}
        </div>

        <div style={{ marginTop: 6, color: pnlColor, fontWeight: 800 }}>
          {totalPnl >= 0 ? "+" : ""}
          {formatKRW(totalPnl).replace("₩-", "-₩")}{" "}
          <span style={{ fontWeight: 700, opacity: 0.9 }}>
            ({totalRate.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => {
          const itemPnlColor =
            item.pnl >= 0 ? "rgba(54,213,255,.95)" : "rgba(255,120,170,.95)";

          return (
            <div
              key={item.symbol}
              className="card"
              style={{
                padding: 12,
                background: "rgba(255,255,255,.02)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>{item.symbol}</div>
                <div style={{ fontWeight: 800 }}>{formatKRW(item.value)}</div>
              </div>

              <div className="muted" style={{ fontSize: 12, marginTop: 6, display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span>
                  Avg {formatKRW(item.avgPrice)} · Now{" "}
                  {item.currentPrice === null ? "불러오는중" : formatKRW(item.currentPrice)}
                </span>
                <span style={{ color: itemPnlColor, fontWeight: 800 }}>
                  {item.pnl >= 0 ? "+" : ""}
                  {formatKRW(item.pnl).replace("₩-", "-₩")} ({item.rate.toFixed(2)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="btn" style={{ width: "100%", justifyContent: "center" }}>
          종목 추가 (다음 단계)
        </button>
      </div>
    </div>
  );
}