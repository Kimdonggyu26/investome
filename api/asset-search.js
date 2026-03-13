function toArray(v) {
  return Array.isArray(v) ? v : [];
}

function uniqBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function buildStockItem(row) {
  const rawSymbol = String(row?.symbol || "").trim().toUpperCase();
  const exchange = String(row?.exchange || row?.exchDisp || "").toUpperCase();
  const quoteType = String(row?.quoteType || "").toUpperCase();
  const name = row?.shortname || row?.longname || row?.name || rawSymbol;

  if (!rawSymbol || quoteType !== "EQUITY") return null;

  if (rawSymbol.endsWith(".KS") || exchange.includes("KSE") || exchange.includes("KOSPI")) {
    return {
      market: "KOSPI",
      symbol: rawSymbol.replace(/\.KS$/i, ""),
      name,
      displayNameEN: name,
      coinId: "",
    };
  }

  if (rawSymbol.endsWith(".KQ") || exchange.includes("KOSDAQ")) {
    return {
      market: "KOSDAQ",
      symbol: rawSymbol.replace(/\.KQ$/i, ""),
      name,
      displayNameEN: name,
      coinId: "",
    };
  }

  if (
    exchange.includes("NASDAQ") ||
    exchange.includes("NYSE") ||
    exchange.includes("NMS") ||
    exchange.includes("NGM") ||
    exchange.includes("ASE")
  ) {
    return {
      market: "NASDAQ",
      symbol: rawSymbol,
      name,
      displayNameEN: name,
      coinId: "",
    };
  }

  return null;
}

async function searchStocks(q, requestedMarket) {
  const json = await fetchJson(
    "https://query1.finance.yahoo.com/v1/finance/search?" +
      new URLSearchParams({
        q,
        lang: "ko-KR",
        region: "KR",
        quotesCount: "20",
        newsCount: "0",
      }).toString()
  );

  let items = toArray(json?.quotes).map(buildStockItem).filter(Boolean);

  if (requestedMarket && requestedMarket !== "ALL") {
    items = items.filter((item) => item.market === requestedMarket);
  }

  return uniqBy(items, (item) => `${item.market}-${item.symbol}`).slice(0, 12);
}

async function searchCoins(q) {
  const json = await fetchJson(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`
  );

  return uniqBy(
    toArray(json?.coins).map((coin) => ({
      market: "CRYPTO",
      symbol: String(coin?.symbol || "").toUpperCase(),
      name: coin?.name || String(coin?.symbol || "").toUpperCase(),
      displayNameEN: coin?.name || String(coin?.symbol || "").toUpperCase(),
      coinId: coin?.id || "",
      thumb: coin?.thumb || "",
    })),
    (item) => `${item.market}-${item.coinId || item.symbol}`
  ).slice(0, 12);
}

export default async function handler(req, res) {
  const q = String(req.query?.q || "").trim();
  const market = String(req.query?.market || "ALL").trim().toUpperCase();

  if (!q) {
    res.status(200).json({ items: [] });
    return;
  }

  try {
    const tasks = [];

    if (market === "ALL" || market === "CRYPTO") {
      tasks.push(searchCoins(q));
    }

    if (market === "ALL" || market === "KOSPI" || market === "KOSDAQ" || market === "NASDAQ") {
      tasks.push(searchStocks(q, market === "ALL" ? "ALL" : market));
    }

    const items = uniqBy(
      (await Promise.allSettled(tasks))
        .filter((row) => row.status === "fulfilled")
        .flatMap((row) => row.value),
      (item) => `${item.market}-${item.coinId || item.symbol}`
    ).slice(0, 12);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json({ items });
  } catch (e) {
    res.status(502).json({
      error: "asset_search_failed",
      message: String(e?.message || e),
    });
  }
}