let commodityTopCache = { at: 0, data: null };

const COMMODITY_UNIVERSE = [
  {
    rank: 1,
    name: "Gold",
    displayNameEN: "Gold Futures",
    symbol: "GC=F",
    iconType: "gold",
  },
  {
    rank: 2,
    name: "Silver",
    displayNameEN: "Silver Futures",
    symbol: "SI=F",
    iconType: "silver",
  },
  {
    rank: 3,
    name: "WTI Crude",
    displayNameEN: "WTI Crude Oil Futures",
    symbol: "CL=F",
    iconType: "oil",
  },
  {
    rank: 4,
    name: "Brent Crude",
    displayNameEN: "Brent Crude Oil Futures",
    symbol: "BZ=F",
    iconType: "brent",
  },
  {
    rank: 5,
    name: "Natural Gas",
    displayNameEN: "Natural Gas Futures",
    symbol: "NG=F",
    iconType: "gas",
  },
  {
    rank: 6,
    name: "Platinum",
    displayNameEN: "Platinum Futures",
    symbol: "PL=F",
    iconType: "platinum",
  },
  {
    rank: 7,
    name: "Palladium",
    displayNameEN: "Palladium Futures",
    symbol: "PA=F",
    iconType: "palladium",
  },
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getCommodityIconPath(symbol) {
  const map = {
    "GC=F": "/icons/commodities/gold.png",
    "SI=F": "/icons/commodities/silver.png",
    "CL=F": "/icons/commodities/oil.png",
    "BZ=F": "/icons/commodities/brent.png",
    "NG=F": "/icons/commodities/gas.png",
    "PL=F": "/icons/commodities/platinum.png",
    "PA=F": "/icons/commodities/palladium.png",
  };

  return map[String(symbol || "").toUpperCase()] || "";
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
    throw new Error(`Upstream failed: ${res.status} ${text.slice(0, 180)}`);
  }

  return text;
}

async function fetchJson(url) {
  const text = await fetchText(url);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 180)}`);
  }
}

async function fetchUsdKrw() {
  try {
    const json = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=KRW");
    return toNumber(json?.rates?.KRW) || 1350;
  } catch {
    return 1350;
  }
}

async function fetchYahooQuote(symbol) {
  const url =
    "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
    encodeURIComponent(symbol);

  const json = await fetchJson(url);
  return json?.quoteResponse?.result?.[0] || null;
}

async function fetchYahooChartMeta(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&range=5d&includePrePost=false`;

  const json = await fetchJson(url);
  const meta = json?.chart?.result?.[0]?.meta || null;

  if (!meta) {
    throw new Error(`No chart meta for ${symbol}`);
  }

  const price = toNumber(meta.regularMarketPrice);
  const prevClose = toNumber(meta.previousClose ?? meta.chartPreviousClose);

  return {
    price,
    changePct:
      price != null && prevClose != null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null,
  };
}

async function fetchCommodity(symbol) {
  let quote = null;

  try {
    quote = await fetchYahooQuote(symbol);
  } catch {
    quote = null;
  }

  const quotePrice = toNumber(quote?.regularMarketPrice);
  const quotePct = toNumber(quote?.regularMarketChangePercent);

  if (quotePrice != null && quotePct != null) {
    return {
      price: quotePrice,
      changePct: quotePct,
    };
  }

  const fallback = await fetchYahooChartMeta(symbol);

  if (fallback.price == null) {
    throw new Error(`Commodity price missing: ${symbol}`);
  }

  return {
    price: fallback.price,
    changePct: fallback.changePct,
  };
}

export default async function handler(_req, res) {
  try {
    const now = Date.now();

    if (commodityTopCache.data && now - commodityTopCache.at < 20_000) {
      res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
      res.status(200).json({ items: commodityTopCache.data });
      return;
    }

    const usdKrw = await fetchUsdKrw();

    const settled = await Promise.allSettled(
      COMMODITY_UNIVERSE.map(async (item) => {
        const quote = await fetchCommodity(item.symbol);

        return {
          rank: item.rank,
          market: "COMMODITIES",
          name: item.name,
          displayNameEN: item.displayNameEN,
          symbol: item.symbol,
          iconUrl: getCommodityIconPath(item.symbol),
          coinId: "",
          capKRW: null,
          priceKRW:
            quote.price != null
              ? Number((quote.price * usdKrw).toFixed(2))
              : null,
          changePct: quote.changePct ?? null,
        };
      })
    );

    const items = settled.map((result, index) => {
      if (result.status === "fulfilled") return result.value;

      const fallback = COMMODITY_UNIVERSE[index];
      return {
        rank: fallback.rank,
        market: "COMMODITIES",
        name: fallback.name,
        displayNameEN: fallback.displayNameEN,
        symbol: fallback.symbol,
        iconUrl: getCommodityIconPath(fallback.symbol),
        coinId: "",
        capKRW: null,
        priceKRW: null,
        changePct: null,
      };
    });

    commodityTopCache = { at: now, data: items };

    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({
      error: "commodity_top_failed",
      message: String(e?.message || e),
    });
  }
}
