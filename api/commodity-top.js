let commodityTopCache = { at: 0, data: null };

const COMMODITY_UNIVERSE = [
  {
    rank: 1,
    name: "금",
    displayNameEN: "Gold · Gold Futures",
    symbol: "GC=F",
    iconType: "gold",
  },
  {
    rank: 2,
    name: "은",
    displayNameEN: "Silver · Silver Futures",
    symbol: "SI=F",
    iconType: "silver",
  },
  {
    rank: 3,
    name: "WTI",
    displayNameEN: "미국 기준 원유 · WTI Crude Oil Futures",
    symbol: "CL=F",
    iconType: "oil",
  },
  {
    rank: 4,
    name: "Brent",
    displayNameEN: "유럽 기준 원유 · Brent Crude Oil Futures",
    symbol: "BZ=F",
    iconType: "brent",
  },
  {
    rank: 5,
    name: "천연가스",
    displayNameEN: "Natural Gas · Natural Gas Futures",
    symbol: "NG=F",
    iconType: "gas",
  },
  {
    rank: 6,
    name: "백금",
    displayNameEN: "Platinum · Platinum Futures",
    symbol: "PL=F",
    iconType: "platinum",
  },
  {
    rank: 7,
    name: "팔라듐",
    displayNameEN: "Palladium · Palladium Futures",
    symbol: "PA=F",
    iconType: "palladium",
  },
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function svgDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildCommodityIcon(type, label) {
  const map = {
    gold: { c1: "#facc15", c2: "#f59e0b", text: "G" },
    silver: { c1: "#e5e7eb", c2: "#94a3b8", text: "S" },
    oil: { c1: "#38bdf8", c2: "#1d4ed8", text: "W" },
    brent: { c1: "#0ea5e9", c2: "#2563eb", text: "B" },
    gas: { c1: "#22c55e", c2: "#0f766e", text: "N" },
    platinum: { c1: "#cbd5e1", c2: "#64748b", text: "P" },
    palladium: { c1: "#d8b4fe", c2: "#7c3aed", text: "P" },
  };

  const item = map[type] || map.gold;
  const safeText = String(label || item.text || "?").trim().slice(0, 1).toUpperCase() || item.text;

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${item.c1}" />
          <stop offset="100%" stop-color="${item.c2}" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#g)" />
      <circle cx="40" cy="40" r="35.5" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />
      <text x="40" y="46" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="white">
        ${safeText}
      </text>
    </svg>
  `);
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
          iconUrl: buildCommodityIcon(item.iconType, item.name),
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
        iconUrl: buildCommodityIcon(fallback.iconType, fallback.name),
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