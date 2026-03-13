import fs from "fs";
import path from "path";

const koreaStocks = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src", "data", "koreaStocks.json"), "utf8")
);

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

      if (a.name.length !== b.name.length) {
        return a.name.length - b.name.length;
      }

      return a.name.localeCompare(b.name, "ko");
    })
    .slice(0, 50)
    .map(({ _score, ...rest }) => rest);
}

function buildUsStockItem(row) {
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
    toArray(json?.quotes).map(buildUsStockItem).filter(Boolean),
    (item) => `${item.market}-${item.symbol}`
  ).slice(0, 15);
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

    // 1) 국내주식은 항상 먼저, 무조건 내부 데이터로 검색
    if (market === "ALL" || market === "KOSPI" || market === "KOSDAQ") {
      items.push(...searchKoreaStocks(q, market));
    }

    // 2) 외부 API는 실패해도 전체 실패시키지 않음
    //    그리고 한 글자 검색에서는 굳이 안 때림
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

    items = uniqBy(
      items,
      (item) => `${item.market}-${item.coinId || item.symbol}`
    ).slice(0, 50);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json({ items });
  } catch (e) {
    res.status(502).json({
      error: "asset_search_failed",
      message: String(e?.message || e),
    });
  }
}