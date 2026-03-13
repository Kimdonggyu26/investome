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
  if (market === "KOSPI") return "국내주식";
  if (market === "KOSDAQ") return "코스닥";
  if (market === "NASDAQ") return "미국주식";
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
  market: "CRYPTO",
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
          market: form.market || "ALL",
        });

        if (!alive) return;
        setRemoteSuggestions(items);
      } catch {
        if (!alive) return;
        setRemoteSuggestions([]);
      } finally {
        if (alive) setSearchingAssets(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [form.market, open, searchText]);

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

  const flowPath = buildPath(makeFlowPoints(totalCost, totalValue));

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
        throw new Error("시장, 심볼, 종목명, 수량, 평균단가를 모두 입력해줘.");
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
        throw new Error(
          "현재 시세를 확인할 수 없는 종목이야. 검색 결과에서 다시 선택하거나 심볼을 확인해줘."
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

  const emptyState = enrichedItems.length === 0;

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

              <div className="portfolioLegend">
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
                <div className="portfolioEyebrow">ASSET FLOW</div>
                <h3 className="portfolioTitleSm">전체 자산 흐름</h3>
              </div>
              <div className="portfolioGhostTag">Preview</div>
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
                    <span className="label">보유 종목수</span>
                    <strong>{enrichedItems.length}개</strong>
                  </div>
                  <div>
                    <span className="label">총 수익률</span>
                    <strong>{totalRate.toFixed(2)}%</strong>
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
                  나만의 포트폴리오를 세련되게 관리해보세요.
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
              종목명 또는 심볼로 빠르게 검색해서 추가할 수 있어.
              <strong> 선택하면 아래 추천 박스는 자동으로 닫혀.</strong>
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
                      <small>실시간 종목 검색</small>
                    </div>
                  )}

                  {!searchingAssets && suggestionList.length === 0 && searchText.trim() && (
                    <div className="portfolioSuggestItem isMuted">
                      <span>검색 결과가 없어요</span>
                      <small>심볼 또는 종목명을 다시 확인해줘</small>
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
                          {item.market} · {item.symbol}
                        </small>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <form className="portfolioFormGrid" onSubmit={handleSubmit}>
              <label>
                <span>시장</span>
                <select
                  className="portfolioSelect"
                  value={form.market}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      market: e.target.value,
                      coinId: "",
                    }))
                  }
                >
                  <option value="CRYPTO">CRYPTO</option>
                  <option value="KOSPI">KOSPI</option>
                  <option value="KOSDAQ">KOSDAQ</option>
                  <option value="NASDAQ">NASDAQ</option>
                </select>
              </label>

              <label>
                <span>심볼</span>
                <input
                  type="text"
                  value={form.symbol}
                  placeholder="BTC / 005930 / 091990 / TSLA"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      symbol: e.target.value.toUpperCase(),
                      coinId: "",
                    }))
                  }
                />
              </label>

              <label>
                <span>종목명</span>
                <input
                  type="text"
                  value={form.name}
                  placeholder="비트코인 / 삼성전자 / 셀트리온헬스케어 / 테슬라"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                      coinId: "",
                    }))
                  }
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
                검색으로 선택한 종목은 자동으로 시장/심볼/종목명이 채워져.
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