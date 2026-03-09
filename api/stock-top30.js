const cache = new Map();

const KOSPI_UNIVERSE = [
  { name: "삼성전자", symbol: "005930", yahoo: "005930.KS" },
  { name: "SK하이닉스", symbol: "000660", yahoo: "000660.KS" },
  { name: "LG에너지솔루션", symbol: "373220", yahoo: "373220.KS" },
  { name: "삼성바이오로직스", symbol: "207940", yahoo: "207940.KS" },
  { name: "현대차", symbol: "005380", yahoo: "005380.KS" },
  { name: "셀트리온", symbol: "068270", yahoo: "068270.KS" },
  { name: "기아", symbol: "000270", yahoo: "000270.KS" },
  { name: "KB금융", symbol: "105560", yahoo: "105560.KS" },
  { name: "NAVER", symbol: "035420", yahoo: "035420.KS" },
  { name: "신한지주", symbol: "055550", yahoo: "055550.KS" },
  { name: "POSCO홀딩스", symbol: "005490", yahoo: "005490.KS" },
  { name: "삼성SDI", symbol: "006400", yahoo: "006400.KS" },
  { name: "카카오", symbol: "035720", yahoo: "035720.KS" },
  { name: "LG화학", symbol: "051910", yahoo: "051910.KS" },
  { name: "삼성물산", symbol: "028260", yahoo: "028260.KS" },
  { name: "하나금융지주", symbol: "086790", yahoo: "086790.KS" },
  { name: "한국전력", symbol: "015760", yahoo: "015760.KS" },
  { name: "HD현대중공업", symbol: "329180", yahoo: "329180.KS" },
  { name: "메리츠금융지주", symbol: "138040", yahoo: "138040.KS" },
  { name: "삼성생명", symbol: "032830", yahoo: "032830.KS" },
  { name: "크래프톤", symbol: "259960", yahoo: "259960.KS" },
  { name: "KT&G", symbol: "033780", yahoo: "033780.KS" },
  { name: "HMM", symbol: "011200", yahoo: "011200.KS" },
  { name: "우리금융지주", symbol: "316140", yahoo: "316140.KS" },
  { name: "두산에너빌리티", symbol: "034020", yahoo: "034020.KS" },
  { name: "대한항공", symbol: "003490", yahoo: "003490.KS" },
  { name: "LG전자", symbol: "066570", yahoo: "066570.KS" },
  { name: "포스코퓨처엠", symbol: "003670", yahoo: "003670.KS" },
  { name: "삼성전기", symbol: "009150", yahoo: "009150.KS" },
  { name: "한화에어로스페이스", symbol: "012450", yahoo: "012450.KS" },
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

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      "Accept": "application/json,text/plain,*/*",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstream failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function fetchYahooQuotes(symbols) {
  const groups = chunk(symbols, 8);

  const results = await Promise.allSettled(
    groups.map(async (group) => {
      const url =
        "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
        encodeURIComponent(group.join(","));

      const json = await fetchJson(url);
      return json?.quoteResponse?.result || [];
    })
  );

  const rows = [];
  const errors = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      rows.push(...r.value);
    } else {
      errors.push(String(r.reason?.message || r.reason || "unknown error"));
    }
  }

  return { rows, errors };
}

async function fetchUsdKrw() {
  try {
    const { rows } = await fetchYahooQuotes(["KRW=X"]);
    const fx = rows[0];
    return toNumber(fx?.regularMarketPrice) || 1350;
  } catch {
    return 1350;
  }
}

function mapKospiRow(item, quote, index) {
  return {
    rank: index + 1,
    name: quote?.longName || quote?.shortName || item.name,
    symbol: item.symbol,
    iconUrl: "",
    capKRW: toNumber(quote?.marketCap),
    priceKRW: toNumber(quote?.regularMarketPrice),
    changePct: toNumber(quote?.regularMarketChangePercent),
  };
}

function mapNasdaqRow(item, quote, usdKrw, index) {
  const usdPrice = toNumber(quote?.regularMarketPrice);
  const usdCap = toNumber(quote?.marketCap);

  return {
    rank: index + 1,
    name: quote?.longName || quote?.shortName || item.name,
    symbol: item.symbol,
    iconUrl: "",
    capKRW: usdCap != null ? Math.round(usdCap * usdKrw) : null,
    priceKRW: usdPrice != null ? Number((usdPrice * usdKrw).toFixed(2)) : null,
    changePct: toNumber(quote?.regularMarketChangePercent),
  };
}

async function fetchKospiRows() {
  const { rows, errors } = await fetchYahooQuotes(KOSPI_UNIVERSE.map((x) => x.yahoo));
  const quoteMap = new Map(rows.map((q) => [q.symbol, q]));

  const items = KOSPI_UNIVERSE.map((item, index) =>
    mapKospiRow(item, quoteMap.get(item.yahoo), index)
  )
    .filter((row) => row.priceKRW !== null || row.capKRW !== null)
    .sort((a, b) => (b.capKRW ?? 0) - (a.capKRW ?? 0))
    .map((row, index) => ({ ...row, rank: index + 1 }))
    .slice(0, 30);

  return { items, errors };
}

async function fetchNasdaqRows() {
  const [usdKrw, quoteResult] = await Promise.all([
    fetchUsdKrw(),
    fetchYahooQuotes(NASDAQ_UNIVERSE.map((x) => x.symbol)),
  ]);

  const { rows, errors } = quoteResult;
  const quoteMap = new Map(rows.map((q) => [q.symbol, q]));

  const items = NASDAQ_UNIVERSE.map((item, index) =>
    mapNasdaqRow(item, quoteMap.get(item.symbol), usdKrw, index)
  )
    .filter((row) => row.priceKRW !== null || row.capKRW !== null)
    .sort((a, b) => (b.capKRW ?? 0) - (a.capKRW ?? 0))
    .map((row, index) => ({ ...row, rank: index + 1 }))
    .slice(0, 30);

  return { items, errors };
}

export default async function handler(req, res) {
  const market = String(req.query?.market || "KOSPI").toUpperCase();

  if (!["KOSPI", "NASDAQ"].includes(market)) {
    res.status(400).json({ error: "market must be KOSPI or NASDAQ" });
    return;
  }

  try {
    const cached = cache.get(market);
    const now = Date.now();

    if (cached && now - cached.at < 20_000) {
      res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
      res.status(200).json({
        items: cached.items,
        stale: false,
      });
      return;
    }

    const result =
      market === "KOSPI" ? await fetchKospiRows() : await fetchNasdaqRows();

    if (result.items.length > 0) {
      cache.set(market, { at: now, items: result.items });
      res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
      res.status(200).json({
        items: result.items,
        stale: false,
      });
      return;
    }

    if (cached?.items?.length) {
      res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
      res.status(200).json({
        items: cached.items,
        stale: true,
      });
      return;
    }

    console.error(`[stock-top30] ${market} no items`, result.errors);

    res.status(200).json({
      items: [],
      stale: true,
      error: `${market} 데이터를 가져오지 못했습니다.`,
      debug: result.errors,
    });
  } catch (error) {
    const cached = cache.get(market);

    console.error(`[stock-top30] ${market} fatal`, error);

    if (cached?.items?.length) {
      res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
      res.status(200).json({
        items: cached.items,
        stale: true,
      });
      return;
    }

    res.status(200).json({
      items: [],
      stale: true,
      error: String(error?.message || error),
    });
  }
}