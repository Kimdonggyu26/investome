import { useEffect, useMemo, useState } from "react";
import { portfolio as defaultPortfolio } from "../data/portfolio";
import { SEARCH_ASSETS } from "../data/searchAssets";
import {
  fetchAssetQuote,
  fetchPortfolioQuotes,
  searchAssetCatalog,
} from "../api/portfolioApi";

const STORAGE_KEY = "investome-portfolio-v3";

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

function makeFlowPoints(totalCost, totalValue) {
  const safeCost = totalCost || 1;
  const safeValue = totalValue || safeCost;
  const start = safeCost * 0.83;
  const mid = (safeCost + safeValue) / 2;

  return [
    start,
    start * 1.03,
    start * 0.99,
    mid * 0.94,
    mid,
    mid * 1.04,
    safeValue * 0.97,
    safeValue,
  ];
}

function buildPath(points, width = 100, height = 100) {
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

function buildSvgPath(points, width = 100, height = 100, topPadding = 12) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const gap = max - min || 1;

  return points
    .map((value, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((value - min) / gap) * (height - topPadding);
      return `${idx === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");
}

function buildAreaPath(points, width = 100, height = 100, topPadding = 12) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const gap = max - min || 1;

  const topLine = points
    .map((value, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((value - min) / gap) * (height - topPadding);
      return `${x},${y}`;
    })
    .join(" ");

  return `M ${topLine} L ${width},${height} L 0,${height} Z`;
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

const initialForm = {
  market: "",
  symbol: "",
  name: "",
  coinId: "",
  amount: "",
  avgPrice: "",
};

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
    const t = setTimeout(() => setRingReady(true), 60);
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
    const t = setInterval(loadQuotes, 20_000);

    return () => {
      alive = false;
      clearInterval(t);
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
        const items = await searchAssetCatalog({
          q,
          market: "ALL",
        });

        if (!alive) return;
        setRemoteSuggestions(items);
      } catch {
        if (!alive) return;
        setRemoteSuggestions([]);
      } finally {
        if (alive) setSearchingAssets(false);
      }
    }, 200);

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
      const capKRW = quote?.capKRW ?? null;
      const changePct = quote?.changePct ?? null;
      const value = currentPrice != null ? currentPrice * item.amount : 0;
      const cost = item.amount * item.avgPrice;
      const pnl = value - cost;
      const rate = cost ? (pnl / cost) * 100 : 0;

      return {
        ...item,
        name: quote?.name || item.name,
        displayNameEN: quote?.displayNameEN || item.displayNameEN || item.name,
        iconUrl: quote?.iconUrl || item.iconUrl || "",
        coinId: quote?.coinId || item.coinId || "",
        currentPrice,
        capKRW,
        changePct,
        value,
        cost,
        pnl,
        rate,
      };
    });
  }, [holdings, quotes]);

  const totalValue = enrichedItems.reduce((sum, item) => sum + item.value, 0);
  const totalCost = enrichedItems.reduce((sum, item) => sum + item.cost, 0);
  const totalPnl = totalValue - totalCost;
  const totalRate = totalCost ? (totalPnl / totalCost) * 100 : 0;
  const totalAssetsForRatio = totalValue || 1;
  const emptyState = enrichedItems.length === 0;

  const previewFlowPath = buildPath(makeFlowPoints(totalCost, totalValue));

  const topHolding =
    [...enrichedItems].sort((a, b) => (b.value || 0) - (a.value || 0))[0] || null;

  const bestPerformer =
    [...enrichedItems].sort((a, b) => (b.rate || 0) - (a.rate || 0))[0] || null;

  const weakestPerformer =
    [...enrichedItems].sort((a, b) => (a.rate || 0) - (b.rate || 0))[0] || null;

  const marketCount = new Set(enrichedItems.map((item) => item.market)).size;
  const topHoldingRatio = topHolding ? (topHolding.value / totalAssetsForRatio) * 100 : 0;

  const concentrationLabel =
    topHoldingRatio >= 55 ? "집중 높음" : topHoldingRatio >= 35 ? "보통" : "양호";

  const diversificationLabel =
    marketCount >= 3 ? "우수" : marketCount === 2 ? "보통" : marketCount === 1 ? "낮음" : "-";

  const insightMessage = emptyState
    ? ""
    : topHoldingRatio >= 55 && topHolding
      ? `${topHolding.name} 비중이 ${topHoldingRatio.toFixed(
          1
        )}%야. 한 종목 집중도가 높아서 분산을 고려해보는 게 좋아.`
      : marketCount <= 1 && topHolding
        ? `현재 ${marketLabel(
            topHolding.market
          )} 한 시장에 치우쳐 있어. 다른 시장 자산으로 분산하면 안정감이 좋아질 수 있어.`
        : bestPerformer
          ? `${bestPerformer.name}가 현재 수익률을 가장 잘 끌어주고 있어. 지금 비중 구조는 꽤 안정적인 편이야.`
          : "포트폴리오 구성을 점검할 준비가 됐어.";

  const ringGradient = useMemo(() => {
    let current = 0;
    const segments = [];

    enrichedItems.forEach((item, idx) => {
      const ratio = ((item.value || 0) / totalAssetsForRatio) * 360;
      const next = current + ratio;

      const pairs = [
        ["#36d5ff", "#4c7dff"],
        ["#65f3b1", "#18c58f"],
        ["#8f7bff", "#5b7cff"],
        ["#ff9bc2", "#ff6e9e"],
        ["#ffd36b", "#ff9f43"],
      ];

      const pair = pairs[idx % 5];
      segments.push(`${pair[0]} ${current}deg ${Math.max(current, next - 2)}deg`);
      segments.push(`${pair[1]} ${Math.min(current + 2, next)}deg ${next}deg`);
      current = next;
    });

    return segments.length
      ? `conic-gradient(${segments.join(", ")})`
      : "conic-gradient(#1a2231 0deg 360deg)";
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

      const duplicate = holdings.find(
        (item) => item.market === form.market && item.symbol === form.symbol
      );

      if (duplicate) {
        throw new Error("이미 담긴 종목이야. 같은 종목은 중복 추가하지 말고 기존 보유 수량을 관리해줘.");
      }

      const verified = await fetchAssetQuote({
        market: form.market,
        symbol: form.symbol,
        name: form.name,
        coinId: form.coinId,
      });

      if (!verified?.symbol || verified?.priceKRW == null) {
        throw new Error(
          "현재 시세를 확인할 수 없는 종목이야. 검색 결과에서 다시 선택해줘."
        );
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
              </div>

              <div className={`portfolioLiveBadge ${loadingQuotes ? "syncing" : "live"}`}>
                <span className="portfolioLiveDot" />
                {loadingQuotes ? "SYNCING" : "LIVE"}
              </div>
            </div>

            <div className="portfolioTotalValue">{formatKRW(totalValue)}</div>

            <div
              className="portfolioPnl"
              style={{
                color:
                  totalPnl >= 0 ? "rgba(54,213,255,.96)" : "rgba(255,120,170,.96)",
              }}
            >
              {formatSignedKRW(totalPnl)}
              <span className="portfolioPnlRate"> ({totalRate.toFixed(2)}%)</span>
            </div>

            <div className="portfolioHeroSubRow">
              <div className="portfolioMiniGlowCard">
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
            </div>

            <div className="portfolioAccentBar">
              <div className="portfolioAccentFill" />
            </div>
          </div>

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

              <div className="portfolioLegend luxuryScroll">
                {emptyState ? (
                  <div className="portfolioEmptyMiniCard">
                    <strong>아직 비중 데이터가 없어요</strong>
                    <span>종목을 추가하면 자산 비중이 원형 차트로 표시돼요.</span>
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
        </div>

        <div className="portfolioBottomGrid">
          <div className={`portfolioFlowCard card ${isUiRefreshing ? "isRefreshing" : ""}`}>
            <div className="portfolioCardHead">
              <div>
                <div className="portfolioEyebrow">PORTFOLIO INSIGHT</div>
                <h3 className="portfolioTitleSm">포트폴리오 인사이트</h3>
              </div>

              <div className="portfolioGhostTag">{concentrationLabel}</div>
            </div>

            {emptyState ? (
              <div className="portfolioEmptySoft">
                <div className="portfolioEmptySoftIcon">✦</div>
                <div>
                  <strong>인사이트 데이터 준비 전</strong>
                  <p>보유 종목을 추가하면 집중도, 분산도, 최고 수익 종목을 자동으로 보여줄게.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="portfolioInsightHero">
                  <div className="portfolioInsightMain">
                    <span className="label">현재 포지션 진단</span>
                    <strong>{insightMessage}</strong>
                  </div>
                </div>

                <div className="portfolioInsightGrid">
                  <div className="portfolioInsightStat">
                    <span className="label">최대 비중</span>
                    <strong>{topHoldingRatio.toFixed(1)}%</strong>
                    <small>{topHolding ? topHolding.name : "-"}</small>
                  </div>

                  <div className="portfolioInsightStat">
                    <span className="label">시장 분산</span>
                    <strong>{diversificationLabel}</strong>
                    <small>{marketCount}개 시장 보유</small>
                  </div>

                  <div className="portfolioInsightStat">
                    <span className="label">최고 수익</span>
                    <strong>
                      {bestPerformer ? `${bestPerformer.rate > 0 ? "+" : ""}${bestPerformer.rate.toFixed(2)}%` : "-"}
                    </strong>
                    <small>{bestPerformer ? bestPerformer.name : "-"}</small>
                  </div>

                  <div className="portfolioInsightStat">
                    <span className="label">주의 종목</span>
                    <strong>
                      {weakestPerformer ? `${weakestPerformer.rate > 0 ? "+" : ""}${weakestPerformer.rate.toFixed(2)}%` : "-"}
                    </strong>
                    <small>{weakestPerformer ? weakestPerformer.name : "-"}</small>
                  </div>
                </div>

                <div className="portfolioInsightPair">
                  <div className="portfolioInsightFocusCard">
                    <div className="portfolioInsightFocusLabel">TOP WEIGHT</div>
                    {topHolding ? (
                      <div className="portfolioInsightFocusBody">
                        <div className="portfolioInsightFocusLeft">
                          <AssetLogo iconUrl={topHolding.iconUrl} name={topHolding.name} />
                          <div>
                            <div className="portfolioInsightFocusName">{topHolding.name}</div>
                            <div className="portfolioInsightFocusSub">
                              {topHolding.symbol} · {marketLabel(topHolding.market)}
                            </div>
                          </div>
                        </div>

                        <div className="portfolioInsightFocusRight">
                          비중 {topHoldingRatio.toFixed(1)}%
                        </div>
                      </div>
                    ) : (
                      <div className="portfolioTopMoverEmpty">데이터를 불러오는 중이야.</div>
                    )}
                  </div>

                  <div className="portfolioInsightFocusCard">
                    <div className="portfolioInsightFocusLabel">BEST PERFORMER</div>
                    {bestPerformer ? (
                      <div className="portfolioInsightFocusBody">
                        <div className="portfolioInsightFocusLeft">
                          <AssetLogo iconUrl={bestPerformer.iconUrl} name={bestPerformer.name} />
                          <div>
                            <div className="portfolioInsightFocusName">{bestPerformer.name}</div>
                            <div className="portfolioInsightFocusSub">
                              {bestPerformer.symbol} · {marketLabel(bestPerformer.market)}
                            </div>
                          </div>
                        </div>

                        <div className="portfolioInsightFocusRight">
                          {bestPerformer.rate > 0 ? "+" : ""}
                          {bestPerformer.rate.toFixed(2)}%
                        </div>
                      </div>
                    ) : (
                      <div className="portfolioTopMoverEmpty">데이터를 불러오는 중이야.</div>
                    )}
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
              <div
                className={`portfolioHoldingList luxuryScroll ${
                  isUiRefreshing ? "isRefreshing" : ""
                }`}
              >
                {enrichedItems.map((item, idx) => {
                  const itemPnlColor =
                    item.pnl >= 0 ? "rgba(54,213,255,.95)" : "rgba(255,120,170,.95)";
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
                          {marketLabel(item.market)} · 평균단가 {formatKRW(item.avgPrice)} · 현재가{" "}
                          {item.currentPrice == null
                            ? "시세 확인 실패"
                            : formatKRW(item.currentPrice)}
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
              종목명 또는 심볼로 검색하면
              <strong> 코인, 나스닥, 코스피, 코스닥이 한 번에 검색돼.</strong>
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
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                />
              </label>

              <label>
                <span>평균단가 (KRW)</span>
                <input
                  type="number"
                  step="any"
                  value={form.avgPrice}
                  placeholder="매수 평균단가"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, avgPrice: e.target.value }))
                  }
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