export async function fetchCryptoTickerKRW() {
  const res = await fetch("/api/ticker");
  if (!res.ok) throw new Error(`Ticker failed: ${res.status}`);
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

export async function fetchIndexPlaceholders() {
  return {
    prices: {
      KOSPI: 2640.12,
      NASDAQ: 16840.55,
    },
    changes: {
      KOSPI: 0.52,
      NASDAQ: -0.31,
    },
  };
}