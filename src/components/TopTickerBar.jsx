// src/components/TopTickerBar.jsx
import { useEffect, useRef, useState } from "react";
import "./TopTickerBar.css";

const ITEMS = [
  { key: "BTC", label: "BTC", prefix: "₩" },
  { key: "ETH", label: "ETH", prefix: "₩" },
  { key: "XRP", label: "XRP", prefix: "₩" },
  { key: "KOSPI", label: "KOSPI", prefix: "" },
  { key: "NASDAQ", label: "NASDAQ", prefix: "" },
];

function formatNumber(v, isCurrency) {
  if (v === null || v === undefined) return "불러오는중";
  if (typeof v !== "number") return "불러오는중";
  const opt = isCurrency
    ? { maximumFractionDigits: 0 }
    : { maximumFractionDigits: 2 };
  return v.toLocaleString("ko-KR", opt);
}

export default function TopTickerBar({ prices, changes, loading, error }) {
  // flashMap: { BTC: "up" | "down" | null, ... }
  const [flashMap, setFlashMap] = useState({});
  const prevPricesRef = useRef({});
  const timersRef = useRef({});

  useEffect(() => {
    // 가격이 들어오기 전엔 아무것도 하지 않음
    if (!prices) return;

    const prev = prevPricesRef.current;
    const nextFlash = {};

    for (const it of ITEMS) {
      const k = it.key;
      const cur = prices?.[k];
      const old = prev?.[k];

      if (typeof cur === "number" && typeof old === "number" && cur !== old) {
        nextFlash[k] = cur > old ? "up" : "down";

        // 기존 타이머가 있으면 제거 후 재설정
        if (timersRef.current[k]) clearTimeout(timersRef.current[k]);

        timersRef.current[k] = setTimeout(() => {
          setFlashMap((m) => {
            const copy = { ...m };
            delete copy[k];
            return copy;
          });
        }, 600); // 0.6초 후 제거
      }
    }

    if (Object.keys(nextFlash).length > 0) {
      setFlashMap((m) => ({ ...m, ...nextFlash }));
    }

    prevPricesRef.current = prices;
  }, [prices]);

  // 언마운트 시 타이머 정리
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

        {/* 흐르는 티커 */}
        <div className="tickerItems" aria-label="Live ticker">
          <div className="tickerTrack">
            {/* 1세트 */}
            {ITEMS.map((it) => {
              const price = prices?.[it.key];
              const change = changes?.[it.key];

              const isUp = typeof change === "number" && change >= 0;
              const hasChange = typeof change === "number";

              const flash = flashMap?.[it.key]; // "up" | "down" | undefined
              const flashClass = flash ? `flash-${flash}` : "";

              return (
                <div className={`tickerItem ${flashClass}`} key={`a-${it.key}`} title={it.label}>
                  <span className="tickerSymbol">{it.label}</span>
                  <span className="tickerPrice">
                    {it.prefix}
                    {formatNumber(price, it.prefix === "₩")}
                  </span>
                  {hasChange && (
                    <span className={`tickerChange ${isUp ? "up" : "down"}`}>
                      {isUp ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  )}
                </div>
              );
            })}

            {/* 2세트(복제) */}
            {ITEMS.map((it) => {
              const price = prices?.[it.key];
              const change = changes?.[it.key];

              const isUp = typeof change === "number" && change >= 0;
              const hasChange = typeof change === "number";

              const flash = flashMap?.[it.key];
              const flashClass = flash ? `flash-${flash}` : "";

              return (
                <div className={`tickerItem ${flashClass}`} key={`b-${it.key}`} title={it.label}>
                  <span className="tickerSymbol">{it.label}</span>
                  <span className="tickerPrice">
                    {it.prefix}
                    {formatNumber(price, it.prefix === "₩")}
                  </span>
                  {hasChange && (
                    <span className={`tickerChange ${isUp ? "up" : "down"}`}>
                      {isUp ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}