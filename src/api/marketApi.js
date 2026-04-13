import { apiUrl } from "../lib/apiClient";

export async function fetchMarketTicker() {
  const res = await fetch(apiUrl("/api/ticker"));

  if (!res.ok) {
    throw new Error(`Ticker failed: ${res.status}`);
  }

  const json = await res.json();
  const indexes = json.indexes ?? {};

  return {
    prices: {
      BTC: json.bitcoin?.krw ?? null,
      ETH: json.ethereum?.krw ?? null,
      XRP: json.ripple?.krw ?? null,
      KOSPI: indexes.KOSPI?.price ?? indexes.kospi?.price ?? null,
      NASDAQ: indexes.NASDAQ?.price ?? indexes.nasdaq?.price ?? null,
    },
    changes: {
      BTC: json.bitcoin?.krw_24h_change ?? null,
      ETH: json.ethereum?.krw_24h_change ?? null,
      XRP: json.ripple?.krw_24h_change ?? null,
      KOSPI: indexes.KOSPI?.changePct ?? indexes.kospi?.changePct ?? null,
      NASDAQ: indexes.NASDAQ?.changePct ?? indexes.nasdaq?.changePct ?? null,
    },
  };
}
