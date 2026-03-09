let tickerCache = { at: 0, data: null };

async function fetchJson(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      Accept: "application/json,text/plain,*/*",
    },
  });

  if (!r.ok) {
    throw new Error(`Upstream failed: ${r.status}`);
  }

  return r.json();
}

async function fetchCrypto() {
  const url =
    "https://api.coingecko.com/api/v3/simple/price" +
    "?ids=bitcoin,ethereum,ripple" +
    "&vs_currencies=krw" +
    "&include_24hr_change=true";

  return fetchJson(url);
}

async function fetchIndexes() {
  const url =
    "https://query1.finance.yahoo.com/v7/finance/quote" +
    "?symbols=%5EKS11,%5EIXIC";

  const json = await fetchJson(url);
  const rows = json?.quoteResponse?.result || [];

  const kospi = rows.find((x) => x.symbol === "^KS11");
  const nasdaq = rows.find((x) => x.symbol === "^IXIC");

  return {
    KOSPI: {
      price:
        typeof kospi?.regularMarketPrice === "number"
          ? kospi.regularMarketPrice
          : null,
      changePct:
        typeof kospi?.regularMarketChangePercent === "number"
          ? kospi.regularMarketChangePercent
          : null,
    },
    NASDAQ: {
      price:
        typeof nasdaq?.regularMarketPrice === "number"
          ? nasdaq.regularMarketPrice
          : null,
      changePct:
        typeof nasdaq?.regularMarketChangePercent === "number"
          ? nasdaq.regularMarketChangePercent
          : null,
    },
  };
}

export default async function handler(_req, res) {
  try {
    const now = Date.now();

    if (tickerCache.data && now - tickerCache.at < 15000) {
      res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
      res.status(200).json(tickerCache.data);
      return;
    }

    const [cryptoResult, indexResult] = await Promise.allSettled([
      fetchCrypto(),
      fetchIndexes(),
    ]);

    const crypto =
      cryptoResult.status === "fulfilled"
        ? cryptoResult.value
        : tickerCache.data || {};

    const indexes =
      indexResult.status === "fulfilled"
        ? indexResult.value
        : tickerCache.data?.indexes || {
            KOSPI: { price: null, changePct: null },
            NASDAQ: { price: null, changePct: null },
          };

    const data = {
      bitcoin: crypto.bitcoin || null,
      ethereum: crypto.ethereum || null,
      ripple: crypto.ripple || null,
      indexes,
    };

    tickerCache = { at: now, data };

    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
    res.status(200).json(data);
  } catch (e) {
    if (tickerCache.data) {
      res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
      res.status(200).json(tickerCache.data);
      return;
    }

    res.status(500).json({ error: String(e) });
  }
}