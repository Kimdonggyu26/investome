import { useMemo, useState } from "react";
import Header from "../components/Header";
import "../styles/MyPage.css";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";

const HOLDINGS = [
  {
    id: 1,
    symbol: "005930",
    name: "삼성전자보통주",
    market: "KOSPI",
    quantity: 50,
    avgPrice: 120000,
    currentPrice: 189700,
    todayChangeRate: -2.17,
    color: "#38bdf8",
  },
  {
    id: 2,
    symbol: "005990",
    name: "매일홀딩스",
    market: "KOSDAQ",
    quantity: 150,
    avgPrice: 50000,
    currentPrice: 11250,
    todayChangeRate: 0.09,
    color: "#5eead4",
  },
];

const WATCHLIST = [
  { symbol: "BTC", name: "Bitcoin", market: "CRYPTO", price: 123224000, change: 2.55 },
  { symbol: "SOL", name: "Solana", market: "CRYPTO", price: 242100, change: 4.18 },
  { symbol: "ETH", name: "Ethereum", market: "CRYPTO", price: 3224115, change: 3.87 },
  { symbol: "SK하이닉스", name: "SK하이닉스", market: "KOSPI", price: 218500, change: -0.92 },
];

const TREND_7D = [
  { label: "03/18", value: 12420000 },
  { label: "03/19", value: 12280000 },
  { label: "03/20", value: 12160000 },
  { label: "03/21", value: 11890000 },
  { label: "03/22", value: 11670000 },
  { label: "03/23", value: 11390000 },
  { label: "03/24", value: 11172500 },
];

const TREND_30D = [
  { label: "1W", value: 13100000 },
  { label: "2W", value: 12750000 },
  { label: "3W", value: 12300000 },
  { label: "4W", value: 11880000 },
  { label: "Now", value: 11172500 },
];

const COLORS = ["#38bdf8", "#5eead4", "#8b5cf6", "#f59e0b", "#f43f5e"];

function formatPrice(value) {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatSignedPrice(value) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}₩${Math.abs(Math.round(value)).toLocaleString("ko-KR")}`;
}

function formatSignedPercent(value) {
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="mypageTooltip">
      <div className="mypageTooltipLabel">{label}</div>
      <div className="mypageTooltipValue">{formatPrice(payload[0].value)}</div>
    </div>
  );
}

export default function MyPage() {
  const [period, setPeriod] = useState("7D");

  const trendData = period === "30D" ? TREND_30D : TREND_7D;

  const {
    totalInvested,
    totalCurrentValue,
    totalPnL,
    totalReturnRate,
    allocationData,
    gainers,
    losers,
    flatCount,
    bestPerformer,
  } = useMemo(() => {
    const mapped = HOLDINGS.map((item) => {
      const invested = item.quantity * item.avgPrice;
      const current = item.quantity * item.currentPrice;
      const pnl = current - invested;
      const rate = invested > 0 ? (pnl / invested) * 100 : 0;

      return {
        ...item,
        invested,
        current,
        pnl,
        rate,
      };
    });

    const investedSum = mapped.reduce((sum, item) => sum + item.invested, 0);
    const currentSum = mapped.reduce((sum, item) => sum + item.current, 0);
    const pnlSum = currentSum - investedSum;
    const returnRate = investedSum > 0 ? (pnlSum / investedSum) * 100 : 0;

    const allocation = mapped.map((item, idx) => ({
      name: item.name,
      symbol: item.symbol,
      value: item.current,
      ratio: currentSum > 0 ? (item.current / currentSum) * 100 : 0,
      color: item.color || COLORS[idx % COLORS.length],
    }));

    const gainers = mapped.filter((item) => item.todayChangeRate > 0).length;
    const losers = mapped.filter((item) => item.todayChangeRate < 0).length;
    const flatCount = mapped.filter((item) => item.todayChangeRate === 0).length;

    const bestPerformer = [...mapped].sort(
      (a, b) => b.todayChangeRate - a.todayChangeRate
    )[0];

    return {
      totalInvested: investedSum,
      totalCurrentValue: currentSum,
      totalPnL: pnlSum,
      totalReturnRate: returnRate,
      allocationData: allocation,
      gainers,
      losers,
      flatCount,
      bestPerformer,
    };
  }, []);

  const todayPnL = useMemo(() => {
    const sum = HOLDINGS.reduce((acc, item) => {
      const prevPrice =
        item.currentPrice / (1 + (item.todayChangeRate || 0) / 100);
      return acc + (item.currentPrice - prevPrice) * item.quantity;
    }, 0);

    return sum;
  }, []);

  return (
    <>
      <Header />

      <main className="mypageShell">
        <section className="mypageHero">
          <div className="mypageHeroLeft">
            <div className="mypageEyebrow">PORTFOLIO INTELLIGENCE</div>
            <h1 className="mypageTitle">내 자산 대시보드</h1>
            <p className="mypageSubtitle">
              오늘의 손익, 자산 비중, 보유 종목 흐름을 한 화면에서 빠르게 확인해보세요.
            </p>
          </div>

          <div className="mypageHeroBadge">
            <span className="mypageLiveDot" />
            LIVE SNAPSHOT
          </div>
        </section>

        <section className="mypageGrid">
          <aside className="mypageCard mypageWatchlistCard">
            <div className="mypageCardHeader">
              <div>
                <div className="mypageCardEyebrow">MY WATCHLIST</div>
                <h2 className="mypageCardTitle">나의 관심종목</h2>
              </div>
            </div>

            <div className="mypageWatchlist">
              {WATCHLIST.map((item) => (
                <div key={item.symbol} className="mypageWatchItem">
                  <div className="mypageWatchIcon">
                    {item.symbol.slice(0, 1)}
                  </div>

                  <div className="mypageWatchInfo">
                    <strong>{item.name}</strong>
                    <span>
                      {item.symbol} · {item.market}
                    </span>
                  </div>

                  <div className="mypageWatchMeta">
                    <strong>{formatPrice(item.price)}</strong>
                    <span className={item.change >= 0 ? "up" : "down"}>
                      {formatSignedPercent(item.change)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="mypageMain">
            <div className="mypageTopRow">
              <article className="mypageCard mypageOverviewCard">
                <div className="mypageCardHeader">
                  <div>
                    <div className="mypageCardEyebrow">PORTFOLIO OVERVIEW</div>
                    <h2 className="mypageCardTitle">전체 포트폴리오</h2>
                  </div>
                  <div className="mypageLiveBadge">
                    <span className="mypageLiveDot" />
                    LIVE
                  </div>
                </div>

                <div className="mypageOverviewValue">
                  {formatPrice(totalCurrentValue)}
                </div>

                <div
                  className={`mypageOverviewPnL ${
                    totalPnL >= 0 ? "up" : "down"
                  }`}
                >
                  <span className="mypageTrendArrow">
                    {totalPnL >= 0 ? "▲" : "▼"}
                  </span>
                  {formatSignedPrice(totalPnL)} ({formatSignedPercent(totalReturnRate)})
                </div>

                <div className="mypageOverviewStats">
                  <div className="mypageMiniStat">
                    <span>매수원금</span>
                    <strong>{formatPrice(totalInvested)}</strong>
                  </div>
                  <div className="mypageMiniStat">
                    <span>평가자산</span>
                    <strong>{formatPrice(totalCurrentValue)}</strong>
                  </div>
                  <div className="mypageMiniStat">
                    <span>보유종목</span>
                    <strong>{HOLDINGS.length}개</strong>
                  </div>
                </div>

                <div className="mypageProgressTrack">
                  <div
                    className="mypageProgressFill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(18, (totalCurrentValue / totalInvested) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </article>

              <article className="mypageCard mypageAllocationCard">
                <div className="mypageCardHeader">
                  <div>
                    <div className="mypageCardEyebrow">ALLOCATION</div>
                    <h2 className="mypageCardTitle">자산 비중</h2>
                  </div>
                </div>

                <div className="mypageAllocationInner">
                  <div className="mypageDonutWrap">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={allocationData}
                          dataKey="value"
                          innerRadius={66}
                          outerRadius={92}
                          stroke="none"
                          paddingAngle={2}
                        >
                          {allocationData.map((entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={entry.color || COLORS[idx % COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="mypageDonutCenter">
                      <span>총 자산</span>
                      <strong>{formatPrice(totalCurrentValue)}</strong>
                    </div>
                  </div>

                  <div className="mypageAllocationLegend">
                    {allocationData.map((item) => (
                      <div key={item.symbol} className="mypageLegendItem">
                        <div className="mypageLegendLeft">
                          <span
                            className="mypageLegendDot"
                            style={{ background: item.color }}
                          />
                          <div>
                            <strong>{item.name}</strong>
                            <span>{item.symbol}</span>
                          </div>
                        </div>
                        <strong>{item.ratio.toFixed(1)}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>

            <div className="mypageBottomRow">
              <article className="mypageCard mypageTrendCard">
                <div className="mypageCardHeader">
                  <div>
                    <div className="mypageCardEyebrow">ASSET FLOW</div>
                    <h2 className="mypageCardTitle">자산 흐름</h2>
                  </div>

                  <div className="mypagePeriodTabs">
                    {["7D", "30D"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`mypagePeriodBtn ${period === item ? "active" : ""}`}
                        onClick={() => setPeriod(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mypageTodayPnLWrap">
                  <strong className={todayPnL >= 0 ? "up" : "down"}>
                    {formatSignedPrice(todayPnL)}
                  </strong>
                  <span>today movement</span>
                </div>

                <div className="mypageChartWrap">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="assetFlowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#7f8aa3", fontSize: 12 }}
                      />

                      <Tooltip content={<CustomTooltip />} />

                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#38bdf8"
                        strokeWidth={3}
                        fill="url(#assetFlowGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mypageMarketSummary">
                  <div className="mypageMiniStatus">
                    <span>상승</span>
                    <strong>{gainers}개</strong>
                  </div>
                  <div className="mypageMiniStatus">
                    <span>하락</span>
                    <strong>{losers}개</strong>
                  </div>
                  <div className="mypageMiniStatus">
                    <span>보합</span>
                    <strong>{flatCount}개</strong>
                  </div>
                </div>

                {bestPerformer ? (
                  <div className="mypageTopMover">
                    <div>
                      <span className="mypageTopMoverLabel">TOP MOVER</span>
                      <strong>{bestPerformer.name}</strong>
                    </div>
                    <strong className={bestPerformer.todayChangeRate >= 0 ? "up" : "down"}>
                      {formatSignedPercent(bestPerformer.todayChangeRate)}
                    </strong>
                  </div>
                ) : null}
              </article>

              <article className="mypageCard mypageHoldingsCard">
                <div className="mypageCardHeader">
                  <div>
                    <div className="mypageCardEyebrow">HOLDINGS</div>
                    <h2 className="mypageCardTitle">보유 종목</h2>
                  </div>

                  <button type="button" className="mypageAddBtn">
                    + 종목 추가
                  </button>
                </div>

                <div className="mypageHoldingList">
                  {HOLDINGS.map((item) => {
                    const invested = item.quantity * item.avgPrice;
                    const current = item.quantity * item.currentPrice;
                    const pnl = current - invested;
                    const rate = invested > 0 ? (pnl / invested) * 100 : 0;
                    const ratio =
                      totalCurrentValue > 0 ? (current / totalCurrentValue) * 100 : 0;

                    return (
                      <div key={item.id} className="mypageHoldingItem">
                        <div className="mypageHoldingTop">
                          <div className="mypageHoldingIdentity">
                            <div
                              className="mypageHoldingIcon"
                              style={{
                                background: `linear-gradient(135deg, ${item.color}, rgba(255,255,255,0.08))`,
                              }}
                            >
                              {item.name.slice(0, 1)}
                            </div>

                            <div>
                              <strong>{item.name}</strong>
                              <span>
                                {item.symbol} · {item.market}
                              </span>
                            </div>
                          </div>

                          <div className="mypageHoldingValue">
                            <strong>{formatPrice(current)}</strong>
                            <span className={pnl >= 0 ? "up" : "down"}>
                              {formatSignedPrice(pnl)} ({formatSignedPercent(rate)})
                            </span>
                          </div>
                        </div>

                        <div className="mypageHoldingMeta">
                          <span>수량 {item.quantity.toLocaleString("ko-KR")}주</span>
                          <span>평균단가 {formatPrice(item.avgPrice)}</span>
                          <span>현재가 {formatPrice(item.currentPrice)}</span>
                        </div>

                        <div className="mypageHoldingBadges">
                          <span className="badge blue">{item.market}</span>
                          <span className="badge dark">비중 {ratio.toFixed(1)}%</span>
                          <span className={`badge ${item.todayChangeRate >= 0 ? "green" : "red"}`}>
                            오늘 {formatSignedPercent(item.todayChangeRate)}
                          </span>
                        </div>

                        <div className="mypageHoldingBar">
                          <div
                            className="mypageHoldingBarFill"
                            style={{
                              width: `${Math.min(100, Math.max(8, ratio))}%`,
                              background: `linear-gradient(90deg, ${item.color}, rgba(255,255,255,0.15))`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}