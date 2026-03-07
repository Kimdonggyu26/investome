// src/api/marketApi.js

function getRandomDelta(min = -0.35, max = 0.35) {
  return Math.random() * (max - min) + min;
}

function updateMockIndex(basePrice, baseChange) {
  const delta = getRandomDelta(-0.18, 0.18);
  const nextPrice = basePrice * (1 + delta / 100);
  const nextChange = baseChange + delta;

  return {
    price: Number(nextPrice.toFixed(2)),
    change: Number(nextChange.toFixed(2)),
  };
}

export async function fetchCryptoTickerKRW() {
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
    },
    changes: {
      BTC: json.bitcoin?.krw_24h_change ?? null,
      ETH: json.ethereum?.krw_24h_change ?? null,
      XRP: json.ripple?.krw_24h_change ?? null,
    },
  };
}

export async function fetchIndexPlaceholders() {
  const kospi = updateMockIndex(2640.12, 0.52);
  const nasdaq = updateMockIndex(16840.55, -0.31);

  return {
    prices: {
      KOSPI: kospi.price,
      NASDAQ: nasdaq.price,
    },
    changes: {
      KOSPI: kospi.change,
      NASDAQ: nasdaq.change,
    },
  };
}