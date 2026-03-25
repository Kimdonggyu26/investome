import fs from "fs";
import path from "path";

const koreaStocks = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src", "data", "koreaStocks.json"), "utf8")
);

const KNOWN_US_STOCKS = {
  AAPL: { name: "애플", displayNameEN: "Apple" },
  MSFT: { name: "마이크로소프트", displayNameEN: "Microsoft" },
  NVDA: { name: "엔비디아", displayNameEN: "NVIDIA" },
  AMZN: { name: "아마존", displayNameEN: "Amazon" },
  GOOGL: { name: "알파벳 A", displayNameEN: "Alphabet A" },
  GOOG: { name: "알파벳 C", displayNameEN: "Alphabet C" },
  META: { name: "메타", displayNameEN: "Meta" },
  AVGO: { name: "브로드컴", displayNameEN: "Broadcom" },
  TSLA: { name: "테슬라", displayNameEN: "Tesla" },
  COST: { name: "코스트코", displayNameEN: "Costco" },
  NFLX: { name: "넷플릭스", displayNameEN: "Netflix" },
  ADBE: { name: "어도비", displayNameEN: "Adobe" },
  PEP: { name: "펩시코", displayNameEN: "PepsiCo" },
  QCOM: { name: "퀄컴", displayNameEN: "Qualcomm" },
  CSCO: { name: "시스코", displayNameEN: "Cisco" },
  AMD: { name: "AMD", displayNameEN: "AMD" },
  INTU: { name: "인튜이트", displayNameEN: "Intuit" },
  TXN: { name: "텍사스인스트루먼트", displayNameEN: "Texas Instruments" },
  ISRG: { name: "인튜이티브서지컬", displayNameEN: "Intuitive Surgical" },
  AZN: { name: "아스트라제네카", displayNameEN: "AstraZeneca" },
  PLTR: { name: "팔란티어", displayNameEN: "Palantir" },
  ADI: { name: "아날로그디바이스", displayNameEN: "Analog Devices" },
  MRVL: { name: "마벨", displayNameEN: "Marvell" },
  MU: { name: "마이크론", displayNameEN: "Micron" },
  FI: { name: "파이서브", displayNameEN: "Fiserv" },
  AMGN: { name: "암젠", displayNameEN: "Amgen" },
  GILD: { name: "길리어드", displayNameEN: "Gilead" },
  INTC: { name: "인텔", displayNameEN: "Intel" },
  ABNB: { name: "에어비앤비", displayNameEN: "Airbnb" },
  BKNG: { name: "부킹홀딩스", displayNameEN: "Booking Holdings" },
  SBUX: { name: "스타벅스", displayNameEN: "Starbucks" },
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

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      Accept: "application/json,text/plain,*/*",
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Upstream failed: ${res.status} ${text.slice(0, 200)}`);
  }

  return text;
}

async function fetchJson(url) {
  const text = await fetchText(url);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
  }
}

function scoreKoreaStock(item, q) {
  const keyword = normalizeText(q);
  const name = normalizeText(item.name);
  const en = normalizeText(item.displayNameEN);
  const symbol = normalizeText(item.symbol);

  if (!keyword) return -1;

  if (name === keyword) return 1000;
  if (symbol === keyword) return 990;
  if (name.startsWith(keyword)) return 900;
  if (symbol.startsWith(keyword)) return 850;
  if (name.includes(keyword)) return 700;
  if (en.startsWith(keyword)) return 500;
  if (en.includes(keyword)) return 400;

  return -1;
}

function searchKoreaStocks(q, requestedMarket = "ALL") {
  return koreaStocks
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
      if (a.name.length !== b.name.length) return a.name.length - b.name.length;
      return a.name.localeCompare(b.name, "ko");
    })
    .slice(0, 50)
    .map(({ _score, ...rest }) => rest);
}

function buildUsStockItem(row) {
  const rawSymbol = String(row?.symbol || "").trim().toUpperCase();
  const exchange = String(row?.exchange || row?.exchDisp || "").toUpperCase();
  const quoteType = String(row?.quoteType || "").toUpperCase();
  const known = KNOWN_US_STOCKS[rawSymbol] || null;
  const name = known?.name || row?.shortname || row?.longname || row?.name || rawSymbol;
  const displayNameEN =
    known?.displayNameEN || row?.longname || row?.shortname || row?.name || rawSymbol;

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
      displayNameEN,
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
    toArray(json?.quotes).map(buildUsStockItem).filter(Boolean),
    (item) => `${item.market}-${item.symbol}`
  ).slice(0, 15);
}

async function searchCoins(q) {
  const json = await fetchJson(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`
  );

  return uniqBy(
    toArray(json?.coins).map((coin) => {
      const rawSymbol = String(coin?.symbol || "").toUpperCase();
      const known = KNOWN_COIN_META[rawSymbol] || null;

      return {
        market: "CRYPTO",
        symbol: rawSymbol,
        name: known?.name || coin?.name || rawSymbol,
        displayNameEN: known?.displayNameEN || coin?.name || rawSymbol,
        coinId: coin?.id || known?.coinId || "",
        thumb: coin?.thumb || "",
      };
    }),
    (item) => `${item.market}-${item.coinId || item.symbol}`
  ).slice(0, 15);
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

    if (q.length >= 2) {
      if (market === "ALL" || market === "NASDAQ") {
        try {
          const usItems = await searchUsStocks(q);
          items.push(...usItems);
        } catch (e) {
          console.error("NASDAQ search skipped:", e.message);
        }
      }

      if (market === "ALL" || market === "CRYPTO") {
        try {
          const coinItems = await searchCoins(q);
          items.push(...coinItems);
        } catch (e) {
          console.error("CRYPTO search skipped:", e.message);
        }
      }
    }

    items = uniqBy(items, (item) => `${item.market}-${item.coinId || item.symbol}`).slice(0, 50);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json({ items });
  } catch (e) {
    res.status(502).json({
      error: "asset_search_failed",
      message: String(e?.message || e),
    });
  }
}