// api/stock-top30.js

const cache = new Map();

const KOSPI_UNIVERSE = [
  { name: "삼성전자", symbol: "005930" },
  { name: "SK하이닉스", symbol: "000660" },
  { name: "LG에너지솔루션", symbol: "373220" },
  { name: "삼성바이오로직스", symbol: "207940" },
  { name: "현대차", symbol: "005380" },
  { name: "셀트리온", symbol: "068270" },
  { name: "기아", symbol: "000270" },
  { name: "KB금융", symbol: "105560" },
  { name: "NAVER", symbol: "035420" },
  { name: "신한지주", symbol: "055550" },
  { name: "POSCO홀딩스", symbol: "005490" },
  { name: "삼성SDI", symbol: "006400" },
  { name: "카카오", symbol: "035720" },
  { name: "LG화학", symbol: "051910" },
  { name: "삼성물산", symbol: "028260" },
  { name: "하나금융지주", symbol: "086790" },
  { name: "한국전력", symbol: "015760" },
  { name: "HD현대중공업", symbol: "329180" },
  { name: "메리츠금융지주", symbol: "138040" },
  { name: "삼성생명", symbol: "032830" },
  { name: "크래프톤", symbol: "259960" },
  { name: "KT&G", symbol: "033780" },
  { name: "HMM", symbol: "011200" },
  { name: "우리금융지주", symbol: "316140" },
  { name: "두산에너빌리티", symbol: "034020" },
  { name: "대한항공", symbol: "003490" },
  { name: "LG전자", symbol: "066570" },
  { name: "포스코퓨처엠", symbol: "003670" },
  { name: "삼성전기", symbol: "009150" },
  { name: "한화에어로스페이스", symbol: "012450" },
];

const NASDAQ_UNIVERSE = [
  { name: "Apple", symbol: "AAPL" },
  { name: "Microsoft", symbol: "MSFT" },
  { name: "NVIDIA", symbol: "NVDA" },
  { name: "Amazon", symbol: "AMZN" },
  { name: "Alphabet A", symbol: "GOOGL" },
  { name: "Meta Platforms", symbol: "META" },
  { name: "Broadcom", symbol: "AVGO" },
  { name: "Tesla", symbol: "TSLA" },
  { name: "Costco", symbol: "COST" },
  { name: "Netflix", symbol: "NFLX" },
  { name: "Adobe", symbol: "ADBE" },
  { name: "PepsiCo", symbol: "PEP" },
  { name: "Qualcomm", symbol: "QCOM" },
  { name: "Cisco", symbol: "CSCO" },
  { name: "AMD", symbol: "AMD" },
  { name: "Intuit", symbol: "INTU" },
  { name: "Texas Instruments", symbol: "TXN" },
  { name: "Intuitive Surgical", symbol: "ISRG" },
  { name: "AstraZeneca", symbol: "AZN" },
  { name: "Palantir", symbol: "PLTR" },
  { name: "Analog Devices", symbol: "ADI" },
  { name: "Marvell", symbol: "MRVL" },
  { name: "Micron", symbol: "MU" },
  { name: "Fiserv", symbol: "FI" },
  { name: "Amgen", symbol: "AMGN" },
  { name: "Gilead Sciences", symbol: "GILD" },
  { name: "Intel", symbol: "INTC" },
  { name: "Airbnb", symbol: "ABNB" },
  { name: "Booking Holdings", symbol: "BKNG" },
  { name: "Starbucks", symbol: "SBUX" },
];

function getApiKey() {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) {
    throw new Error("Missing TWELVE_DATA_API_KEY");
  }
  return key;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Investome Vercel" },
  });

  if (!res.ok) {
    throw new Error(`Upstream failed: ${res.status}`);
  }

  return res.json();
}

async function fetchQuote({ symbol, exchange, apikey }) {
  const qs = new URLSearchParams({
    symbol,
    exchange,
    apikey,
  });

  return fetchJson(`https://api.twelvedata.com/quote?${qs.toString()}`);
}

async function fetchMarketCap({ symbol, exchange, apikey }) {
  const qs = new URLSearchParams({
    symbol,
    exchange,
    apikey,
  });

  return fetchJson(`https://api.twelvedata.com/market_cap?${qs.toString()}`);
}

async function fetchRow(item, market, apikey) {
  const exchange = market === "KOSPI" ? "XKRX" : "NASDAQ";

  const [quote, marketCap] = await Promise.all([
    fetchQuote({ symbol: item.symbol, exchange, apikey }),
    fetchMarketCap({ symbol: item.symbol, exchange, apikey }),
  ]);

  const capValue = marketCap?.market_cap?.[0]?.value;

  return {
    name: quote?.name || item.name,
    symbol: item.symbol,
    iconUrl: "",
    capKRW:
      market === "KOSPI"
        ? toNumber(capValue)
        : toNumber(capValue) != null
        ? Math.round(toNumber(capValue) * 1350)
        : null,
    priceKRW:
      market === "KOSPI"
        ? toNumber(quote?.close)
        : toNumber(quote?.close) != null
        ? Number((toNumber(quote?.close) * 1350).toFixed(2))
        : null,
    changePct: toNumber(quote?.percent_change),
  };
}

async function buildMarketRows(market) {
  const apikey = getApiKey();
  const universe = market === "KOSPI" ? KOSPI_UNIVERSE : NASDAQ_UNIVERSE;

  const rows = await Promise.all(
    universe.map((item) =>
      fetchRow(item, market, apikey).catch(() => ({
        name: item.name,
        symbol: item.symbol,
        iconUrl: "",
        capKRW: null,
        priceKRW: null,
        changePct: null,
      }))
    )
  );

  return rows
    .filter((row) => row.capKRW !== null || row.priceKRW !== null)
    .sort((a, b) => (b.capKRW ?? 0) - (a.capKRW ?? 0))
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }))
    .slice(0, 30);
}

export default async function handler(req, res) {
  try {
    const market = String(req.query?.market || "KOSPI").toUpperCase();

    if (!["KOSPI", "NASDAQ"].includes(market)) {
      res.status(400).json({ error: "market must be KOSPI or NASDAQ" });
      return;
    }

    const cached = cache.get(market);
    const now = Date.now();

    if (cached && now - cached.at < 5 * 60 * 1000) {
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      res.status(200).json({ items: cached.items });
      return;
    }

    const items = await buildMarketRows(market);

    cache.set(market, { at: now, items });

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ items });
  } catch (error) {
    res.status(500).json({
      error: String(error?.message || error),
    });
  }
}