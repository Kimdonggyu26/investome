import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RankingTable.css";
import {
  fetchCommoditiesTopKRW,
  fetchCryptoTop30KRW,
  fetchKospiTop30KRW,
  fetchNasdaqTop30KRW,
} from "../api/rankingApi";

const MARKETS = ["KOSPI", "NASDAQ", "CRYPTO", "COMMODITIES"];
const REFRESH_MS = 20_000;

function formatKRW(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

function colorByChange(pct) {
  if (typeof pct !== "number") return "rgba(255,255,255,0.88)";
  if (pct > 0) return "rgba(80,255,170,0.95)";
  if (pct < 0) return "rgba(255,120,170,0.95)";
  return "rgba(255,255,255,0.88)";
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
  if (isRefreshingNow) return "데이터 갱신 중...";
  return `데이터 갱신까지 ${secondsLeft}초`;
}

export default function RankingTable() {
  const navigate = useNavigate();

  const [market, setMarket] = useState("CRYPTO");
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

          <h3>{market === "COMMODITIES" ? "원자재 시세" : "TOP30 랭킹"}</h3>
          <div className="rankingSub">
            {market === "COMMODITIES" ? "Major Commodities Live Prices" : "Top 30 Market Movers"}
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
          데이터를 불러오지 못했어요. 다음 주기에 다시 시도할게요.
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
                  <th>현재가</th>
                  <th>등락률</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const flash = flashMap[row.symbol];

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
                          <Avatar iconUrl={row.iconUrl} name={row.name} />

                          <div className="nameText">
                            <div className="nameMain">
                              {market === "COMMODITIES" ? row.name.split(" ")[0] : row.name}
                            </div>

                            <div className="nameSub">
                              {market === "COMMODITIES"
                                ? (() => {
                                    const parts = row.name.split(" ");
                                    const ko = parts[0] || row.name;
                                    const en = parts.slice(1).join(" ");
                                    return en
                                      ? `${en}${row.displayNameEN ? ` · ${row.displayNameEN}` : ""}`
                                      : row.displayNameEN || "";
                                  })()
                                : `${row.symbol}${row.displayNameEN ? ` · ${row.displayNameEN}` : ""}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <Sparkline symbol={row.symbol} pct={row.changePct} />
                      </td>

                      <td className={`valueUpdate ${valueFlashClass}`}>
                        {formatKRW(row.priceKRW)}
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

      <div className="rankingHint">
        각 종목을 클릭하여 상세페이지로 이동해 보세요.
      </div>
    </div>
  );
}