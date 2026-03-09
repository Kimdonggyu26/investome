const cache = new Map();

const KOSPI_UNIVERSE = [
  { name: "삼성전자", symbol: "005930", yahoo: "005930.KS", fallbackCapKRW: 450000000000000 },
  { name: "SK하이닉스", symbol: "000660", yahoo: "000660.KS", fallbackCapKRW: 180000000000000 },
  { name: "LG에너지솔루션", symbol: "373220", yahoo: "373220.KS", fallbackCapKRW: 90000000000000 },
  { name: "삼성바이오로직스", symbol: "207940", yahoo: "207940.KS", fallbackCapKRW: 75000000000000 },
  { name: "현대차", symbol: "005380", yahoo: "005380.KS", fallbackCapKRW: 65000000000000 },
  { name: "셀트리온", symbol: "068270", yahoo: "068270.KS", fallbackCapKRW: 42000000000000 },
  { name: "기아", symbol: "000270", yahoo: "000270.KS", fallbackCapKRW: 41000000000000 },
  { name: "KB금융", symbol: "105560", yahoo: "105560.KS", fallbackCapKRW: 39000000000000 },
  { name: "NAVER", symbol: "035420", yahoo: "035420.KS", fallbackCapKRW: 32000000000000 },
  { name: "신한지주", symbol: "055550", yahoo: "055550.KS", fallbackCapKRW: 30000000000000 },
  { name: "POSCO홀딩스", symbol: "005490", yahoo: "005490.KS", fallbackCapKRW: 29000000000000 },
  { name: "삼성SDI", symbol: "006400", yahoo: "006400.KS", fallbackCapKRW: 28000000000000 },
  { name: "카카오", symbol: "035720", yahoo: "035720.KS", fallbackCapKRW: 25000000000000 },
  { name: "LG화학", symbol: "051910", yahoo: "051910.KS", fallbackCapKRW: 24000000000000 },
  { name: "삼성물산", symbol: "028260", yahoo: "028260.KS", fallbackCapKRW: 23000000000000 },
  { name: "하나금융지주", symbol: "086790", yahoo: "086790.KS", fallbackCapKRW: 22000000000000 },
  { name: "한국전력", symbol: "015760", yahoo: "015760.KS", fallbackCapKRW: 21000000000000 },
  { name: "HD현대중공업", symbol: "329180", yahoo: "329180.KS", fallbackCapKRW: 20000000000000 },
  { name: "메리츠금융지주", symbol: "138040", yahoo: "138040.KS", fallbackCapKRW: 19000000000000 },
  { name: "삼성생명", symbol: "032830", yahoo: "032830.KS", fallbackCapKRW: 18000000000000 },
  { name: "크래프톤", symbol: "259960", yahoo: "259960.KS", fallbackCapKRW: 17000000000000 },
  { name: "KT&G", symbol: "033780", yahoo: "033780.KS", fallbackCapKRW: 16000000000000 },
  { name: "HMM", symbol: "011200", yahoo: "011200.KS", fallbackCapKRW: 15000000000000 },
  { name: "우리금융지주", symbol: "316140", yahoo: "316140.KS", fallbackCapKRW: 14000000000000 },
  { name: "두산에너빌리티", symbol: "034020", yahoo: "034020.KS", fallbackCapKRW: 13000000000000 },
  { name: "대한항공", symbol: "003490", yahoo: "003490.KS", fallbackCapKRW: 12000000000000 },
  { name: "LG전자", symbol: "066570", yahoo: "066570.KS", fallbackCapKRW: 11000000000000 },
  { name: "포스코퓨처엠", symbol: "003670", yahoo: "003670.KS", fallbackCapKRW: 10000000000000 },
  { name: "삼성전기", symbol: "009150", yahoo: "009150.KS", fallbackCapKRW: 9000000000000 },
  { name: "한화에어로스페이스", symbol: "012450", yahoo: "012450.KS", fallbackCapKRW: 8000000000000 },
];

const NASDAQ_UNIVERSE = [
  { name: "Apple", symbol: "AAPL", yahoo: "AAPL", fallbackCapUSD: 3400000000000 },
  { name: "Microsoft", symbol: "MSFT", yahoo: "MSFT", fallbackCapUSD: 3100000000000 },
  { name: "NVIDIA", symbol: "NVDA", yahoo: "NVDA", fallbackCapUSD: 2900000000000 },
  { name: "Amazon", symbol: "AMZN", yahoo: "AMZN", fallbackCapUSD: 2000000000000 },
  { name: "Alphabet A", symbol: "GOOGL", yahoo: "GOOGL", fallbackCapUSD: 1800000000000 },
  { name: "Meta Platforms", symbol: "META", yahoo: "META", fallbackCapUSD: 1500000000000 },
  { name: "Broadcom", symbol: "AVGO", yahoo: "AVGO", fallbackCapUSD: 700000000000 },
  { name: "Tesla", symbol: "TSLA", yahoo: "TSLA", fallbackCapUSD: 600000000000 },
  { name: "Costco", symbol: "COST", yahoo: "COST", fallbackCapUSD: 420000000000 },
  { name: "Netflix", symbol: "NFLX", yahoo: "NFLX", fallbackCapUSD: 400000000000 },
  { name: "Adobe", symbol: "ADBE", yahoo: "ADBE", fallbackCapUSD: 240000000000 },
  { name: "PepsiCo", symbol: "PEP", yahoo: "PEP", fallbackCapUSD: 230000000000 },
  { name: "Qualcomm", symbol: "QCOM", yahoo: "QCOM", fallbackCapUSD: 210000000000 },
  { name: "Cisco", symbol: "CSCO", yahoo: "CSCO", fallbackCapUSD: 200000000000 },
  { name: "AMD", symbol: "AMD", yahoo: "AMD", fallbackCapUSD: 190000000000 },
  { name: "Intuit", symbol: "INTU", yahoo: "INTU", fallbackCapUSD: 180000000000 },
  { name: "Texas Instruments", symbol: "TXN", yahoo: "TXN", fallbackCapUSD: 170000000000 },
  { name: "Intuitive Surgical", symbol: "ISRG", yahoo: "ISRG", fallbackCapUSD: 160000000000 },
  { name: "AstraZeneca", symbol: "AZN", yahoo: "AZN", fallbackCapUSD: 150000000000 },
  { name: "Palantir", symbol: "PLTR", yahoo: "PLTR", fallbackCapUSD: 140000000000 },
  { name: "Analog Devices", symbol: "ADI", yahoo: "ADI", fallbackCapUSD: 130000000000 },
  { name: "Marvell", symbol: "MRVL", yahoo: "MRVL", fallbackCapUSD: 120000000000 },
  { name: "Micron", symbol: "MU", yahoo: "MU", fallbackCapUSD: 110000000000 },
  { name: "Fiserv", symbol: "FI", yahoo: "FI", fallbackCapUSD: 100000000000 },
  { name: "Amgen", symbol: "AMGN", yahoo: "AMGN", fallbackCapUSD: 95000000000 },
  { name: "Gilead Sciences", symbol: "GILD", yahoo: "GILD", fallbackCapUSD: 90000000000 },
  { name: "Intel", symbol: "INTC", yahoo: "INTC", fallbackCapUSD: 85000000000 },
  { name: "Airbnb", symbol: "ABNB", yahoo: "ABNB", fallbackCapUSD: 80000000000 },
  { name: "Booking Holdings", symbol: "BKNG", yahoo: "BKNG", fallbackCapUSD: 78000000000 },
  { name: "Starbucks", symbol: "SBUX", yahoo: "SBUX", fallbackCapUSD: 76000000000 },
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

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      Accept: "application/json,text/plain,*/*",
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Upstream failed: ${res.status} ${text.slice(0, 120)}`);
  }

  return text;
}

async function fetchJson(url) {
  const text = await fetchText(url);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 120)}`);
  }
}

async function fetchYahooQuoteBatch(symbols) {
  const groups = chunk(symbols, 8);

  const settled = await Promise.allSettled(
    groups.map(async (group) => {
      const url =
        "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
        encodeURIComponent(group.join(","));
      const json = await fetchJson(url);
      return json?.quoteResponse?.result || [];
    })
  );

  const rows = [];
  for (const s of settled) {
    if (s.status === "fulfilled") {
      rows.push(...s.value);
    }
  }
  return rows;
}

async function fetchYahooChartMeta(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&range=5d&includePrePost=false`;

  const json = await fetchJson(url);
  const meta = json?.chart?.result?.[0]?.meta;

  if (!meta) {
    throw new Error(`No chart meta for ${symbol}`);
  }

  const price = toNumber(meta.regularMarketPrice);
  const prevClose = toNumber(meta.previousClose ?? meta.chartPreviousClose);

  return {
    shortName: meta.symbol || symbol,
    price,
    changePct:
      price != null && prevClose != null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null,
    marketCap: null,
  };
}

async function fetchUsdKrw() {
  try {
    const json = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=KRW");
    return toNumber(json?.rates?.KRW) || 1350;
  } catch {
    return 1350;
  }
}

function quoteRowToInfo(row) {
  return {
    shortName: row?.longName || row?.shortName || null,
    price: toNumber(row?.regularMarketPrice),
    changePct: toNumber(row?.regularMarketChangePercent),
    marketCap: toNumber(row?.marketCap),
  };
}

async function buildRows(universe, market) {
  const usdKrw = market === "NASDAQ" ? await fetchUsdKrw() : 1;
  const quoteRows = await fetchYahooQuoteBatch(universe.map((x) => x.yahoo));
  const quoteMap = new Map(quoteRows.map((q) => [q.symbol, q]));

  const rows = await Promise.all(
    universe.map(async (item, index) => {
      const quote = quoteMap.get(item.yahoo);
      let info = quote ? quoteRowToInfo(quote) : null;

      if (info?.price == null || info?.changePct == null) {
        try {
          const chartInfo = await fetchYahooChartMeta(item.yahoo);
          info = {
            shortName: info?.shortName || chartInfo.shortName || item.name,
            price: info?.price ?? chartInfo.price,
            changePct: info?.changePct ?? chartInfo.changePct,
            marketCap: info?.marketCap ?? chartInfo.marketCap,
          };
        } catch {
          info = info || {
            shortName: item.name,
            price: null,
            changePct: null,
            marketCap: null,
          };
        }
      }

      const rawPrice = info?.price;
      const rawCap = info?.marketCap;

      return {
        rank: index + 1,
        name: info?.shortName || item.name,
        symbol: item.symbol,
        iconUrl: "",
        capKRW:
          market === "NASDAQ"
            ? rawCap != null
              ? Math.round(rawCap * usdKrw)
              : Math.round(item.fallbackCapUSD * usdKrw)
            : rawCap != null
            ? Math.round(rawCap)
            : item.fallbackCapKRW,
        priceKRW:
          market === "NASDAQ"
            ? rawPrice != null
              ? Number((rawPrice * usdKrw).toFixed(2))
              : null
            : rawPrice != null
            ? Number(rawPrice.toFixed(2))
            : null,
        changePct: info?.changePct ?? null,
      };
    })
  );

  return rows
    .filter((row) => row.priceKRW != null || row.capKRW != null)
    .sort((a, b) => (b.capKRW ?? 0) - (a.capKRW ?? 0))
    .map((row, index) => ({ ...row, rank: index + 1 }))
    .slice(0, 30);
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
      res.status(200).json({ items: cached.items, stale: false });
      return;
    }

    const universe = market === "KOSPI" ? KOSPI_UNIVERSE : NASDAQ_UNIVERSE;
    const items = await buildRows(universe, market);

    if (items.length > 0) {
      cache.set(market, { at: now, items });
      res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
      res.status(200).json({ items, stale: false });
      return;
    }

    if (cached?.items?.length) {
      res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
      res.status(200).json({ items: cached.items, stale: true });
      return;
    }

    res.status(200).json({
      items: [],
      stale: true,
      error: `${market} 데이터를 가져오지 못했습니다.`,
    });
  } catch (error) {
    const cached = cache.get(market);

    if (cached?.items?.length) {
      res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
      res.status(200).json({ items: cached.items, stale: true });
      return;
    }

    res.status(200).json({
      items: [],
      stale: true,
      error: String(error?.message || error),
    });
  }
}