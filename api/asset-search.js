import koreaStocks from "../src/data/koreaStocks.json" assert { type: "json" };

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

function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
}

function fetchWithHeaders(url) {
  return fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      Accept: "application/json,text/plain,*/*",
    },
  });
}

async function fetchText(url) {
  const res = await fetchWithHeaders(url);
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

function scoreKoreaStock(item, q) {
  const keyword = normalizeText(q);
  const name = normalizeText(item.name);
  const en = normalizeText(item.displayNameEN);
  const symbol = normalizeText(item.symbol);

  if (!keyword) return -1;

  if (name === keyword) return 100;
  if (symbol === keyword) return 99;
  if (name.startsWith(keyword)) return 95;
  if (symbol.startsWith(keyword)) return 90;
  if (name.includes(keyword)) return 80;
  if (en.startsWith(keyword)) return 70;
  if (en.includes(keyword)) return 60;

  return -1;
}

function searchKoreaStocks(q, requestedMarket = "ALL") {
  const items = koreaStocks
    .filter((item) => {
      if (requestedMarket === "ALL") {
        return item.market === "KOSPI" || item.market === "KOSDAQ";
      }
      return item.market === requestedMarket;
    })
    .map((item) => ({
      ...item,
      coinId: "",
      _score: scoreKoreaStock(item, q),
    }))
    .filter((item) => item._score >= 0)
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return a.name.localeCompare(b.name, "ko");
    })
    .slice(0, 20)
    .map(({ _score, ...rest }) => rest);

  return items;
}

function buildStockItem(row) {
  const rawSymbol = String(row?.symbol || "").trim().toUpperCase();
  const exchange = String(row?.exchange || row?.exchDisp || "").toUpperCase();
  const quoteType = String(row?.quoteType || "").toUpperCase();
  const name = row?.shortname || row?.longname || row?.name || rawSymbol;

  if (!rawSymbol || quoteType !== "EQUITY") return null;

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

async function searchUsStocks(q) {
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

  return uniqBy(
    toArray(json?.quotes).map(buildStockItem).filter(Boolean),
    (item) => `${item.market}-${item.symbol}`
  ).slice(0, 12);
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
    let items = [];

    if (market === "ALL" || market === "KOSPI" || market === "KOSDAQ") {
      items.push(...searchKoreaStocks(q, market));
    }

    if (market === "ALL" || market === "NASDAQ") {
      const usItems = await searchUsStocks(q);
      items.push(...usItems);
    }

    if (market === "ALL" || market === "CRYPTO") {
      const coinItems = await searchCoins(q);
      items.push(...coinItems);
    }

    items = uniqBy(items, (item) => `${item.market}-${item.coinId || item.symbol}`).slice(0, 20);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json({ items });
  } catch (e) {
    res.status(502).json({
      error: "asset_search_failed",
      message: String(e?.message || e),
    });
  }
}