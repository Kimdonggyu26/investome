import { portfolio } from "../data/portfolio";

function formatKRW(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

function makeFlowPoints(totalCost, totalValue) {
  const start = totalCost * 0.84;
  const end = totalValue || totalCost;
  const mid = (start + end) / 2;

  return [
    start,
    start * 1.03,
    start * 0.98,
    mid * 0.94,
    mid,
    mid * 1.06,
    mid * 1.02,
    end * 0.96,
    end,
  ];
}

function buildLinePath(points, width = 100, height = 100) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const gap = max - min || 1;

  return points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / gap) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function MyPortfolio({ prices }) {
  let totalValue = 0;
  let totalCost = 0;

  const items = portfolio.map((coin) => {
    const currentPrice =
      typeof prices?.[coin.symbol] === "number" ? prices[coin.symbol] : null;

    const value = currentPrice === null ? 0 : coin.amount * currentPrice;
    const cost = coin.amount * coin.avgPrice;

    totalValue += value;
    totalCost += cost;

    return {
      ...coin,
      currentPrice,
      value,
      cost,
      pnl: value - cost,
      rate: cost ? ((value - cost) / cost) * 100 : 0,
    };
  });

  const totalPnl = totalValue - totalCost;
  const totalRate = totalCost ? (totalPnl / totalCost) * 100 : 0;

  const pnlColor =
    totalPnl >= 0 ? "rgba(54,213,255,.95)" : "rgba(255,120,170,.95)";

  const totalAssetsForRatio = items.reduce((sum, item) => sum + item.value, 0) || 1;

  const gradientStops = [];
  let currentDeg = 0;

  items.forEach((item, idx) => {
    const ratio = item.value / totalAssetsForRatio;
    const nextDeg = currentDeg + ratio * 360;

    const colors = [
      ["#36d5ff", "#4c7dff"],
      ["#65f3b1", "#18c58f"],
      ["#8f7bff", "#5b7cff"],
      ["#ff9bc2", "#ff6e9e"],
      ["#ffd36b", "#ff9f43"],
    ];

    const pair = colors[idx % colors.length];
    gradientStops.push(`${pair[0]} ${currentDeg}deg ${nextDeg - 2}deg`);
    gradientStops.push(`${pair[1]} ${Math.max(currentDeg + 2, currentDeg)}deg ${nextDeg}deg`);
    currentDeg = nextDeg;
  });

  const ringStyle = {
    background: `conic-gradient(${gradientStops.join(", ")})`,
  };

  const flowPoints = makeFlowPoints(totalCost, totalValue);
  const flowPath = buildLinePath(flowPoints, 100, 100);

  return (
    <section className="portfolioDashboard">
      <div className="portfolioTopGrid">
        <div className="portfolioHeroCard card">
          <div className="portfolioHeroHead">
            <div>
              <div className="portfolioEyebrow">PORTFOLIO OVERVIEW</div>
              <h3 className="portfolioTitle">전체 포트폴리오</h3>
            </div>
            <div className="portfolioLiveBadge">LIVE</div>
          </div>

          <div className="portfolioTotalValue">{formatKRW(totalValue)}</div>

          <div className="portfolioPnl" style={{ color: pnlColor }}>
            {totalPnl >= 0 ? "+" : ""}
            {formatKRW(totalPnl).replace("₩-", "-₩")}
            <span className="portfolioPnlRate"> ({totalRate.toFixed(2)}%)</span>
          </div>

          <div className="portfolioStatsGrid">
            <div className="portfolioStatCard">
              <span className="label">매수원금</span>
              <strong>{formatKRW(totalCost)}</strong>
            </div>
            <div className="portfolioStatCard">
              <span className="label">평가자산</span>
              <strong>{formatKRW(totalValue)}</strong>
            </div>
            <div className="portfolioStatCard">
              <span className="label">보유종목</span>
              <strong>{items.length}개</strong>
            </div>
          </div>
        </div>

        <div className="portfolioAllocationCard card">
          <div className="portfolioCardHead">
            <div>
              <div className="portfolioEyebrow">ALLOCATION</div>
              <h3 className="portfolioTitleSm">자산 비중</h3>
            </div>
          </div>

          <div className="portfolioAllocationBody">
            <div className="portfolioRing" style={ringStyle}>
              <div className="portfolioRingInner">
                <span>총 자산</span>
                <strong>{formatKRW(totalValue)}</strong>
              </div>
            </div>

            <div className="portfolioLegend">
              {items.map((item, idx) => {
                const ratio = ((item.value / totalAssetsForRatio) * 100 || 0).toFixed(1);
                return (
                  <div className="portfolioLegendItem" key={item.symbol}>
                    <div className={`portfolioLegendDot tone${idx % 5}`} />
                    <div className="portfolioLegendText">
                      <strong>{item.symbol}</strong>
                      <span>{ratio}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="portfolioBottomGrid">
        <div className="portfolioFlowCard card">
          <div className="portfolioCardHead">
            <div>
              <div className="portfolioEyebrow">ASSET FLOW</div>
              <h3 className="portfolioTitleSm">전체 자산 흐름</h3>
            </div>
            <div className="portfolioGhostTag">Preview</div>
          </div>

          <div className="portfolioFlowBox">
            <svg
              className="portfolioFlowSvg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="portfolio-flow-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#36d5ff" />
                  <stop offset="100%" stopColor="#7c4dff" />
                </linearGradient>
                <linearGradient id="portfolio-flow-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(54,213,255,0.28)" />
                  <stop offset="100%" stopColor="rgba(54,213,255,0)" />
                </linearGradient>
              </defs>

              <polyline
                points={`0,100 ${flowPath} 100,100`}
                fill="url(#portfolio-flow-fill)"
                className="portfolioFlowArea"
              />
              <polyline
                points={flowPath}
                fill="none"
                stroke="url(#portfolio-flow-line)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="portfolioFlowLine"
              />
            </svg>
          </div>

          <div className="portfolioFlowMeta">
            <div>
              <span className="label">시작 추정값</span>
              <strong>{formatKRW(flowPoints[0])}</strong>
            </div>
            <div>
              <span className="label">현재 추정값</span>
              <strong>{formatKRW(flowPoints[flowPoints.length - 1])}</strong>
            </div>
          </div>
        </div>

        <div className="portfolioHoldingsCard card">
          <div className="portfolioCardHead">
            <div>
              <div className="portfolioEyebrow">HOLDINGS</div>
              <h3 className="portfolioTitleSm">보유 종목</h3>
            </div>
            <button className="btn">종목 추가 (다음 단계)</button>
          </div>

          <div className="portfolioHoldingList">
            {items.map((item, idx) => {
              const itemPnlColor =
                item.pnl >= 0 ? "rgba(54,213,255,.95)" : "rgba(255,120,170,.95)";
              const weight = ((item.value / totalAssetsForRatio) * 100 || 0).toFixed(1);

              return (
                <div key={item.symbol} className="portfolioHoldingItem">
                  <div className="portfolioHoldingTop">
                    <div className="portfolioHoldingIdentity">
                      <div className={`portfolioCoinBadge tone${idx % 5}`}>
                        {item.symbol.slice(0, 1)}
                      </div>
                      <div>
                        <div className="portfolioHoldingName">{item.symbol}</div>
                        <div className="portfolioHoldingSub">
                          {item.name} · 비중 {weight}%
                        </div>
                      </div>
                    </div>

                    <div className="portfolioHoldingValue">
                      {formatKRW(item.value)}
                    </div>
                  </div>

                  <div className="portfolioHoldingMetaRow">
                    <span>
                      평균단가 {formatKRW(item.avgPrice)} · 현재가{" "}
                      {item.currentPrice === null ? "불러오는중" : formatKRW(item.currentPrice)}
                    </span>
                    <span style={{ color: itemPnlColor, fontWeight: 800 }}>
                      {item.pnl >= 0 ? "+" : ""}
                      {formatKRW(item.pnl).replace("₩-", "-₩")} ({item.rate.toFixed(2)}%)
                    </span>
                  </div>

                  <div className="portfolioHoldingBar">
                    <div
                      className={`portfolioHoldingFill tone${idx % 5}`}
                      style={{ width: `${Math.max(8, Number(weight))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}