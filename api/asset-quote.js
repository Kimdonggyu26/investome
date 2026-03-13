const quoteCache = new Map();

function cacheKey(params) {
  return JSON.stringify(params);
}

function buildLogo(domain) {
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}`;
}

function toNumber(v) {
  const n = Number(v);
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

function normalizeSymbolByMarket(market, symbol) {
  const raw = String(symbol || "").trim().toUpperCase();

  if (market === "KOSPI") {
    return /^\d{6}$/.test(raw) ? `${raw}.KS` : raw;
  }

  if (market === "KOSDAQ") {
    return /^\d{6}$/.test(raw) ? `${raw}.KQ` : raw;
  }

  return raw;
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
  const meta = json?.chart?.result?.[0]?.meta;

  if (!meta) throw new Error(`No chart meta for ${symbol}`);

  const price = toNumber(meta.regularMarketPrice);
  const prevClose = toNumber(meta.previousClose ?? meta.chartPreviousClose);

  return {
    shortName: meta.shortName || meta.longName || meta.symbol || symbol,
    price,
    changePct:
      price != null && prevClose != null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null,
    marketCap: null,
  };
}

function pickKnownStockDomain(symbol) {
  const map = {
    "005930": "samsung.com",
    "000660": "skhynix.com",
    "035420": "navercorp.com",
    "035720": "kakaocorp.com",
    "373220": "lgensol.com",
    "091990": "celltrionhealthcare.com",
    AAPL: "apple.com",
    MSFT: "microsoft.com",
    NVDA: "nvidia.com",
    TSLA: "tesla.com",
    AMZN: "amazon.com",
    META: "meta.com",
    AMD: "amd.com",
    PLTR: "palantir.com",
    NFLX: "netflix.com",
  };

  return map[String(symbol || "").toUpperCase()] || "";
}

async function fetchStockItem({ market, symbol, name }) {
  const normalized = normalizeSymbolByMarket(market, symbol);
  const usdKrw = market === "NASDAQ" ? await fetchUsdKrw() : 1;

  let quote = null;
  try {
    quote = await fetchYahooQuote(normalized);
  } catch {
    quote = null;
  }

  let info = null;

  if (quote) {
    info = {
      shortName: quote.longName || quote.shortName || name || symbol,
      price: toNumber(quote.regularMarketPrice),
      changePct: toNumber(quote.regularMarketChangePercent),
      marketCap: toNumber(quote.marketCap),
    };
  }

  if (info?.price == null || info?.changePct == null) {
    const fallback = await fetchYahooChartMeta(normalized);
    info = {
      shortName: info?.shortName || fallback.shortName || name || symbol,
      price: info?.price ?? fallback.price,
      changePct: info?.changePct ?? fallback.changePct,
      marketCap: info?.marketCap ?? fallback.marketCap,
    };
  }

  if (info?.price == null) {
    throw new Error(`Price not found for ${normalized}`);
  }

  const rawSymbol = String(symbol || "").trim().toUpperCase();
  const displayNameEN = info?.shortName || name || rawSymbol;
  const domain = pickKnownStockDomain(rawSymbol);

  return {
    market,
    symbol: rawSymbol,
    name: name || displayNameEN,
    displayNameEN,
    iconUrl: domain ? buildLogo(domain) : "",
    coinId: "",
    capKRW:
      info?.marketCap != null
        ? market === "NASDAQ"
          ? Math.round(info.marketCap * usdKrw)
          : Math.round(info.marketCap)
        : null,
    priceKRW:
      market === "NASDAQ"
        ? Number((info.price * usdKrw).toFixed(2))
        : Number(info.price.toFixed(2)),
    changePct: info?.changePct ?? null,
  };
}

function pickCoinCandidate(searchJson, symbol, name, coinId) {
  const coins = Array.isArray(searchJson?.coins) ? searchJson.coins : [];
  const sym = String(symbol || "").trim().toLowerCase();
  const nm = String(name || "").trim().toLowerCase();
  const id = String(coinId || "").trim().toLowerCase();

  return (
    coins.find((coin) => String(coin.id || "").toLowerCase() === id) ||
    coins.find(
      (coin) =>
        String(coin.symbol || "").toLowerCase() === sym &&
        String(coin.name || "").toLowerCase() === nm
    ) ||
    coins.find((coin) => String(coin.symbol || "").toLowerCase() === sym) ||
    coins.find((coin) => String(coin.name || "").toLowerCase() === nm) ||
    coins[0] ||
    null
  );
}

async function fetchCryptoItem({ symbol, name, coinId }) {
  let resolvedId = String(coinId || "").trim().toLowerCase();

  if (!resolvedId) {
    const query = name || symbol;
    const searchJson = await fetchJson(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );

    const candidate = pickCoinCandidate(searchJson, symbol, name, coinId);

    if (!candidate?.id) {
      throw new Error("CoinGecko coin id not found");
    }

    resolvedId = candidate.id;
  }

  const markets = await fetchJson(
    "https://api.coingecko.com/api/v3/coins/markets" +
      `?vs_currency=krw&ids=${encodeURIComponent(resolvedId)}` +
      "&sparkline=false&price_change_percentage=24h"
  );

  const row = Array.isArray(markets) ? markets[0] : null;

  if (!row) {
    throw new Error("CoinGecko market row missing");
  }

  return {
    market: "CRYPTO",
    symbol: String(row.symbol || symbol || "").toUpperCase(),
    name: row.name || name || symbol,
    displayNameEN: row.name || name || symbol,
    iconUrl: row.image || "",
    coinId: row.id || resolvedId,
    capKRW: toNumber(row.market_cap),
    priceKRW: toNumber(row.current_price),
    changePct: toNumber(row.price_change_percentage_24h),
  };
}

export default async function handler(req, res) {
  const market = String(req.query?.market || "").trim().toUpperCase();
  const symbol = String(req.query?.symbol || "").trim();
  const name = String(req.query?.name || "").trim();
  const coinId = String(req.query?.coinId || "").trim();

  try {
    if (!market || !symbol) {
      res.status(400).json({ error: "market and symbol are required" });
      return;
    }

    const key = cacheKey({ market, symbol, name, coinId });
    const cached = quoteCache.get(key);
    const now = Date.now();

    if (cached && now - cached.at < 15_000) {
      res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
      res.status(200).json({ item: cached.data });
      return;
    }

    let item = null;

    if (market === "CRYPTO") {
      item = await fetchCryptoItem({ symbol, name, coinId });
    } else if (market === "KOSPI" || market === "KOSDAQ" || market === "NASDAQ") {
      item = await fetchStockItem({ market, symbol, name });
    } else {
      res.status(400).json({ error: `unsupported market: ${market}` });
      return;
    }

    quoteCache.set(key, { at: now, data: item });

    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
    res.status(200).json({ item });
  } catch (e) {
    res.status(502).json({
      error: "quote_fetch_failed",
      message: String(e?.message || e),
    });
  }
}