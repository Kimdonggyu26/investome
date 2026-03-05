// src/api/rankingApi.js

export async function fetchCryptoTop30KRW() {
  const url =
    "/cg/api/v3/coins/markets" +
    "?vs_currency=krw" +
    "&order=market_cap_desc" +
    "&per_page=30" +
    "&page=1" +
    "&sparkline=false" +
    "&price_change_percentage=24h";

  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko markets failed: ${res.status}`);
  const json = await res.json();

  return json.map((c, idx) => ({
    rank: idx + 1,
    symbol: (c.symbol || "").toUpperCase(),
    name: c.name,
    capKRW: c.market_cap,
    priceKRW: c.current_price,
    changePct: c.price_change_percentage_24h ?? null,
    iconUrl: c.image,
    market: "CRYPTO",
  }));
}

// ✅ KOSPI 실데이터(키 있으면 동작)
export async function fetchKospiTop30KRW() {
  const res = await fetch("/api/krx-top30?market=KOSPI");
  if (!res.ok) throw new Error(`KRX top30 failed: ${res.status}`);
  const json = await res.json();
  return json.items;
}

// ✅ NASDAQ 실데이터(키 있으면 동작)
export async function fetchNasdaqTop30KRW() {
  const res = await fetch("/api/us-top30?exchange=NASDAQ");
  if (!res.ok) throw new Error(`US top30 failed: ${res.status}`);
  const json = await res.json();
  return json.items;
}

export function getKoreanDummyTop30(market) {
  const rows = [];
  for (let i = 1; i <= 30; i++) {
    if (market === "KOSPI") {
      rows.push({
        rank: i,
        symbol: String(100000 + i),
        name: `KOSPI 종목 ${i}`,
        capKRW: 520_000_000_000_000 - i * 7_500_000_000_000,
        priceKRW: 80_000 - i * 650,
        changePct: (i % 2 === 0 ? 1 : -1) * (0.2 + (i % 7) * 0.18),
        iconUrl: null,
        market: "KOSPI",
      });
    } else {
      rows.push({
        rank: i,
        symbol: `US${i}`,
        name: `NASDAQ 종목 ${i}`,
        capKRW: 3_400_000_000_000_000 - i * 45_000_000_000_000,
        priceKRW: 320_000 - i * 3_200,
        changePct: (i % 2 === 0 ? 1 : -1) * (0.15 + (i % 9) * 0.14),
        iconUrl: null,
        market: "NASDAQ",
      });
    }
  }
  return rows;
}