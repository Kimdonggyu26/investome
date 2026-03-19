const CACHE_TTL_MS = 5 * 60 * 1000;

const globalCache = globalThis.__INVESTOME_CRYPTO_TOP30_CACHE__ || {
  data: null,
  updatedAt: 0,
  inflight: null,
};

globalThis.__INVESTOME_CRYPTO_TOP30_CACHE__ = globalCache;

async function fetchJson(url, init) {
  const res = await fetch(url, init);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error = new Error(`Crypto top30 fetch failed: ${res.status}`);
    error.status = res.status;
    error.body = text;
    throw error;
  }

  return res.json();
}

async function loadCryptoTop30() {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "krw");
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", "30");
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h");

  const headers = {
    accept: "application/json",
  };

  // CoinGecko demo/pro 키가 있으면 자동 사용
  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }

  const items = await fetchJson(url.toString(), { headers });

  if (!Array.isArray(items)) {
    throw new Error("Crypto top30 fetch failed: invalid payload");
  }

  return items;
}

async function getCryptoTop30Cached() {
  const now = Date.now();
  const isFresh =
    Array.isArray(globalCache.data) &&
    globalCache.data.length > 0 &&
    now - globalCache.updatedAt < CACHE_TTL_MS;

  if (isFresh) {
    return globalCache.data;
  }

  if (globalCache.inflight) {
    return globalCache.inflight;
  }

  globalCache.inflight = loadCryptoTop30()
    .then((items) => {
      globalCache.data = items;
      globalCache.updatedAt = Date.now();
      return items;
    })
    .finally(() => {
      globalCache.inflight = null;
    });

  return globalCache.inflight;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const items = await getCryptoTop30Cached();
    return res.status(200).json(items);
  } catch (error) {
    const hasStaleCache =
      Array.isArray(globalCache.data) && globalCache.data.length > 0;

    if (hasStaleCache) {
      return res.status(200).json(globalCache.data);
    }

    return res.status(error?.status || 500).json({
      error: error?.message || "Crypto top30 fetch failed",
      stale: false,
      updatedAt: globalCache.updatedAt || null,
    });
  }
}