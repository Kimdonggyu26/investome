let commodityTopCache = { at: 0, data: null };

const COMMODITY_UNIVERSE = [
  { rank: 1, name: "Gold", displayNameEN: "Gold Futures", symbol: "GC=F", iconUrl: "" },
  { rank: 2, name: "Silver", displayNameEN: "Silver Futures", symbol: "SI=F", iconUrl: "" },
  { rank: 3, name: "WTI Oil", displayNameEN: "WTI Crude Oil Futures", symbol: "CL=F", iconUrl: "" },
  { rank: 4, name: "Brent Oil", displayNameEN: "Brent Crude Oil Futures", symbol: "BZ=F", iconUrl: "" },
  { rank: 5, name: "Natural Gas", displayNameEN: "Natural Gas Futures", symbol: "NG=F", iconUrl: "" },
  { rank: 6, name: "Platinum", displayNameEN: "Platinum Futures", symbol: "PL=F", iconUrl: "" },
  { rank: 7, name: "Palladium", displayNameEN: "Palladium Futures", symbol: "PA=F", iconUrl: "" },
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
    throw new Error(`Upstream failed: ${res.status} ${text.slice(0, 140)}`);
  }

  return text;
}

async function fetchJson(url) {
  const text = await fetchText(url);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 140)}`);
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

async function fetchCommodity(symbol) {
  const url =
    "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
    encodeURIComponent(symbol);

  const json = await fetchJson(url);
  const row = json?.quoteResponse?.result?.[0] || null;

  if (!row) {
    throw new Error(`Commodity quote not found: ${symbol}`);
  }

  return {
    price: toNumber(row?.regularMarketPrice),
    changePct: toNumber(row?.regularMarketChangePercent),
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

        if (quote.price == null) {
          throw new Error(`Commodity price missing: ${item.symbol}`);
        }

        return {
          rank: item.rank,
          market: "COMMODITIES",
          name: item.name,
          displayNameEN: item.displayNameEN,
          symbol: item.symbol,
          iconUrl: item.iconUrl,
          coinId: "",
          capKRW: null,
          priceKRW: Number((quote.price * usdKrw).toFixed(2)),
          changePct: quote.changePct,
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
        iconUrl: fallback.iconUrl,
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
    res.status(500).json({ error: String(e) });
  }
}