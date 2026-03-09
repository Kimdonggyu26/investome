import { useEffect, useRef, useState } from "react";

function formatPrice(value) {
  if (typeof value !== "number" || !isFinite(value)) return "불러오는중";
  return value.toLocaleString("ko-KR");
}

function Ticker({ prices = {}, changes = {} }) {
  const coins = ["BTC", "ETH", "XRP"];
  const prevPricesRef = useRef({});
  const flashTimerRef = useRef(null);
  const [flashMap, setFlashMap] = useState({});

  useEffect(() => {
    const nextFlashMap = {};

    coins.forEach((coin) => {
      const prev = prevPricesRef.current[coin];
      const next = prices?.[coin];

      if (typeof prev === "number" && typeof next === "number" && prev !== next) {
        nextFlashMap[coin] = next > prev ? "up" : "down";
      }
    });

    prevPricesRef.current = prices || {};

    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }

    if (Object.keys(nextFlashMap).length > 0) {
      setFlashMap(nextFlashMap);
      flashTimerRef.current = setTimeout(() => {
        setFlashMap({});
      }, 1000);
    }

    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [prices]);

  return (
    <div className="ticker">
      {coins.map((coin) => {
        const flash = flashMap[coin];
        const flashClass =
          flash === "up" ? "ticker-price upFlash" :
          flash === "down" ? "ticker-price downFlash" :
          "ticker-price";

        return (
          <span key={coin} className="ticker-item">
            {coin} ₩
            <span className={flashClass}>
              {formatPrice(prices?.[coin])}
            </span>{" "}
            {changes?.[coin] !== undefined && (
              <span className={changes[coin] >= 0 ? "up" : "down"}>
                {changes[coin] > 0 ? "+" : ""}
                {changes[coin]?.toFixed(2)}%
              </span>
            )}
          </span>
        );
      })}

      <span>USD/KRW 1,325원</span>
      <span>KOSPI 2,640 ▲0.5%</span>
    </div>
  );
}

export default Ticker;