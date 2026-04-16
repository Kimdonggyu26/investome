import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RankingTable.css";
import {
  fetchCommoditiesTopKRW,
  fetchCryptoTop30KRW,
  fetchKospiTop30KRW,
  fetchNasdaqTop30KRW,
} from "../api/rankingApi";
import { fetchFx } from "../api/fxApi";

const MARKETS = ["KOSPI", "NASDAQ", "CRYPTO", "COMMODITIES"];
const REFRESH_MS = 20_000;
const FX_REFRESH_MS = 30_000;

function formatKRW(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function formatUSDFromKRW(priceKRW, usdKrw) {
  if (
    typeof priceKRW !== "number" ||
    !Number.isFinite(priceKRW) ||
    typeof usdKrw !== "number" ||
    !Number.isFinite(usdKrw) ||
    usdKrw <= 0
  ) {
    return "-";
  }

  const usd = priceKRW / usdKrw;

  return "$" + usd.toLocaleString("en-US", {
    minimumFractionDigits: usd >= 1000 ? 0 : 2,
    maximumFractionDigits: usd >= 1000 ? 0 : usd >= 1 ? 2 : 4,
  });
}

function formatPriceByCurrency(priceKRW, currency, usdKrw) {
  if (currency === "USD") {
    return formatUSDFromKRW(priceKRW, usdKrw);
  }
  return formatKRW(priceKRW);
}

function shouldShowCurrencyToggle(market) {
  return market === "NASDAQ" || market === "CRYPTO" || market === "COMMODITIES";
}

function colorByChange(pct) {
  if (typeof pct !== "number") return "var(--text-strong)";
  if (pct > 0) return "var(--up-strong)";
  if (pct < 0) return "var(--down-strong)";
  return "var(--text-strong)";
}

function Avatar({ iconUrl, name }) {
  const [imgError, setImgError] = useState(false);

  if (iconUrl && !imgError) {
    return (
      <img
        className="avatar"
        src={iconUrl}
        alt={name}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  const initial = (name || "?").trim().slice(0, 1);
  return <div className="avatar avatarFallback">{initial}</div>;
}

function makeSparkPoints(symbol, pct) {
  const base = String(symbol || "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const points = [];
  let value = 48 + ((base % 9) - 4);

  for (let i = 0; i < 18; i += 1) {
    const wave = Math.sin((base + i * 17) / 11) * 7;
    const drift =
      typeof pct === "number"
        ? (pct > 0 ? 1 : pct < 0 ? -1 : 0) * i * 0.8
        : Math.cos((base + i) / 9) * 0.6;

    value = Math.max(12, Math.min(88, value + wave * 0.22 + drift * 0.24));
    points.push(value);
  }

  return points;
}

function Sparkline({ symbol, pct }) {
  const points = useMemo(() => makeSparkPoints(symbol, pct), [symbol, pct]);

  const path = points
    .map((y, i) => {
      const x = (i / (points.length - 1)) * 100;
      return `${x},${100 - y}`;
    })
    .join(" ");

  const lineClass =
    typeof pct === "number" && pct < 0
      ? "sparkLine down"
      : typeof pct === "number" && pct > 0
        ? "sparkLine up"
        : "sparkLine flat";

  return (
    <div className="sparkWrap" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="sparkSvg" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`spark-fill-${symbol}`} x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor={pct < 0 ? "rgba(255,120,170,0.22)" : "rgba(80,255,170,0.22)"}
            />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <polyline
          points={`0,100 ${path} 100,100`}
          className="sparkArea"
          fill={`url(#spark-fill-${symbol})`}
        />
        <polyline points={path} className={lineClass} />
      </svg>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rankingSkeletonWrap">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div className="rankingSkeletonRow" key={idx}>
          <div className="rankingSkeleton rank" />
          <div className="rankingSkeleton name" />
          <div className="rankingSkeleton chart" />
          <div className="rankingSkeleton price" />
          <div className="rankingSkeleton change" />
        </div>
      ))}
    </div>
  );
}

function getCountdownLabel(secondsLeft, isRefreshingNow) {
  if (isRefreshingNow) return "데이터를 갱신하고 있어요...";
  return `${secondsLeft}초 뒤 새로고침`;
}

function getDisplayName(row, market) {
  if (market === "KOSPI" || market === "NASDAQ" || market === "COMMODITIES") {
    return row.name || row.displayNameEN || row.symbol || "-";
  }
  return row.displayNameEN || row.name || row.symbol || "-";
}

function getSecondaryLabel(row, market) {
  if (market === "COMMODITIES") {
    return row.symbol || row.displayNameEN || "";
  }
  return row.symbol || "";
}

export default function RankingTable() {
  const navigate = useNavigate();

  const [market, setMarket] = useState("KOSPI");
  const [currencyByMarket, setCurrencyByMarket] = useState({
    NASDAQ: "KRW",
    CRYPTO: "KRW",
    COMMODITIES: "KRW",
  });
  const [usdKrw, setUsdKrw] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [flashMap, setFlashMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isRefreshingNow, setIsRefreshingNow] = useState(false);

  const prevRowsRef = useRef([]);
  const flashTimerRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const nextRefreshAtRef = useRef(null);
  const mountedRef = useRef(false);

  const currency = currencyByMarket[market] || "KRW";

  const clearScheduledRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    if (!nextRefreshAtRef.current) return;

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    const updateCountdown = () => {
      const remain = nextRefreshAtRef.current - Date.now();
      const nextValue = Math.max(0, Math.ceil(remain / 1000));
      setSecondsLeft(nextValue);
    };

    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 250);
  }, []);

  const scheduleNextRefresh = useCallback(
    (refreshFn) => {
      clearScheduledRefresh();

      nextRefreshAtRef.current = Date.now() + REFRESH_MS;
      setSecondsLeft(Math.ceil(REFRESH_MS / 1000));
      setIsRefreshingNow(false);
      startCountdown();

      refreshTimeoutRef.current = setTimeout(() => {
        refreshFn({ initial: false });
      }, REFRESH_MS);
    },
    [clearScheduledRefresh, startCountdown]
  );

  const fetchRows = useCallback(
    async ({ initial = false } = {}) => {
      const startAt = Date.now();

      try {
        setErr(null);
        setIsRefreshingNow(!initial);

        if (initial && prevRowsRef.current.length === 0) {
          setIsLoading(true);
        } else {
          setIsSwitching(true);
        }

        let nextRows = [];

        if (market === "CRYPTO") {
          nextRows = await fetchCryptoTop30KRW();
        } else if (market === "KOSPI") {
          nextRows = await fetchKospiTop30KRW();
        } else if (market === "NASDAQ") {
          nextRows = await fetchNasdaqTop30KRW();
        } else if (market === "COMMODITIES") {
          nextRows = await fetchCommoditiesTopKRW();
        }

        const elapsed = Date.now() - startAt;
        const minimumOverlay = 220;

        if (elapsed < minimumOverlay) {
          await new Promise((resolve) => setTimeout(resolve, minimumOverlay - elapsed));
        }

        if (!mountedRef.current) return;

        const prevMap = Object.fromEntries(prevRowsRef.current.map((r) => [r.symbol, r]));
        const flashes = {};

        nextRows.forEach((r) => {
          const prev = prevMap[r.symbol];
          if (!prev) return;

          const priceChanged = prev.priceKRW !== r.priceKRW;
          const pctChanged = prev.changePct !== r.changePct;

          if (priceChanged || pctChanged) {
            flashes[r.symbol] =
              typeof r.changePct === "number" && r.changePct < 0 ? "down" : "up";
          }
        });

        setRows(nextRows);
        prevRowsRef.current = nextRows;

        if (flashTimerRef.current) {
          clearTimeout(flashTimerRef.current);
        }

        if (Object.keys(flashes).length > 0) {
          setFlashMap(flashes);
          flashTimerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            setFlashMap({});
          }, 1100);
        } else {
          setFlashMap({});
        }

        setIsLoading(false);
        setIsSwitching(false);

        scheduleNextRefresh(fetchRows);
      } catch (e) {
        if (!mountedRef.current) return;
        setErr(e);
        setIsLoading(false);
        setIsSwitching(false);
        setIsRefreshingNow(false);

        scheduleNextRefresh(fetchRows);
      }
    },
    [market, scheduleNextRefresh]
  );

  useEffect(() => {
    let cancelled = false;

    const loadFx = async () => {
      try {
        const data = await fetchFx();
        if (cancelled) return;
        setUsdKrw(data?.USDKRW ?? null);
      } catch {
        if (cancelled) return;
      }
    };

    loadFx();
    const timer = setInterval(loadFx, FX_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    prevRowsRef.current = [];
    setRows([]);
    setErr(null);
    setFlashMap({});
    setSecondsLeft(20);
    setIsRefreshingNow(false);

    clearScheduledRefresh();
    fetchRows({ initial: true });

    const handleVisibility = () => {
      if (!document.hidden && nextRefreshAtRef.current) {
        const remain = nextRefreshAtRef.current - Date.now();

        if (remain <= 0) {
          fetchRows({ initial: false });
        } else {
          setSecondsLeft(Math.max(0, Math.ceil(remain / 1000)));
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      clearScheduledRefresh();
      document.removeEventListener("visibilitychange", handleVisibility);

      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }
    };
  }, [market, clearScheduledRefresh, fetchRows]);

  return (
    <div className="rankingCard" id="ranking">
      <div className="rankingHeader">
        <div className="rankingHeaderMain">
          <div className="tickerLiveBadge live sectionTickerBadge">
            <span className="tickerLiveDot" />
            <span>LIVE</span>
          </div>

          <h3>{market === "COMMODITIES" ? "원자재 시세" : "TOP 30"}</h3>
          <div className="rankingSub">
            {market === "COMMODITIES"
              ? "주요 원자재 가격을 실시간으로 확인해보세요"
              : "실시간 순위와 가격 변동을 확인해보세요"}
          </div>
        </div>

        <div className="rankingHeaderRight">
          <div className="marketTabs">
            {MARKETS.map((m) => (
              <button
                key={m}
                className={market === m ? "active" : ""}
                onClick={() => setMarket(m)}
                type="button"
              >
                {m}
              </button>
            ))}
          </div>

          <div className={`rankingRefreshBadge ${isRefreshingNow ? "isRefreshing" : ""}`}>
            <span className="rankingRefreshDot" />
            <span>{getCountdownLabel(secondsLeft, isRefreshingNow)}</span>
          </div>
        </div>
      </div>

      {err && (
        <div className="rankingHint" style={{ marginBottom: 12 }}>
          실시간 순위 데이터를 불러오지 못했어요. 다음 주기에 다시 시도할게요.
        </div>
      )}

      {isLoading && rows.length === 0 ? (
        <TableSkeleton />
      ) : (
        <div className={`rankingScroll luxuryScroll ${market === "COMMODITIES" ? "noScroll" : ""}`}>
          <div className={`rankingDataLayer ${isSwitching ? "isSwitching" : ""}`}>
            <table className="rankingTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>종목</th>
                  <th>추세</th>
                  <th>
                    <div className="priceHeadCell">
                      <span>현재가</span>
                      {shouldShowCurrencyToggle(market) && (
                        <div
                          className="currencyToggle currencyToggleInline currencyToggleMini"
                          role="tablist"
                          aria-label="통화 전환"
                        >
                          <button
                            type="button"
                            className={currency === "KRW" ? "active" : ""}
                            onClick={() =>
                              setCurrencyByMarket((prev) => ({
                                ...prev,
                                [market]: "KRW",
                              }))
                            }
                          >
                            KRW
                          </button>
                          <button
                            type="button"
                            className={currency === "USD" ? "active" : ""}
                            onClick={() =>
                              setCurrencyByMarket((prev) => ({
                                ...prev,
                                [market]: "USD",
                              }))
                            }
                            disabled={!usdKrw}
                            title={!usdKrw ? "환율 데이터를 불러오는 중이에요" : ""}
                          >
                            USD
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                  <th>24H</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const flash = flashMap[row.symbol];
                  const displayName = getDisplayName(row, market);
                  const secondaryLabel = getSecondaryLabel(row, market);

                  const rowFlashClass =
                    flash === "up"
                      ? "rowFlashUp"
                      : flash === "down"
                        ? "rowFlashDown"
                        : "";

                  const valueFlashClass =
                    flash === "up"
                      ? "valueGlowUp"
                      : flash === "down"
                        ? "valueGlowDown"
                        : "";

                  return (
                    <tr
                      key={`${row.symbol}-${row.rank}`}
                      className={rowFlashClass}
                      onClick={() => navigate(`/asset/${market}/${row.symbol}`)}
                    >
                      <td className="rankCell">{row.rank}</td>

                      <td>
                        <div className="nameCell">
                          <Avatar iconUrl={row.iconUrl} name={displayName} />

                          <div className="nameText">
                            <div className="nameMain">{displayName}</div>
                            <div className="nameSub">{secondaryLabel}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <Sparkline symbol={row.symbol} pct={row.changePct} />
                      </td>

                      <td className={`valueUpdate ${valueFlashClass}`}>
                        <span key={`${market}-${currency}-${row.symbol}`} className="priceMorph">
                          {formatPriceByCurrency(row.priceKRW, currency, usdKrw)}
                        </span>
                      </td>

                      <td
                        className={`valueUpdate ${valueFlashClass}`}
                        style={{ color: colorByChange(row.changePct), fontWeight: 800 }}
                      >
                        {typeof row.changePct === "number"
                          ? `${row.changePct > 0 ? "+" : ""}${row.changePct.toFixed(2)}%`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rankingHint">행을 클릭하면 해당 자산의 상세 페이지로 이동합니다.</div>
    </div>
  );
}
