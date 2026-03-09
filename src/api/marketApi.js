export async function fetchMarketTicker() {
  const res = await fetch("/api/ticker");

  if (!res.ok) {
    throw new Error(`Ticker failed: ${res.status}`);
  }

  const json = await res.json();

  return {
    prices: {
      BTC: json.bitcoin?.krw ?? null,
      ETH: json.ethereum?.krw ?? null,
      XRP: json.ripple?.krw ?? null,
      KOSPI: json.indexes?.KOSPI?.price ?? null,
      NASDAQ: json.indexes?.NASDAQ?.price ?? null,
    },
    changes: {
      BTC: json.bitcoin?.krw_24h_change ?? null,
      ETH: json.ethereum?.krw_24h_change ?? null,
      XRP: json.ripple?.krw_24h_change ?? null,
      KOSPI: json.indexes?.KOSPI?.changePct ?? null,
      NASDAQ: json.indexes?.NASDAQ?.changePct ?? null,
    },
  };
}