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
      삼성전자:
        json.stocks?.samsungElectronics?.price ??
        json.stocks?.samsungelectronics?.price ??
        null,
      "SK하이닉스":
        json.stocks?.skHynix?.price ??
        json.stocks?.skhynix?.price ??
        null,
      KOSPI: indexes.KOSPI?.price ?? indexes.kospi?.price ?? null,
      NASDAQ: indexes.NASDAQ?.price ?? indexes.nasdaq?.price ?? null,
    },
    changes: {
      BTC: json.bitcoin?.krw_24h_change ?? null,
      ETH: json.ethereum?.krw_24h_change ?? null,
      XRP: json.ripple?.krw_24h_change ?? null,
      삼성전자:
        json.stocks?.samsungElectronics?.changePct ??
        json.stocks?.samsungelectronics?.changePct ??
        null,
      "SK하이닉스":
        json.stocks?.skHynix?.changePct ??
        json.stocks?.skhynix?.changePct ??
        null,
      KOSPI: indexes.KOSPI?.changePct ?? indexes.kospi?.changePct ?? null,
      NASDAQ: indexes.NASDAQ?.changePct ?? indexes.nasdaq?.changePct ?? null,
    },
  };
}
