const quoteCache = new Map();

const KNOWN_STOCK_META = {
  "005930": { name: "삼성전자", displayNameEN: "Samsung Electronics", domain: "samsung.com" },
  "000660": { name: "SK하이닉스", displayNameEN: "SK hynix", domain: "skhynix.com" },
  "373220": { name: "LG에너지솔루션", displayNameEN: "LG Energy Solution", domain: "lgensol.com" },
  "207940": { name: "삼성바이오로직스", displayNameEN: "Samsung Biologics", domain: "samsungbiologics.com" },
  "005380": { name: "현대차", displayNameEN: "Hyundai Motor", domain: "hyundai.com" },
  "068270": { name: "셀트리온", displayNameEN: "Celltrion", domain: "celltrion.com" },
  "000270": { name: "기아", displayNameEN: "Kia", domain: "kia.com" },
  "105560": { name: "KB금융", displayNameEN: "KB Financial Group", domain: "kbfg.com" },
  "035420": { name: "NAVER", displayNameEN: "NAVER", domain: "navercorp.com" },
  "055550": { name: "신한지주", displayNameEN: "Shinhan Financial Group", domain: "shinhan.com" },
  AAPL: { name: "애플", displayNameEN: "Apple", domain: "apple.com" },
  MSFT: { name: "마이크로소프트", displayNameEN: "Microsoft", domain: "microsoft.com" },
  NVDA: { name: "엔비디아", displayNameEN: "NVIDIA", domain: "nvidia.com" },
  AMZN: { name: "아마존", displayNameEN: "Amazon", domain: "amazon.com" },
  GOOGL: { name: "알파벳 A", displayNameEN: "Alphabet A", domain: "google.com" },
  GOOG: { name: "알파벳 C", displayNameEN: "Alphabet C", domain: "google.com" },
  META: { name: "메타", displayNameEN: "Meta", domain: "meta.com" },
  AVGO: { name: "브로드컴", displayNameEN: "Broadcom", domain: "broadcom.com" },
  TSLA: { name: "테슬라", displayNameEN: "Tesla", domain: "tesla.com" },
  COST: { name: "코스트코", displayNameEN: "Costco", domain: "costco.com" },
  NFLX: { name: "넷플릭스", displayNameEN: "Netflix", domain: "netflix.com" },
  ADBE: { name: "어도비", displayNameEN: "Adobe", domain: "adobe.com" },
  PEP: { name: "펩시코", displayNameEN: "PepsiCo", domain: "pepsico.com" },
  QCOM: { name: "퀄컴", displayNameEN: "Qualcomm", domain: "qualcomm.com" },
  CSCO: { name: "시스코", displayNameEN: "Cisco", domain: "cisco.com" },
  AMD: { name: "AMD", displayNameEN: "AMD", domain: "amd.com" },
  INTU: { name: "인튜이트", displayNameEN: "Intuit", domain: "intuit.com" },
  TXN: { name: "텍사스인스트루먼트", displayNameEN: "Texas Instruments", domain: "ti.com" },
  ISRG: { name: "인튜이티브서지컬", displayNameEN: "Intuitive Surgical", domain: "intuitive.com" },
  AZN: { name: "아스트라제네카", displayNameEN: "AstraZeneca", domain: "astrazeneca.com" },
  PLTR: { name: "팔란티어", displayNameEN: "Palantir", domain: "palantir.com" },
  ADI: { name: "아날로그디바이스", displayNameEN: "Analog Devices", domain: "analog.com" },
  MRVL: { name: "마벨", displayNameEN: "Marvell", domain: "marvell.com" },
  MU: { name: "마이크론", displayNameEN: "Micron", domain: "micron.com" },
  FI: { name: "파이서브", displayNameEN: "Fiserv", domain: "fiserv.com" },
  AMGN: { name: "암젠", displayNameEN: "Amgen", domain: "amgen.com" },
  GILD: { name: "길리어드", displayNameEN: "Gilead", domain: "gilead.com" },
  INTC: { name: "인텔", displayNameEN: "Intel", domain: "intel.com" },
  ABNB: { name: "에어비앤비", displayNameEN: "Airbnb", domain: "airbnb.com" },
  BKNG: { name: "부킹홀딩스", displayNameEN: "Booking Holdings", domain: "bookingholdings.com" },
  SBUX: { name: "스타벅스", displayNameEN: "Starbucks", domain: "starbucks.com" },
};

const KNOWN_COIN_META = {
  BTC: { coinId: "bitcoin", name: "비트코인", displayNameEN: "Bitcoin" },
  ETH: { coinId: "ethereum", name: "이더리움", displayNameEN: "Ethereum" },
  XRP: { coinId: "ripple", name: "리플", displayNameEN: "Ripple" },
  SOL: { coinId: "solana", name: "솔라나", displayNameEN: "Solana" },
  BNB: { coinId: "binancecoin", name: "비앤비", displayNameEN: "BNB" },
  DOGE: { coinId: "dogecoin", name: "도지코인", displayNameEN: "Dogecoin" },
  ADA: { coinId: "cardano", name: "에이다", displayNameEN: "Cardano" },
  TRX: { coinId: "tron", name: "트론", displayNameEN: "TRON" },
  AVAX: { coinId: "avalanche-2", name: "아발란체", displayNameEN: "Avalanche" },
  LINK: { coinId: "chainlink", name: "체인링크", displayNameEN: "Chainlink" },
};

const UPBIT_MARKET_BY_SYMBOL = {
  BTC: "KRW-BTC",
  ETH: "KRW-ETH",
  XRP: "KRW-XRP",
  SOL: "KRW-SOL",
  DOGE: "KRW-DOGE",
  ADA: "KRW-ADA",
  TRX: "KRW-TRX",
  AVAX: "KRW-AVAX",
  LINK: "KRW-LINK",
};

const COMMODITY_INFO_MAP = {
  "GC=F": { name: "Gold", displayNameEN: "Gold Futures", iconType: "gold" },
  "SI=F": { name: "Silver", displayNameEN: "Silver Futures", iconType: "silver" },
  "CL=F": { name: "WTI Oil", displayNameEN: "WTI Crude Oil Futures", iconType: "oil" },
  "BZ=F": { name: "Brent Oil", displayNameEN: "Brent Crude Oil Futures", iconType: "brent" },
  "NG=F": { name: "Natural Gas", displayNameEN: "Natural Gas Futures", iconType: "gas" },
  "PL=F": { name: "Platinum", displayNameEN: "Platinum Futures", iconType: "platinum" },
  "PA=F": { name: "Palladium", displayNameEN: "Palladium Futures", iconType: "palladium" },
};

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

function pickKnownStockMeta(symbol) {
  return KNOWN_STOCK_META[String(symbol || "").trim().toUpperCase()] || null;
}

function pickKnownStockDomain(symbol) {
  return pickKnownStockMeta(symbol)?.domain || "";
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
  const knownMeta = pickKnownStockMeta(rawSymbol);
  const displayNameEN =
    knownMeta?.displayNameEN || info?.shortName || name || rawSymbol;
  const displayNameKR = knownMeta?.name || name || displayNameEN;
  const domain = knownMeta?.domain || pickKnownStockDomain(rawSymbol);

  return {
    market,
    symbol: rawSymbol,
    name: displayNameKR,
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

async function fetchCommodityItem({ symbol, name }) {
  const normalized = String(symbol || "").trim().toUpperCase();
  const usdKrw = await fetchUsdKrw();

  let quote = null;
  try {
    quote = await fetchYahooQuote(normalized);
  } catch {
    quote = null;
  }

  let info = null;

  if (quote) {
    info = {
      shortName: quote.longName || quote.shortName || name || normalized,
      price: toNumber(quote.regularMarketPrice),
      changePct: toNumber(quote.regularMarketChangePercent),
      marketCap: null,
    };
  }

  if (info?.price == null || info?.changePct == null) {
    const fallback = await fetchYahooChartMeta(normalized);
    info = {
      shortName: info?.shortName || fallback.shortName || name || normalized,
      price: info?.price ?? fallback.price,
      changePct: info?.changePct ?? fallback.changePct,
      marketCap: null,
    };
  }

  if (info?.price == null) {
    throw new Error(`Price not found for ${normalized}`);
  }

  const meta = COMMODITY_INFO_MAP[normalized] || {};

  return {
    market: "COMMODITIES",
    symbol: normalized,
    name: meta.name || name || normalized,
    displayNameEN: meta.displayNameEN || info?.shortName || name || normalized,
    iconUrl: buildCommodityIcon(meta.iconType, meta.name || name || normalized),
    coinId: "",
    capKRW: null,
    priceKRW: Number((info.price * usdKrw).toFixed(2)),
    changePct: info?.changePct ?? null,
  };
}

async function fetchUpbitTicker(symbol) {
  const market = UPBIT_MARKET_BY_SYMBOL[String(symbol || "").trim().toUpperCase()];
  if (!market) return null;

  const rows = await fetchJson(
    `https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(market)}`
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;

  return {
    priceKRW: toNumber(row.trade_price),
    changePct:
      toNumber(row.signed_change_rate) != null
        ? Number((toNumber(row.signed_change_rate) * 100).toFixed(2))
        : null,
  };
}

async function fetchCryptoItem({ symbol, name, coinId }) {
  const rawSymbol = String(symbol || "").trim().toUpperCase();
  const knownMeta = KNOWN_COIN_META[rawSymbol] || null;

  let resolvedId =
    String(coinId || "").trim().toLowerCase() ||
    String(knownMeta?.coinId || "").trim().toLowerCase();

  if (!resolvedId) {
    const query = name || rawSymbol;
    const searchJson = await fetchJson(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );

    const candidate = pickCoinCandidate(searchJson, rawSymbol, name, coinId);

    if (!candidate?.id) {
      throw new Error("CoinGecko coin id not found");
    }

    resolvedId = candidate.id;
  }

  try {
    const markets = await fetchJson(
      "https://api.coingecko.com/api/v3/coins/markets" +
        `?vs_currency=krw&ids=${encodeURIComponent(resolvedId)}` +
        "&sparkline=false&price_change_percentage=24h"
    );

    const row = Array.isArray(markets) ? markets[0] : null;

    if (row) {
      return {
        market: "CRYPTO",
        symbol: String(row.symbol || rawSymbol || "").toUpperCase(),
        name: knownMeta?.name || row.name || name || rawSymbol,
        displayNameEN: knownMeta?.displayNameEN || row.name || name || rawSymbol,
        iconUrl: row.image || "",
        coinId: row.id || resolvedId,
        capKRW: toNumber(row.market_cap),
        priceKRW: toNumber(row.current_price),
        changePct: toNumber(row.price_change_percentage_24h),
      };
    }
  } catch {}

  try {
    const simple = await fetchJson(
      "https://api.coingecko.com/api/v3/simple/price" +
        `?ids=${encodeURIComponent(resolvedId)}` +
        "&vs_currencies=krw&include_24hr_change=true&include_market_cap=true"
    );

    const row = simple?.[resolvedId];
    if (row?.krw != null) {
      return {
        market: "CRYPTO",
        symbol: rawSymbol,
        name: knownMeta?.name || name || rawSymbol,
        displayNameEN: knownMeta?.displayNameEN || name || rawSymbol,
        iconUrl: "",
        coinId: resolvedId,
        capKRW: toNumber(row.krw_market_cap),
        priceKRW: toNumber(row.krw),
        changePct: toNumber(row.krw_24h_change),
      };
    }
  } catch {}

  const upbit = await fetchUpbitTicker(rawSymbol);

  if (upbit?.priceKRW != null) {
    return {
      market: "CRYPTO",
      symbol: rawSymbol,
      name: knownMeta?.name || name || rawSymbol,
      displayNameEN: knownMeta?.displayNameEN || name || rawSymbol,
      iconUrl: "",
      coinId: resolvedId,
      capKRW: null,
      priceKRW: upbit.priceKRW,
      changePct: upbit.changePct,
    };
  }

  throw new Error(`Crypto price not found for ${rawSymbol}`);
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
    } else if (market === "COMMODITIES") {
      item = await fetchCommodityItem({ symbol, name });
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