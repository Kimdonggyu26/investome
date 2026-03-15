import { useEffect, useMemo, useState } from "react";
import { portfolio as defaultPortfolio } from "../data/portfolio";
import { SEARCH_ASSETS } from "../data/searchAssets";
import {
  fetchAssetQuote,
  fetchPortfolioQuotes,
  searchAssetCatalog,
} from "../api/portfolioApi";

const STORAGE_KEY = "investome-portfolio-v3";

const initialForm = {
  market: "",
  symbol: "",
  name: "",
  coinId: "",
  amount: "",
  avgPrice: "",
};

function formatKRW(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

function formatSignedKRW(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatKRW(v).replace("₩-", "-₩")}`;
}

function readHoldings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPortfolio;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultPortfolio;
  } catch {
    return defaultPortfolio;
  }
}

function persistHoldings(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function marketLabel(market) {
  if (market === "CRYPTO") return "코인";
  if (market === "KOSPI") return "코스피";
  if (market === "KOSDAQ") return "코스닥";
  if (market === "NASDAQ") return "나스닥";
  return market;
}

function toneClass(idx) {
  return `tone${idx % 5}`;
}

function estimateDayPnl(value, changePct) {
  if (!value || typeof changePct !== "number") return 0;
  return value * (changePct / 100);
}

function makeFlowPoints(totalCost, totalValue, dayPnl) {
  const safeCost = totalCost || 1;
  const safeValue = totalValue || safeCost;
  const drift = Math.max(Math.abs(dayPnl), safeValue * 0.02);

  return [
    safeCost * 0.88,
    safeCost * 0.92,
    safeCost * 0.9,
    safeCost * 0.96,
    (safeCost + safeValue) / 2 - drift * 0.18,
    safeValue * 0.91,
    safeValue * 0.98,
    safeValue,
  ];
}

function buildPolyline(points, width = 100, height = 100) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const gap = max - min || 1;

  return points
    .map((value, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((value - min) / gap) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildArea(points, width = 100, height = 100) {
  return `0,${height} ${buildPolyline(points, width, height)} ${width},${height}`;
}

function AssetLogo({ iconUrl, name }) {
  const [imgError, setImgError] = useState(false);

  if (iconUrl && !imgError) {
    return (
      <img
        src={iconUrl}
        alt={name}
        className="portfolioAssetLogo"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="portfolioAssetLogo portfolioAssetLogoFallback">
      {(name || "?").trim().slice(0, 1)}
    </div>
  );
}

function getCalendarItems() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const stamp = `${yyyy}.${mm}.${dd}`;

  return [
    {
      time: "08:00",
      title: "한국 개장 체크",
      impact: "보통",
      impactClass: "medium",
      desc: `${stamp} 장 시작 전 주요 종목·환율 흐름 확인`,
    },
    {
      time: "21:30",
      title: "미국 핵심 지표",
      impact: "높음",
      impactClass: "high",
      desc: "CPI / PPI / 실업지표 발표 시간대 집중 체크",
    },
    {
      time: "03:00",
      title: "FOMC · 연준 발언",
      impact: "매우 높음",
      impactClass: "critical",
      desc: "금리·유동성 이슈가 코인/나스닥 변동성을 키울 수 있어요",
    },
  ];
}

export default function MyPortfolio() {
  const [holdings, setHoldings] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [open, setOpen] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isUiRefreshing, setIsUiRefreshing] = useState(false);
  const [ringReady, setRingReady] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState([]);
  const [searchingAssets, setSearchingAssets] = useState(false);

  useEffect(() => {
    setHoldings(readHoldings());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setRingReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (holdings.length === 0) {
      setQuotes({});
      setLoadingQuotes(false);
      persistHoldings([]);
      return;
    }

    persistHoldings(holdings);

    let alive = true;

    async function loadQuotes() {
      try {
        if (Object.keys(quotes).length === 0) {
          setLoadingQuotes(true);
        }

        const next = await fetchPortfolioQuotes(holdings);
        if (!alive) return;
        setQuotes(next);
      } catch {
        if (!alive) return;
      } finally {
        if (alive) setLoadingQuotes(false);
      }
    }

    loadQuotes();
    const timer = setInterval(loadQuotes, 20000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [holdings]);

  useEffect(() => {
    const q = searchText.trim();

    if (!open || !q) {
      setRemoteSuggestions([]);
      setSearchingAssets(false);
      return;
    }

    let alive = true;
    setSearchingAssets(true);

    const timer = setTimeout(async () => {
      try {
        const items = await searchAssetCatalog({ q, market: "ALL" });
        if (!alive) return;
        setRemoteSuggestions(items);
      } catch {
        if (!alive) return;
        setRemoteSuggestions([]);
      } finally {
        if (alive) setSearchingAssets(false);
      }
    }, 220);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, searchText]);

  const localSuggestionList = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];

    return SEARCH_ASSETS.filter((item) =>
      item.aliases?.some((alias) => alias.includes(q))
    ).slice(0, 8);
  }, [searchText]);

  const suggestionList = useMemo(() => {
    const remote = Array.isArray(remoteSuggestions) ? remoteSuggestions : [];
    return remote.length > 0 ? remote : localSuggestionList;
  }, [localSuggestionList, remoteSuggestions]);

  const enrichedItems = useMemo(() => {
    return holdings.map((item) => {
      const quote = quotes[item.id] || null;
      const currentPrice = quote?.priceKRW ?? null;
      const changePct = quote?.changePct ?? null;
      const value = currentPrice != null ? currentPrice * item.amount : 0;
      const cost = item.amount * item.avgPrice;
      const pnl = value - cost;
      const rate = cost ? (pnl / cost) * 100 : 0;
      const dayPnl = estimateDayPnl(value, changePct);

      return {
        ...item,
        name: quote?.name || item.name,
        displayNameEN: quote?.displayNameEN || item.displayNameEN || item.name,
        iconUrl: quote?.iconUrl || item.iconUrl || "",
        coinId: quote?.coinId || item.coinId || "",
        currentPrice,
        changePct,
        value,
        cost,
        pnl,
        rate,
        dayPnl,
      };
    });
  }, [holdings, quotes]);

  const emptyState = enrichedItems.length === 0;
  const totalValue = enrichedItems.reduce((sum, item) => sum + item.value, 0);
  const totalCost = enrichedItems.reduce((sum, item) => sum + item.cost, 0);
  const totalPnl = totalValue - totalCost;
  const totalRate = totalCost ? (totalPnl / totalCost) * 100 : 0;
  const totalDayPnl = enrichedItems.reduce((sum, item) => sum + item.dayPnl, 0);
  const totalDayRate = totalValue ? (totalDayPnl / totalValue) * 100 : 0;
  const totalAssetsForRatio = totalValue || 1;
  const bestItem = [...enrichedItems].sort((a, b) => b.rate - a.rate)[0] || null;
  const worstItem = [...enrichedItems].sort((a, b) => a.rate - b.rate)[0] || null;

  const flowPoints = makeFlowPoints(totalCost, totalValue, totalDayPnl);
  const flowLine = buildPolyline(flowPoints);
  const flowArea = buildArea(flowPoints);
  const calendarItems = getCalendarItems();

  const ringGradient = useMemo(() => {
    let current = 0;
    const segments = [];
    const pairs = [
      ["#39d7ff", "#4d83ff"],
      ["#63f4bf", "#1ad598"],
      ["#8e80ff", "#6a6dff"],
      ["#ff9fce", "#ff6f9d"],
      ["#ffd56a", "#ffab42"],
    ];

    enrichedItems.forEach((item, idx) => {
      const ratio = ((item.value || 0) / totalAssetsForRatio) * 360;
      const next = current + ratio;
      const [from, to] = pairs[idx % pairs.length];
      segments.push(`${from} ${current}deg ${Math.max(current, next - 2)}deg`);
      segments.push(`${to} ${Math.min(current + 2, next)}deg ${next}deg`);
      current = next;
    });

    return segments.length
      ? `conic-gradient(${segments.join(", ")})`
      : "conic-gradient(#1b2432 0deg 360deg)";
  }, [enrichedItems, totalAssetsForRatio]);

  function triggerUiRefresh() {
    setIsUiRefreshing(true);
    window.clearTimeout(window.__investomeUiRefreshTimer);
    window.__investomeUiRefreshTimer = window.setTimeout(() => {
      setIsUiRefreshing(false);
    }, 650);
  }

  function openModal() {
    setForm(initialForm);
    setSearchText("");
    setShowSuggestions(false);
    setSubmitError("");
    setRemoteSuggestions([]);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setSaving(false);
    setSubmitError("");
    setSearchText("");
    setShowSuggestions(false);
    setRemoteSuggestions([]);
  }

  function handlePickSuggestion(asset) {
    setForm((prev) => ({
      ...prev,
      market: asset.market,
      symbol: asset.symbol,
      name: asset.name,
      coinId: asset.coinId || "",
    }));
    setSearchText(`${asset.name} · ${asset.symbol}`);
    setShowSuggestions(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setSubmitError("");

      if (!form.market || !form.symbol || !form.name || !form.amount || !form.avgPrice) {
        throw new Error("종목을 검색해서 선택한 뒤 수량과 평균단가를 입력해줘.");
      }

      const amount = Number(form.amount);
      const avgPrice = Number(form.avgPrice);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("수량은 0보다 큰 숫자로 입력해줘.");
      }

      if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
        throw new Error("평균단가는 0보다 큰 숫자로 입력해줘.");
      }

      const verified = await fetchAssetQuote({
        market: form.market,
        symbol: form.symbol,
        name: form.name,
        coinId: form.coinId,
      });

      if (!verified?.symbol || verified?.priceKRW == null) {
        throw new Error("현재 시세를 확인할 수 없는 종목이야. 검색 결과에서 다시 선택해줘.");
      }

      const nextItem = {
        id: `pf-${Date.now()}`,
        market: form.market,
        symbol: verified.symbol,
        name: verified.name || form.name,
        displayNameEN: verified.displayNameEN || form.name,
        amount,
        avgPrice,
        coinId: verified.coinId || "",
        iconUrl: verified.iconUrl || "",
      };

      setHoldings((prev) => [nextItem, ...prev]);
      triggerUiRefresh();
      closeModal();
    } catch (err) {
      setSubmitError(err.message || "종목 추가 중 오류가 발생했어.");
    } finally {
      setSaving(false);
    }
  }

  function removeHolding(id) {
    setHoldings((prev) => prev.filter((item) => item.id !== id));
    triggerUiRefresh();
  }

  return (
    <>
      <section className="portfolioDashboard">
        <div className="portfolioTopGrid">
          <div className={`portfolioHeroCard card ${isUiRefreshing ? "isRefreshing" : ""}`}>
            <div className="portfolioHeroAmbient" />

            <div className="portfolioHeroHead">
              <div>
                <div className="portfolioEyebrow">PORTFOLIO OVERVIEW</div>
                <h3 className="portfolioTitle">전체 포트폴리오</h3>
                <p className="portfolioSubcopy">
                  내 자산, 오늘 흐름, 수익 추이를 한 번에 보는 개인 대시보드
                </p>
              </div>

              <div className={`portfolioLiveBadge ${loadingQuotes ? "syncing" : "live"}`}>
                <span className="portfolioLiveDot" />
                {loadingQuotes ? "SYNCING" : "LIVE"}
              </div>
            </div>

            <div className="portfolioHeadlineRow">
              <div>
                <div className="portfolioTotalValue">{formatKRW(totalValue)}</div>
                <div
                  className="portfolioPnl"
                  style={{
                    color: totalPnl >= 0 ? "rgba(73,221,255,.96)" : "rgba(255,125,175,.96)",
                  }}
                >
                  {formatSignedKRW(totalPnl)}
                  <span className="portfolioPnlRate"> ({totalRate.toFixed(2)}%)</span>
                </div>
              </div>

              <div className="portfolioTodayBox">
                <span>오늘 변동</span>
                <strong style={{ color: totalDayPnl >= 0 ? "#7beaff" : "#ff98bf" }}>
                  {formatSignedKRW(totalDayPnl)}
                </strong>
                <em>
                  {totalDayPnl >= 0 ? "+" : ""}
                  {totalDayRate.toFixed(2)}%
                </em>
              </div>
            </div>

            <div className="portfolioHeroStatsGrid">
              <div className="portfolioMiniGlowCard isStrong">
                <span className="label">매수원금</span>
                <strong>{formatKRW(totalCost)}</strong>
              </div>
              <div className="portfolioMiniGlowCard">
                <span className="label">평가자산</span>
                <strong>{formatKRW(totalValue)}</strong>
              </div>
              <div className="portfolioMiniGlowCard">
                <span className="label">보유종목</span>
                <strong>{enrichedItems.length}개</strong>
              </div>
              <div className="portfolioMiniGlowCard">
                <span className="label">베스트</span>
                <strong>
                  {bestItem
                    ? `${bestItem.symbol} ${bestItem.rate >= 0 ? "+" : ""}${bestItem.rate.toFixed(
                        2
                      )}%`
                    : "-"}
                </strong>
              </div>
            </div>

            <div className="portfolioHeroFoot">
              <div className="portfolioAccentBar">
                <div className="portfolioAccentFill" />
              </div>
              <div className="portfolioHeroHint">
                {worstItem
                  ? `주의 종목 · ${worstItem.symbol} ${
                      worstItem.rate >= 0 ? "+" : ""
                    }${worstItem.rate.toFixed(2)}%`
                  : "아직 집계 중"}
              </div>
            </div>
          </div>

          <div className="portfolioRightStack">
            <div className={`portfolioAllocationCard card ${isUiRefreshing ? "isRefreshing" : ""}`}>
              <div className="portfolioCardHead">
                <div>
                  <div className="portfolioEyebrow">ALLOCATION</div>
                  <h3 className="portfolioTitleSm">자산 비중</h3>
                </div>
              </div>

              <div className="portfolioAllocationBody">
                <div
                  className={`portfolioRing ${ringReady ? "isReady" : ""} ${
                    isUiRefreshing ? "isRefreshing" : ""
                  }`}
                  style={{ background: ringGradient }}
                >
                  <div className="portfolioRingInner">
                    <span>총 자산</span>
                    <strong>{formatKRW(totalValue)}</strong>
                  </div>
                </div>

                <div className="portfolioLegend">
                  {emptyState ? (
                    <div className="portfolioEmptyMiniCard">
                      <strong>아직 비중 데이터가 없어요</strong>
                      <span>종목을 추가하면 자산 비중이 차트로 표시돼요.</span>
                    </div>
                  ) : (
                    enrichedItems.map((item, idx) => {
                      const ratio = ((item.value / totalAssetsForRatio) * 100 || 0).toFixed(1);

                      return (
                        <div className="portfolioLegendItem" key={item.id}>
                          <div className={`portfolioLegendDot ${toneClass(idx)}`} />
                          <div className="portfolioLegendText">
                            <div className="portfolioLegendLabel">
                              <strong>{item.name}</strong>
                              <small>{item.symbol}</small>
                            </div>
                            <span>{ratio}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="portfolioCalendarCard card">
              <div className="portfolioCardHead">
                <div>
                  <div className="portfolioEyebrow">ECONOMIC CALENDAR</div>
                  <h3 className="portfolioTitleSm">오늘의 경제 캘린더</h3>
                </div>
                <div className="portfolioGhostTag">Today</div>
              </div>

              <div className="portfolioCalendarNotice">
                상단 바는 이미 꽉 차 있어서, <strong>마이페이지 오른쪽 카드</strong>로 두는 게
                제일 자연스럽고 고급스럽게 보여.
              </div>

              <div className="portfolioCalendarList">
                {calendarItems.map((item) => (
                  <div className="portfolioCalendarItem" key={`${item.time}-${item.title}`}>
                    <div className="portfolioCalendarTime">{item.time}</div>
                    <div className="portfolioCalendarContent">
                      <div className="portfolioCalendarTop">
                        <strong>{item.title}</strong>
                        <span className={`portfolioImpactTag impact-${item.impactClass}`}>
                          {item.impact}
                        </span>
                      </div>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="portfolioBottomGrid">
          <div className={`portfolioFlowCard card ${isUiRefreshing ? "isRefreshing" : ""}`}>
            <div className="portfolioCardHead">
              <div>
                <div className="portfolioEyebrow">ASSET FLOW</div>
                <h3 className="portfolioTitleSm">전체 자산 흐름</h3>
              </div>
              <div className="portfolioGhostTag">1M Preview</div>
            </div>

            {emptyState ? (
              <div className="portfolioEmptySoft">
                <div className="portfolioEmptySoftIcon">↗</div>
                <div>
                  <strong>흐름 데이터 준비 전</strong>
                  <p>보유 종목을 추가하면 전체 자산 흐름이 자연스럽게 표시돼요.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="portfolioFlowBox">
                  <div className="portfolioFlowGrid" />
                  <svg className="portfolioFlowSvg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="portfolio-flow-line" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#39d7ff" />
                        <stop offset="100%" stopColor="#7e5dff" />
                      </linearGradient>
                      <linearGradient id="portfolio-flow-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(57,215,255,0.34)" />
                        <stop offset="100%" stopColor="rgba(57,215,255,0)" />
                      </linearGradient>
                    </defs>

                    <polyline points={flowArea} fill="url(#portfolio-flow-fill)" className="portfolioFlowArea" />
                    <polyline
                      points={flowLine}
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
                    <span className="label">보유 종목수</span>
                    <strong>{enrichedItems.length}개</strong>
                  </div>
                  <div>
                    <span className="label">총 수익률</span>
                    <strong>{totalRate.toFixed(2)}%</strong>
                  </div>
                  <div>
                    <span className="label">오늘 변동</span>
                    <strong>{formatSignedKRW(totalDayPnl)}</strong>
                  </div>
                  <div>
                    <span className="label">집중 자산</span>
                    <strong>{bestItem ? bestItem.name : "-"}</strong>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className={`portfolioHoldingsCard card ${isUiRefreshing ? "isRefreshing" : ""}`}>
            <div className="portfolioCardHead">
              <div>
                <div className="portfolioEyebrow">HOLDINGS</div>
                <h3 className="portfolioTitleSm">보유 종목</h3>
              </div>

              <button className="portfolioAddBtn" type="button" onClick={openModal}>
                <span className="portfolioAddBtnIcon">＋</span>
                종목 추가
              </button>
            </div>

            {emptyState ? (
              <div className="portfolioEmptyState">
                <div className="portfolioEmptyOrb" />
                <div className="portfolioEmptyIcon">✦</div>
                <h4>아직 담긴 종목이 없어요</h4>
                <p>
                  관심 있는 코인이나 주식을 추가해서
                  <br />
                  나만의 포트폴리오를 관리해보세요.
                </p>
                <button className="portfolioAddBtn isLarge" type="button" onClick={openModal}>
                  <span className="portfolioAddBtnIcon">＋</span>
                  첫 종목 추가하기
                </button>
              </div>
            ) : (
              <div className={`portfolioHoldingList luxuryScroll ${isUiRefreshing ? "isRefreshing" : ""}`}>
                {enrichedItems.map((item, idx) => {
                  const itemPnlColor =
                    item.pnl >= 0 ? "rgba(73,221,255,.95)" : "rgba(255,125,175,.95)";
                  const ratio = ((item.value / totalAssetsForRatio) * 100 || 0).toFixed(1);

                  return (
                    <div key={item.id} className="portfolioHoldingItem">
                      <div className="portfolioHoldingTop">
                        <div className="portfolioHoldingIdentity">
                          <AssetLogo iconUrl={item.iconUrl} name={item.name} />

                          <div>
                            <div className="portfolioHoldingName">{item.name}</div>
                            <div className="portfolioHoldingSub">
                              {item.symbol}
                              {item.displayNameEN && item.displayNameEN !== item.name
                                ? ` · ${item.displayNameEN}`
                                : ""}
                            </div>
                          </div>
                        </div>

                        <div className="portfolioHoldingValue">{formatKRW(item.value)}</div>
                      </div>

                      <div className="portfolioHoldingMetaRow">
                        <span>
                          {marketLabel(item.market)} · 수량 {item.amount} · 평균단가{" "}
                          {formatKRW(item.avgPrice)} · 현재가{" "}
                          {item.currentPrice == null ? "시세 확인 실패" : formatKRW(item.currentPrice)}
                        </span>
                        <span style={{ color: itemPnlColor, fontWeight: 800 }}>
                          {formatSignedKRW(item.pnl)} ({item.rate.toFixed(2)}%)
                        </span>
                      </div>

                      <div className="portfolioHoldingBottomRow">
                        <div className="portfolioHoldingTagWrap">
                          <span className={`portfolioMarketTag ${toneClass(idx)}`}>
                            {marketLabel(item.market)}
                          </span>
                          <span className="portfolioSoftTag">비중 {ratio}%</span>
                          {typeof item.changePct === "number" && (
                            <span className="portfolioSoftTag">
                              오늘 {item.changePct > 0 ? "+" : ""}
                              {item.changePct.toFixed(2)}%
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="portfolioDeleteBtn"
                          onClick={() => removeHolding(item.id)}
                        >
                          삭제
                        </button>
                      </div>

                      <div className="portfolioHoldingBar">
                        <div
                          className={`portfolioHoldingFill ${toneClass(idx)}`}
                          style={{ width: `${Math.max(8, Number(ratio))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {open && (
        <div className="portfolioModalBackdrop" onClick={closeModal}>
          <div className="portfolioModal" onClick={(e) => e.stopPropagation()}>
            <div className="portfolioModalHead">
              <div>
                <div className="portfolioEyebrow">ADD HOLDING</div>
                <h3 className="portfolioModalTitle">보유 종목 추가</h3>
              </div>

              <button type="button" className="portfolioModalClose" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="portfolioModalNotice">
              종목명 또는 심볼로 검색하면 <strong>코인, 나스닥, 코스피, 코스닥</strong>이 한 번에
              검색돼.
            </div>

            <div className="portfolioSearchBox">
              <input
                type="text"
                value={searchText}
                placeholder="비트코인, 삼성전자, 테슬라처럼 검색"
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (searchText.trim()) setShowSuggestions(true);
                }}
              />

              {showSuggestions && (
                <div className="portfolioSuggestList">
                  {searchingAssets && (
                    <div className="portfolioSuggestItem isMuted">
                      <span>검색 중...</span>
                      <small>전체 시장 검색</small>
                    </div>
                  )}

                  {!searchingAssets && suggestionList.length === 0 && searchText.trim() && (
                    <div className="portfolioSuggestItem isMuted">
                      <span>검색 결과가 없어요</span>
                      <small>종목명 또는 심볼을 다시 확인해줘</small>
                    </div>
                  )}

                  {!searchingAssets &&
                    suggestionList.map((item) => (
                      <button
                        key={`${item.market}-${item.coinId || item.symbol}`}
                        type="button"
                        className="portfolioSuggestItem"
                        onClick={() => handlePickSuggestion(item)}
                      >
                        <span>{item.name}</span>
                        <small>
                          {marketLabel(item.market)} · {item.symbol}
                        </small>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <form className="portfolioFormGrid" onSubmit={handleSubmit}>
              <label>
                <span>시장</span>
                <input
                  type="text"
                  value={form.market ? marketLabel(form.market) : ""}
                  placeholder="검색 결과 선택 시 자동 입력"
                  readOnly
                />
              </label>

              <label>
                <span>심볼</span>
                <input
                  type="text"
                  value={form.symbol}
                  placeholder="검색 결과 선택 시 자동 입력"
                  readOnly
                />
              </label>

              <label>
                <span>종목명</span>
                <input
                  type="text"
                  value={form.name}
                  placeholder="검색 결과 선택 시 자동 입력"
                  readOnly
                />
              </label>

              <label>
                <span>보유수량</span>
                <input
                  type="number"
                  step="any"
                  value={form.amount}
                  placeholder="0.25 / 10 / 120"
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </label>

              <label>
                <span>평균단가 (KRW)</span>
                <input
                  type="number"
                  step="any"
                  value={form.avgPrice}
                  placeholder="매수 평균단가"
                  onChange={(e) => setForm((prev) => ({ ...prev, avgPrice: e.target.value }))}
                />
              </label>

              <div className="portfolioFormHint">
                먼저 위 검색창에서 종목을 선택한 다음 수량과 평균단가를 입력해줘.
              </div>

              {submitError ? <div className="portfolioFormError">{submitError}</div> : null}

              <div className="portfolioFormActions">
                <button type="button" className="portfolioGhostBtn" onClick={closeModal}>
                  취소
                </button>
                <button type="submit" className="portfolioAddBtn" disabled={saving}>
                  <span className="portfolioAddBtnIcon">＋</span>
                  {saving ? "추가 중..." : "종목 추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}