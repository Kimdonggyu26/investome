let tickerCache = { at: 0, data: null };

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

async function fetchCrypto() {
  const url =
    "https://api.coingecko.com/api/v3/simple/price" +
    "?ids=bitcoin,ethereum,ripple" +
    "&vs_currencies=krw" +
    "&include_24hr_change=true";

  return fetchJson(url);
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchYahooQuoteBatch(symbols) {
  const url =
    "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
    encodeURIComponent(symbols.join(","));

  const json = await fetchJson(url);
  return json?.quoteResponse?.result || [];
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
    price,
    changePct:
      price != null && prevClose != null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null,
  };
}

async function fetchIndexes() {
  const result = {
    KOSPI: { price: null, changePct: null },
    NASDAQ: { price: null, changePct: null },
  };

  try {
    const rows = await fetchYahooQuoteBatch(["^KS11", "^IXIC"]);
    const kospi = rows.find((x) => x.symbol === "^KS11");
    const nasdaq = rows.find((x) => x.symbol === "^IXIC");

    result.KOSPI = {
      price: toNumber(kospi?.regularMarketPrice),
      changePct: toNumber(kospi?.regularMarketChangePercent),
    };

    result.NASDAQ = {
      price: toNumber(nasdaq?.regularMarketPrice),
      changePct: toNumber(nasdaq?.regularMarketChangePercent),
    };
  } catch {
    // 아래 chart fallback으로 진행
  }

  if (result.KOSPI.price == null) {
    try {
      result.KOSPI = await fetchYahooChartMeta("^KS11");
    } catch {
      // noop
    }
  }

  if (result.NASDAQ.price == null) {
    try {
      result.NASDAQ = await fetchYahooChartMeta("^IXIC");
    } catch {
      // noop
    }
  }

  return result;
}

export default async function handler(_req, res) {
  try {
    const now = Date.now();

    if (tickerCache.data && now - tickerCache.at < 15_000) {
      res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
      res.status(200).json(tickerCache.data);
      return;
    }

    const [cryptoResult, indexResult] = await Promise.allSettled([
      fetchCrypto(),
      fetchIndexes(),
    ]);

    const prev = tickerCache.data || {};

    const data = {
      bitcoin:
        cryptoResult.status === "fulfilled"
          ? cryptoResult.value?.bitcoin || prev.bitcoin || null
          : prev.bitcoin || null,
      ethereum:
        cryptoResult.status === "fulfilled"
          ? cryptoResult.value?.ethereum || prev.ethereum || null
          : prev.ethereum || null,
      ripple:
        cryptoResult.status === "fulfilled"
          ? cryptoResult.value?.ripple || prev.ripple || null
          : prev.ripple || null,
      indexes:
        indexResult.status === "fulfilled"
          ? indexResult.value
          : prev.indexes || {
              KOSPI: { price: null, changePct: null },
              NASDAQ: { price: null, changePct: null },
            },
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

    res.status(500).json({ error: String(e?.message || e) });
  }
}