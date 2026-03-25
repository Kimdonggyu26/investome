import { useEffect, useMemo, useRef, useState } from "react";
import { SEARCH_ASSETS } from "../data/searchAssets";
import {
  fetchAssetQuote,
  fetchMyPagePortfolio,
  fetchPortfolioQuotes,
  saveMyPagePortfolio,
  searchAssetCatalog,
} from "../api/portfolioApi";
import { getAuthUser } from "../utils/auth";

const STORAGE_KEY_PREFIX = "investome-portfolio-v4";
const TARGET_STORAGE_KEY_PREFIX = "investome-portfolio-target-v2";

function formatKRW(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

function formatSignedKRW(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatKRW(v).replace("₩-", "-₩")}`;
}

function getScopedKey(prefix, userId) {
  return `${prefix}-${userId || "guest"}`;
}

function sanitizeNumericInput(value, { allowDecimal = false } = {}) {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  if (!raw) return "";

  let cleaned = raw.replace(allowDecimal ? /[^\d.]/g : /[^\d]/g, "");
  if (!allowDecimal) return cleaned;

  const [integerPart = "", ...decimalParts] = cleaned.split(".");
  const decimalPart = decimalParts.join("");
  return decimalParts.length ? `${integerPart}.${decimalPart}` : integerPart;
}

function formatNumericInput(value, { allowDecimal = false } = {}) {
  const cleaned = sanitizeNumericInput(value, { allowDecimal });
  if (!cleaned) return "";

  const [integerPart = "", decimalPart] = cleaned.split(".");
  const formattedInteger = integerPart ? Number(integerPart).toLocaleString("ko-KR") : "0";

  if (!allowDecimal) return formattedInteger;
  if (cleaned.endsWith(".")) return `${formattedInteger}.`;
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

function getHoldingsStorageKey(userId) {
  return getScopedKey(STORAGE_KEY_PREFIX, userId);
}

function getTargetStorageKey(userId) {
  return getScopedKey(TARGET_STORAGE_KEY_PREFIX, userId);
}

function readHoldings(userId) {
  try {
    const raw = localStorage.getItem(getHoldingsStorageKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHoldings(items, userId) {
  localStorage.setItem(getHoldingsStorageKey(userId), JSON.stringify(items));
}

function readTargetAmount(userId) {
  try {
    const raw = localStorage.getItem(getTargetStorageKey(userId));
    if (!raw) return 50000000;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 50000000;
  } catch {
    return 50000000;
  }
}

function persistTargetAmount(value, userId) {
  localStorage.setItem(getTargetStorageKey(userId), String(value));
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
  const authUser = getAuthUser();
  const userId = authUser?.id || "guest";
  const saveTimerRef = useRef(null);
  const [hasHydrated, setHasHydrated] = useState(false);
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
  const [targetAmount, setTargetAmount] = useState(50000000);
  const [targetInput, setTargetInput] = useState("50000000");
  const [isTargetEditing, setIsTargetEditing] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [calcForm, setCalcForm] = useState({
    buyPrice: "",
    sellPrice: "",
    quantity: "",
  });

  useEffect(() => {
    let alive = true;

    async function hydrate() {
      const localHoldings = readHoldings(userId);
      const localTarget = readTargetAmount(userId);

      if (!alive) return;
      setHoldings(localHoldings);
      setTargetAmount(localTarget);
      setTargetInput(String(localTarget));

      if (authUser?.id) {
        try {
          const remote = await fetchMyPagePortfolio();
          if (!alive || !remote) {
            setHasHydrated(true);
            return;
          }

          const remoteHoldings = Array.isArray(remote.holdings) ? remote.holdings : [];
          const remoteTarget = Number(remote.targetAmount);
          const nextTarget = Number.isFinite(remoteTarget) && remoteTarget > 0 ? remoteTarget : 50000000;

          setHoldings(remoteHoldings);
          setTargetAmount(nextTarget);
          setTargetInput(String(nextTarget));
          persistHoldings(remoteHoldings, userId);
          persistTargetAmount(nextTarget, userId);
        } catch {
          // 백엔드 저장본이 없어도 로컬 상태로 계속 사용
        }
      }

      if (alive) setHasHydrated(true);
    }

    hydrate();

    return () => {
      alive = false;
    };
  }, [authUser?.id, userId]);

  useEffect(() => {
    const t = setTimeout(() => setRingReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (holdings.length === 0) {
      setQuotes({});
      setLoadingQuotes(false);
      return;
    }

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
    if (!hasHydrated) return;

    persistHoldings(holdings, userId);
    persistTargetAmount(targetAmount, userId);

    if (!authUser?.id) return;

    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveMyPagePortfolio({
        holdings,
        targetAmount,
      }).catch(() => {
        // 저장 실패 시에도 로컬 저장본 유지
      });
    }, 250);

    return () => {
      window.clearTimeout(saveTimerRef.current);
    };
  }, [authUser?.id, hasHydrated, holdings, targetAmount, userId]);

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

  const scoreItem = (item) => {
    const symbol = String(item.symbol || "").toLowerCase();
    const name = String(item.name || "").toLowerCase();
    const en = String(item.displayNameEN || "").toLowerCase();

    if (name === q || en === q || symbol === q) return 100;
    if (name.startsWith(q) || en.startsWith(q) || symbol.startsWith(q)) return 80;
    if (item.aliases?.some((alias) => alias === q)) return 75;
    if (item.aliases?.some((alias) => alias.startsWith(q))) return 60;
    if (item.aliases?.some((alias) => alias.includes(q))) return 40;
    return 0;
  };

  return [...SEARCH_ASSETS]
    .filter((item) => item.aliases?.some((alias) => alias.includes(q)))
    .sort((a, b) => scoreItem(b) - scoreItem(a))
    .slice(0, 10);
}, [searchText]);

  const suggestionList = useMemo(() => {
    const remote = Array.isArray(remoteSuggestions) ? remoteSuggestions : [];
    const merged = [...localSuggestionList, ...remote];
    const seen = new Set();

    return merged.filter((item) => {
      const key = `${item.market}-${item.coinId || item.symbol}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
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

  const todayUpCount = enrichedItems.filter(
    (item) => typeof item.changePct === "number" && item.changePct > 0
  ).length;

  const todayDownCount = enrichedItems.filter(
    (item) => typeof item.changePct === "number" && item.changePct < 0
  ).length;

  const todayFlatCount = enrichedItems.filter(
    (item) => typeof item.changePct === "number" && item.changePct === 0
  ).length;

  const todayChangeValue = enrichedItems.reduce((sum, item) => {
    if (item.currentPrice == null || typeof item.changePct !== "number") return sum;

    const prevPrice =
      item.changePct === -100
        ? item.currentPrice
        : item.currentPrice / (1 + item.changePct / 100);

    const todayDiffPerUnit = item.currentPrice - prevPrice;
    return sum + todayDiffPerUnit * item.amount;
  }, 0);

  const todayChangeRate =
    totalValue > 0 ? (todayChangeValue / Math.max(totalValue - todayChangeValue, 1)) * 100 : 0;

  const topGainer =
    [...enrichedItems]
      .filter((item) => typeof item.changePct === "number")
      .sort((a, b) => (b.changePct || 0) - (a.changePct || 0))[0] || null;

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
      ? `${topHolding.name} 비중 ${topHoldingRatio.toFixed(1)}% · 집중도 높음`
      : marketCount <= 1 && topHolding
        ? `${marketLabel(topHolding.market)} 단일 시장 중심 · 분산 보완 추천`
        : bestPerformer
          ? `${bestPerformer.name} 수익률 선두 · 현재 구조 양호`
          : "포트폴리오 데이터 분석 중";

  const targetProgress = targetAmount > 0 ? Math.min((totalValue / targetAmount) * 100, 999) : 0;
  const targetRemaining = Math.max(targetAmount - totalValue, 0);
  const requiredGrowthFromNow = totalValue > 0 ? (targetRemaining / totalValue) * 100 : 0;
  const requiredTotalReturnFromCost =
    totalCost > 0 ? ((targetAmount - totalCost) / totalCost) * 100 : 0;
  const calcBuyPrice = Number(calcForm.buyPrice);
  const calcSellPrice = Number(calcForm.sellPrice);
  const calcQuantity = Number(calcForm.quantity);

  const calcIsValid =
    Number.isFinite(calcBuyPrice) &&
    calcBuyPrice > 0 &&
    Number.isFinite(calcSellPrice) &&
    calcSellPrice > 0 &&
    Number.isFinite(calcQuantity) &&
    calcQuantity > 0;

  const calcBuyAmount = calcIsValid ? calcBuyPrice * calcQuantity : 0;
  const calcSellAmount = calcIsValid ? calcSellPrice * calcQuantity : 0;
  const calcProfit = calcIsValid ? calcSellAmount - calcBuyAmount : 0;
  const calcProfitRate =
    calcIsValid && calcBuyAmount > 0 ? (calcProfit / calcBuyAmount) * 100 : 0;  

  const helperToneClass =
    totalPnl >= 0 ? "isPositive" : totalPnl < 0 ? "isNegative" : "";

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

  function startTargetEdit() {
    setTargetInput(String(targetAmount));
    setTargetError("");
    setIsTargetEditing(true);
  }

  function cancelTargetEdit() {
    setTargetInput(String(targetAmount));
    setTargetError("");
    setIsTargetEditing(false);
  }

  function saveTargetAmount() {
    const next = Number(sanitizeNumericInput(targetInput));

    if (!Number.isFinite(next) || next <= 0) {
      setTargetError("목표 금액은 0보다 큰 숫자로 입력해줘.");
      return;
    }

    setTargetAmount(next);
    persistTargetAmount(next, userId);
    setTargetInput(String(next));
    setTargetError("");
    setIsTargetEditing(false);
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
        throw new Error(
          "이미 담긴 종목이야. 같은 종목은 중복 추가하지 말고 기존 보유 수량을 관리해줘."
        );
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
      <section className="portfolioDashboard portfolioDashboardThreeRows">
        <div className="portfolioTopGrid portfolioTopGridBalanced">
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

            <div className="portfolioSummaryGrid">
              <div className="portfolioSummaryStat">
                <span className="label">총 투자금액</span>
                <strong>{formatKRW(totalCost)}</strong>
              </div>

              <div className="portfolioSummaryStat">
                <span className="label">총 평가금액</span>
                <strong>{formatKRW(totalValue)}</strong>
              </div>
            </div>

            <div className="portfolioOverviewFooter">
              <div className="portfolioOverviewPnlGroup">
                <span className="label">총 손익</span>
                <strong className={totalPnl >= 0 ? "isUp" : "isDown"}>
                  {formatSignedKRW(totalPnl)}
                </strong>
              </div>

              <div className="portfolioOverviewRateGroup">
                <span className="label">총 수익률</span>
                <strong className={totalRate >= 0 ? "isUp" : "isDown"}>
                  {totalRate > 0 ? "+" : ""}
                  {totalRate.toFixed(2)}%
                </strong>
              </div>
            </div>

            <div className="portfolioOverviewMiniList">
              <div className="portfolioOverviewMiniItem">
                <span>수익 합산</span>
                <strong>
                  {formatKRW(
                    enrichedItems
                      .filter((item) => item.pnl > 0)
                      .reduce((sum, item) => sum + item.pnl, 0)
                  )}
                </strong>
              </div>
              <div className="portfolioOverviewMiniItem">
                <span>손실 합산</span>
                <strong>
                  {formatKRW(
                    enrichedItems
                      .filter((item) => item.pnl < 0)
                      .reduce((sum, item) => sum + item.pnl, 0)
                  )}
                </strong>
              </div>
              <div className="portfolioOverviewMiniItem">
                <span>보유 종목</span>
                <strong>{enrichedItems.length}개</strong>
              </div>
            </div>
          </div>

          <div className={`portfolioGoalCard card ${isUiRefreshing ? "isRefreshing" : ""}`}>
            <div className="portfolioCardHead">
              <div>
                <div className="portfolioEyebrow">MY TARGET</div>
                <h3 className="portfolioTitleSm">목표 달성</h3>
              </div>

              {!emptyState &&
                (!isTargetEditing ? (
                  <button type="button" className="portfolioGhostBtn" onClick={startTargetEdit}>
                    목표 설정
                  </button>
                ) : (
                  <div className="portfolioTargetActionRow">
                    <button type="button" className="portfolioGhostBtn" onClick={cancelTargetEdit}>
                      취소
                    </button>
                    <button
                      type="button"
                      className="portfolioAddBtn portfolioAddBtnCompact"
                      onClick={saveTargetAmount}
                    >
                      저장
                    </button>
                  </div>
                ))}
            </div>

            {emptyState ? (
              <div className="portfolioGoalEmptyState">
                <div className="portfolioEmptyOrb" />
                <div className="portfolioEmptyIcon">🎯</div>
                <h4>목표를 설정해보세요</h4>
                <p>
                  목표 금액을 정하면 현재 달성률과
                  <br />
                  남은 금액을 한눈에 볼 수 있어요.
                  <br />
                  목표 달성을 응원합니다 🚀
                </p>
                <button type="button" className="portfolioAddBtn isLarge" onClick={startTargetEdit}>
                  목표 설정하기
                </button>
              </div>
            ) : (
              <>
                {isTargetEditing ? (
                  <div className="portfolioTargetEditor">
                    <span className="label">목표 금액 (KRW)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={Number(targetInput || 0).toLocaleString("ko-KR")}
                      onChange={(e) => {
                        const raw = e.target.value.replaceAll(",", "").replace(/[^\d]/g, "");
                        setTargetInput(raw);
                      }}
                      placeholder="예: 50,000,000"
                    />
                    {targetError ? <div className="portfolioTargetError">{targetError}</div> : null}
                  </div>
                ) : (
                  <div className="portfolioTargetMainValue">{formatKRW(targetAmount)}</div>
                )}

                <div className="portfolioTargetProgressHead">
                  <span>현재 달성률</span>
                  <strong>{targetProgress.toFixed(1)}%</strong>
                </div>

                <div className="portfolioTargetBar">
                  <div
                    className="portfolioTargetFill"
                    style={{ width: `${Math.min(targetProgress, 100)}%` }}
                  />
                </div>

                <div className="portfolioTargetGrid">
                  <div className="portfolioTargetStat">
                    <span className="label">현재 평가금액</span>
                    <strong>{formatKRW(totalValue)}</strong>
                  </div>

                  <div className="portfolioTargetStat">
                    <span className="label">남은 금액</span>
                    <strong>{formatKRW(targetRemaining)}</strong>
                  </div>

                  <div className="portfolioTargetStat">
                    <span className="label">현재 자산 기준</span>
                    <strong>
                      {requiredGrowthFromNow > 0 ? "+" : ""}
                      {requiredGrowthFromNow.toFixed(2)}%
                    </strong>
                    <small>앞으로 더 필요한 수익률</small>
                  </div>

                  <div className="portfolioTargetStat">
                    <span className="label">원금 기준 목표 수익률</span>
                    <strong>
                      {requiredTotalReturnFromCost > 0 ? "+" : ""}
                      {requiredTotalReturnFromCost.toFixed(2)}%
                    </strong>
                    <small>총 투자금액 대비 기준</small>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="portfolioMiddleGrid">
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
              <div className="portfolioEmptyState holdingsEmptyState">
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
                className={`portfolioHoldingList portfolioHoldingListTall luxuryScroll ${
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

          <div className={`portfolioInsightCard card ${isUiRefreshing ? "isRefreshing" : ""}`}>
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
                <div className="portfolioInsightHero compact">
                  <div className="portfolioInsightMain compact">
                    <span className="label">현재 포지션 진단</span>
                    <strong>{insightMessage}</strong>
                  </div>
                </div>

                <div className="portfolioInsightGrid compact">
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
                      {bestPerformer
                        ? `${bestPerformer.rate > 0 ? "+" : ""}${bestPerformer.rate.toFixed(2)}%`
                        : "-"}
                    </strong>
                    <small>{bestPerformer ? bestPerformer.name : "-"}</small>
                  </div>

                  <div className="portfolioInsightStat">
                    <span className="label">주의 종목</span>
                    <strong>
                      {weakestPerformer
                        ? `${weakestPerformer.rate > 0 ? "+" : ""}${weakestPerformer.rate.toFixed(2)}%`
                        : "-"}
                    </strong>
                    <small>{weakestPerformer ? weakestPerformer.name : "-"}</small>
                  </div>
                </div>

                <div className="portfolioInsightPair compact">
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
        </div>

        <div className="portfolioBottomGrid portfolioBottomGridBalanced">
            <div className={`portfolioAllocationCard card ${isUiRefreshing ? "isRefreshing" : ""}`}>
              <div className="portfolioCardHead">
                <div>
                  <div className="portfolioEyebrow">ALLOCATION</div>
                  <h3 className="portfolioTitleSm">자산 비중</h3>
                </div>
              </div>

              <div className="portfolioAllocationBody portfolioAllocationBodyEmptyFriendly">
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

                {emptyState ? (
                  <div className="portfolioAllocationEmptyPanel">
                    <div className="portfolioAllocationEmptyText">
                      <strong>아직 비중 데이터가 없어요</strong>
                      <span>
                        종목을 추가하면 자산 비중이 자동으로 계산되고
                        <br />
                        원형 차트로 한눈에 볼 수 있어요.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="portfolioLegend luxuryScroll">
                    {enrichedItems.map((item, idx) => {
                      const ratio = ((item.value / totalAssetsForRatio) * 100 || 0).toFixed(1);

                      return (
                        <div className="portfolioLegendItem" key={item.id}>
                          <div className={`portfolioLegendDot ${toneClass(idx)}`} />
                          <div className="portfolioLegendText">
                            <div>
                              <strong>{item.name}</strong>
                              <span>{marketLabel(item.market)}</span>
                            </div>
                            <strong>{ratio}%</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>`

          <div className={`portfolioCalculatorCard card ${isUiRefreshing ? "isRefreshing" : ""}`}>
            <div className="portfolioCardHead">
              <div>
                <div className="portfolioEyebrow">RETURN CALCULATOR</div>
                <h3 className="portfolioTitleSm">수익률 계산기</h3>
              </div>
              <div className="portfolioGhostTag">TRADE CHECK</div>
            </div>

            <div className="portfolioCalcGrid">
              <label className="portfolioCalcField">
                <span>매수가</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericInput(calcForm.buyPrice, { allowDecimal: true })}
                  onChange={(e) =>
                    setCalcForm((prev) => ({ ...prev, buyPrice: sanitizeNumericInput(e.target.value, { allowDecimal: true }) }))
                  }
                  placeholder="예: 105000"
                />
              </label>

              <label className="portfolioCalcField">
                <span>매도가</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericInput(calcForm.sellPrice, { allowDecimal: true })}
                  onChange={(e) =>
                    setCalcForm((prev) => ({ ...prev, sellPrice: sanitizeNumericInput(e.target.value, { allowDecimal: true }) }))
                  }
                  placeholder="예: 112000"
                />
              </label>

              <label className="portfolioCalcField">
                <span>수량</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericInput(calcForm.quantity, { allowDecimal: true })}
                  onChange={(e) =>
                    setCalcForm((prev) => ({ ...prev, quantity: sanitizeNumericInput(e.target.value, { allowDecimal: true }) }))
                  }
                  placeholder="예: 10"
                />
              </label>
            </div>

            <div className="portfolioCalcResultCard">
              <div className="portfolioCalcResultHead">
                <span>예상 손익</span>
                <strong className={calcProfit >= 0 ? "isUp" : "isDown"}>
                  {calcIsValid ? formatSignedKRW(calcProfit) : "-"}
                </strong>
              </div>

              <div className="portfolioCalcResultGrid">
                <div className="portfolioCalcStat">
                  <span>매수 금액</span>
                  <strong>{calcIsValid ? formatKRW(calcBuyAmount) : "-"}</strong>
                </div>

                <div className="portfolioCalcStat">
                  <span>매도 금액</span>
                  <strong>{calcIsValid ? formatKRW(calcSellAmount) : "-"}</strong>
                </div>

                <div className="portfolioCalcStat">
                  <span>수익률</span>
                  <strong className={calcProfitRate >= 0 ? "isUp" : "isDown"}>
                    {calcIsValid ? `${calcProfitRate > 0 ? "+" : ""}${calcProfitRate.toFixed(2)}%` : "-"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="portfolioCalcHint">
              단타든 스윙이든 진입가 / 목표가 / 수량만 넣으면 손익을 바로 확인할 수 있어.
            </div>
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
                  type="text"
                  inputMode="decimal"
                  value={formatNumericInput(form.amount, { allowDecimal: true })}
                  placeholder="0.25 / 10 / 120"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, amount: sanitizeNumericInput(e.target.value, { allowDecimal: true }) }))
                  }
                />
              </label>

              <label>
                <span>평균단가 (KRW)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericInput(form.avgPrice, { allowDecimal: true })}
                  placeholder="매수 평균단가"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, avgPrice: sanitizeNumericInput(e.target.value, { allowDecimal: true }) }))
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