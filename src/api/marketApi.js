// src/api/marketApi.js

export async function fetchCryptoTickerKRW() {
  // Vite proxy 사용: /cg -> https://api.coingecko.com
  const url =
    "/cg/api/v3/simple/price" +
    "?ids=bitcoin,ethereum,ripple" +
    "&vs_currencies=krw" +
    "&include_24hr_change=true";

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CoinGecko: ${res.status}`);
  const json = await res.json();

  return {
    prices: {
      BTC: json.bitcoin?.krw ?? null,
      ETH: json.ethereum?.krw ?? null,
      XRP: json.ripple?.krw ?? null,
    },
    changes: {
      BTC: json.bitcoin?.krw_24h_change ?? null,
      ETH: json.ethereum?.krw_24h_change ?? null,
      XRP: json.ripple?.krw_24h_change ?? null,
    },
  };
}

/**
 * KOSPI / NASDAQ은 "일단 UI/로직"을 위해 placeholder로 유지
 * (나중에 서버리스 프록시나 백엔드로 실데이터 연결)
 */
export async function fetchIndexPlaceholders() {
  return {
    prices: { KOSPI: 2640.12, NASDAQ: 16840.55 },
    changes: { KOSPI: 0.52, NASDAQ: -0.31 },
  };
}