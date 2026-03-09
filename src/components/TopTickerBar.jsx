import { useEffect, useRef, useState } from "react";
import "./TopTickerBar.css";

const ITEMS = [
  { key: "BTC", label: "BTC", prefix: "₩" },
  { key: "ETH", label: "ETH", prefix: "₩" },
  { key: "XRP", label: "XRP", prefix: "₩" },
  { key: "KOSPI", label: "KOSPI", prefix: "" },
  { key: "NASDAQ", label: "NASDAQ", prefix: "" },
];

function formatNumber(v, isCurrency, loading) {
  if (typeof v === "number") {
    const opt = isCurrency
      ? { maximumFractionDigits: 0 }
      : { maximumFractionDigits: 2 };
    return v.toLocaleString("ko-KR", opt);
  }

  return loading ? "불러오는중" : "-";
}

export default function TopTickerBar({ prices, changes, loading, error }) {
  const [flashMap, setFlashMap] = useState({});
  const prevPricesRef = useRef({});
  const timersRef = useRef({});

  useEffect(() => {
    if (!prices) return;

    const prev = prevPricesRef.current;
    const nextFlash = {};

    for (const it of ITEMS) {
      const k = it.key;
      const cur = prices?.[k];
      const old = prev?.[k];

      if (typeof cur === "number" && typeof old === "number" && cur !== old) {
        nextFlash[k] = cur > old ? "up" : "down";

        if (timersRef.current[k]) clearTimeout(timersRef.current[k]);

        timersRef.current[k] = setTimeout(() => {
          setFlashMap((m) => {
            const copy = { ...m };
            delete copy[k];
            return copy;
          });
        }, 600);
      }
    }

    if (Object.keys(nextFlash).length > 0) {
      setFlashMap((m) => ({ ...m, ...nextFlash }));
    }

    prevPricesRef.current = prices;
  }, [prices]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className="tickerBar">
      <div className="tickerInner container">
        <div className="tickerLeft">
          <span className="tickerDot" />
          <span className="tickerTitle">Live</span>
          <span className="tickerSub muted">
            {error ? "일부 데이터를 불러오지 못했어요" : loading ? "업데이트 중" : "실시간"}
          </span>
        </div>

        <div className="tickerItems" aria-label="Live ticker">
          <div className="tickerTrack">
            {["a", "b"].map((dup) =>
              ITEMS.map((it) => {
                const price = prices?.[it.key];
                const change = changes?.[it.key];

                const isUp = typeof change === "number" && change >= 0;
                const hasChange = typeof change === "number";

                const flash = flashMap?.[it.key];
                const flashClass = flash ? `flash-${flash}` : "";

                return (
                  <div
                    className={`tickerItem ${flashClass}`}
                    key={`${dup}-${it.key}`}
                    title={it.label}
                  >
                    <span className="tickerSymbol">{it.label}</span>
                    <span className="tickerPrice">
                      {it.prefix}
                      {formatNumber(price, it.prefix === "₩", loading)}
                    </span>
                    {hasChange ? (
                      <span className={`tickerChange ${isUp ? "up" : "down"}`}>
                        {isUp ? "+" : ""}
                        {change.toFixed(2)}%
                      </span>
                    ) : (
                      !loading && <span className="tickerChange">-</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}