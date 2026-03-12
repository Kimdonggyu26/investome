const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=krw&order=market_cap_desc&per_page=30&page=1&sparkline=false";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRow(row, index) {
  return {
    rank: row.rank ?? index + 1,
    name: row.name ?? "-",
    displayNameEN: row.displayNameEN ?? "",
    symbol: (row.symbol || "-").toUpperCase(),
    iconUrl: row.iconUrl ?? "",
    coinId: row.coinId ?? "",
    capKRW: toNumber(row.capKRW),
    priceKRW: toNumber(row.priceKRW),
    changePct: toNumber(row.changePct),
  };
}

function toCryptoRow(coin, index) {
  return {
    rank: coin.market_cap_rank ?? index + 1,
    name: coin.name ?? "-",
    displayNameEN: coin.name ?? "",
    symbol: (coin.symbol || "-").toUpperCase(),
    iconUrl: coin.image ?? "",
    coinId: coin.id ?? "",
    capKRW: toNumber(coin.market_cap),
    priceKRW: toNumber(coin.current_price),
    changePct: toNumber(coin.price_change_percentage_24h),
  };
}

/* ================================
   CRYPTO TOP30
================================ */

export async function fetchCryptoTop30KRW() {
  const res = await fetch(COINGECKO_URL);
  if (!res.ok) throw new Error("crypto fetch fail");

  const data = await res.json();

  return data.map((coin, i) => toCryptoRow(coin, i));
}

/* ================================
   KOSPI (더미)
================================ */

export function fetchKospiTop30KRW() {
  return Promise.resolve(getKoreanDummyTop30("KOSPI"));
}

/* ================================
   NASDAQ (더미)
================================ */

export function fetchNasdaqTop30KRW() {
  return Promise.resolve(getKoreanDummyTop30("NASDAQ"));
}

/* ================================
   더미 데이터
================================ */

export function getKoreanDummyTop30(market) {
  const kospi = [
    { name: "삼성전자", symbol: "005930" },
    { name: "SK하이닉스", symbol: "000660" },
    { name: "LG에너지솔루션", symbol: "373220" },
    { name: "현대차", symbol: "005380" },
    { name: "POSCO홀딩스", symbol: "005490" },
    { name: "NAVER", symbol: "035420" },
    { name: "카카오", symbol: "035720" },
    { name: "LG화학", symbol: "051910" },
    { name: "삼성SDI", symbol: "006400" },
    { name: "기아", symbol: "000270" },
  ];

  const nasdaq = [
    { name: "Apple", symbol: "AAPL" },
    { name: "Microsoft", symbol: "MSFT" },
    { name: "NVIDIA", symbol: "NVDA" },
    { name: "Amazon", symbol: "AMZN" },
    { name: "Tesla", symbol: "TSLA" },
    { name: "Meta", symbol: "META" },
    { name: "Google", symbol: "GOOGL" },
    { name: "Netflix", symbol: "NFLX" },
    { name: "AMD", symbol: "AMD" },
    { name: "Intel", symbol: "INTC" },
  ];

  const source = market === "KOSPI" ? kospi : nasdaq;

  return source.map((s, i) =>
    normalizeRow({
      rank: i + 1,
      name: s.name,
      displayNameEN: s.name,
      symbol: s.symbol,
      iconUrl: "",
      capKRW: null,
      priceKRW: 100000 + Math.random() * 100000,
      changePct: (Math.random() - 0.5) * 6,
    })
  );
}