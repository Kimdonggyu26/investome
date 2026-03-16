import fs from "fs";
import path from "path";
import iconv from "iconv-lite";

const cache = new Map();

const RANK_TTL_MS = 6 * 60 * 60 * 1000; // 6시간
const PRICE_TTL_MS = 20 * 1000; // 20초

const FMP_API_KEY = process.env.FMP_API_KEY || "";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function buildLogo(domain) {
  return domain
    ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}`
    : "";
}

function pickStockDomain(symbol) {
  const map = {
    "005930": "samsung.com",
    "000660": "skhynix.com",
    "373220": "lgensol.com",
    "207940": "samsungbiologics.com",
    "005380": "hyundai.com",
    "068270": "celltrion.com",
    "000270": "kia.com",
    "105560": "kbfg.com",
    "035420": "navercorp.com",
    "055550": "shinhan.com",
    "005490": "posco-inc.com",
    "006400": "samsungsdi.com",
    "035720": "kakaocorp.com",
    "051910": "lgchem.com",
    "028260": "samsungcnt.com",
    "086790": "hanafn.com",
    "015760": "kepco.co.kr",
    "329180": "hd-hhi.com",
    "138040": "meritzfinancialgroup.com",
    "032830": "samsunglife.com",
    "259960": "krafton.com",
    "033780": "ktng.com",
    "011200": "hmm21.com",
    "316140": "woorifg.com",
    "034020": "doosanenerbility.com",
    "003490": "koreanair.com",
    "066570": "lge.com",
    "003670": "poscofuturem.com",
    "009150": "sem.samsung.com",
    "012450": "hanwhaaerospace.com",

    AAPL: "apple.com",
    MSFT: "microsoft.com",
    NVDA: "nvidia.com",
    AMZN: "amazon.com",
    GOOGL: "google.com",
    GOOG: "google.com",
    META: "meta.com",
    AVGO: "broadcom.com",
    TSLA: "tesla.com",
    COST: "costco.com",
    NFLX: "netflix.com",
    ADBE: "adobe.com",
    PEP: "pepsico.com",
    QCOM: "qualcomm.com",
    CSCO: "cisco.com",
    AMD: "amd.com",
    INTU: "intuit.com",
    TXN: "ti.com",
    ISRG: "intuitive.com",
    AZN: "astrazeneca.com",
    PLTR: "palantir.com",
    ADI: "analog.com",
    MRVL: "marvell.com",
    MU: "micron.com",
    FI: "fiserv.com",
    AMGN: "amgen.com",
    GILD: "gilead.com",
    INTC: "intel.com",
    ABNB: "airbnb.com",
    BKNG: "bookingholdings.com",
    SBUX: "starbucks.com",
    TMUS: "t-mobile.com",
    ASML: "asml.com",
    LIN: "linde.com",
    HON: "honeywell.com",
    MELI: "mercadolibre.com",
    PANW: "paloaltonetworks.com",
    CRWD: "crowdstrike.com",
    AMAT: "appliedmaterials.com",
    ADP: "adp.com",
    KLAC: "kla.com",
    CDNS: "cadence.com",
    SNPS: "synopsys.com",
    REGN: "regeneron.com",
    PYPL: "paypal.com",
    MAR: "marriott.com",
    CTAS: "cintas.com",
    FTNT: "fortinet.com",
  };

  return map[String(symbol || "").toUpperCase()] || "";
}

async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      Accept: "application/json,text/plain,*/*",
      ...headers,
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Upstream failed: ${res.status} ${text.slice(0, 200)}`);
  }

  return text;
}

async function fetchJson(url, headers = {}) {
  const text = await fetchText(url, headers);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
  }
}

async function fetchYahooQuoteBatch(symbols) {
  const groups = chunk(symbols, 25);

  const settled = await Promise.allSettled(
    groups.map(async (group) => {
      const url =
        "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
        encodeURIComponent(group.join(","));
      const json = await fetchJson(url);
      return json?.quoteResponse?.result || [];
    })
  );

  const rows = [];
  for (const s of settled) {
    if (s.status === "fulfilled") {
      rows.push(...s.value);
    }
  }

  return rows;
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
    shortName: meta.shortName || meta.longName || meta.symbol || symbol,
    price,
    changePct:
      price != null && prevClose != null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null,
  };
}

function quoteRowToInfo(row) {
  return {
    shortName: row?.longName || row?.shortName || null,
    price: toNumber(row?.regularMarketPrice),
    changePct: toNumber(row?.regularMarketChangePercent),
    marketCap: toNumber(row?.marketCap),
  };
}

async function fetchUsdKrw() {
  try {
    const json = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=KRW");
    return toNumber(json?.rates?.KRW) || 1350;
  } catch {
    return 1350;
  }
}

function getCacheBucket(market) {
  if (!cache.has(market)) {
    cache.set(market, {
      rankAt: 0,
      rankedItems: [],
      priceAt: 0,
      pricedItems: [],
      masterLoaded: false,
      masterItems: [],
      fxAt: 0,
      usdKrw: 1350,
    });
  }
  return cache.get(market);
}

async function getUsdKrwCached(bucket) {
  const now = Date.now();

  if (bucket.usdKrw && now - bucket.fxAt < PRICE_TTL_MS) {
    return bucket.usdKrw;
  }

  const next = await fetchUsdKrw();
  bucket.usdKrw = next || 1350;
  bucket.fxAt = now;
  return bucket.usdKrw;
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result.map((v) => v.replace(/^"(.*)"$/, "$1").trim());
}

function normalizeHeader(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, "")
    .replace(/[()_\-./]/g, "")
    .trim()
    .toLowerCase();
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = cols[idx] ?? "";
    });

    return row;
  });
}

function getByNormalizedKeys(row, candidates) {
  const normalizedMap = {};

  Object.keys(row).forEach((key) => {
    normalizedMap[normalizeHeader(key)] = row[key];
  });

  for (const key of candidates) {
    const hit = normalizedMap[normalizeHeader(key)];
    if (hit !== undefined && hit !== null && String(hit).trim() !== "") {
      return String(hit).trim();
    }
  }

  return "";
}

function normalizeSymbol(value) {
  const onlyDigits = String(value || "").replace(/\D/g, "");
  if (!onlyDigits) return "";
  return onlyDigits.padStart(6, "0");
}

function normalizeListedShares(value) {
  const n = Number(String(value || "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function readCp949Csv(filePath) {
  const buffer = fs.readFileSync(filePath);
  const text = iconv.decode(buffer, "cp949");
  return text.replace(/^\uFEFF/, "");
}

function loadKospiMaster() {
  const bucket = getCacheBucket("KOSPI");

  if (bucket.masterLoaded && bucket.masterItems.length) {
    return bucket.masterItems;
  }

  const filePath = path.join(process.cwd(), "tmp", "kospi.csv");
  const rows = parseCsv(readCp949Csv(filePath));

  const items = rows
    .map((row) => {
      const symbol = normalizeSymbol(
        getByNormalizedKeys(row, ["단축코드", "종목코드", "표준단축코드"])
      );

      const name = getByNormalizedKeys(row, ["한글종목명", "종목명", "한글 종목명"]);
      const displayNameEN = getByNormalizedKeys(row, ["영문종목명", "영문명", "영문 종목명"]);
      const stockType = getByNormalizedKeys(row, ["주식종류"]);
      const listedShares = normalizeListedShares(
        getByNormalizedKeys(row, ["상장주식수"])
      );

      if (!symbol || !name || !listedShares) return null;

      // 우선주/전환주 등 최대한 제외
      if (stockType && !stockType.includes("보통주")) return null;

      return {
        symbol,
        name,
        displayNameEN: displayNameEN || name,
        listedShares,
        yahoo: `${symbol}.KS`,
      };
    })
    .filter(Boolean);

  bucket.masterLoaded = true;
  bucket.masterItems = items;
  return items;
}

async function buildKospiRankSnapshot() {
  const universe = loadKospiMaster();
  const quoteRows = await fetchYahooQuoteBatch(universe.map((x) => x.yahoo));
  const quoteMap = new Map(quoteRows.map((q) => [q.symbol, q]));

  const rows = universe
    .map((item) => {
      const quote = quoteMap.get(item.yahoo);
      const price = toNumber(quote?.regularMarketPrice);

      if (price == null) return null;

      const capKRW = Math.round(price * item.listedShares);

      return {
        rank: 0,
        name: item.name,
        displayNameEN: item.displayNameEN,
        symbol: item.symbol,
        yahoo: item.yahoo,
        iconUrl: buildLogo(pickStockDomain(item.symbol)),
        capKRW,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.capKRW ?? 0) - (a.capKRW ?? 0))
    .slice(0, 30)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return rows;
}

async function buildNasdaqRankSnapshot() {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY is missing");
  }

  // NASDAQ 전체 대상 스크리닝 후 marketCap 기준 정렬
  // limit는 여유 있게 잡고, ETF/펀드는 제외
  const url =
    "https://financialmodelingprep.com/stable/company-screener" +
    `?exchange=NASDAQ&isEtf=false&isFund=false&limit=300&apikey=${encodeURIComponent(FMP_API_KEY)}`;

  const json = await fetchJson(url);
  const rows = Array.isArray(json) ? json : [];

  const normalized = rows
    .map((row) => {
      const symbol = String(row.symbol || "").toUpperCase().trim();
      const capUSD = toNumber(row.marketCap);

      if (!symbol || capUSD == null) return null;

      return {
        rank: 0,
        name: row.companyName || row.name || symbol,
        displayNameEN: row.companyName || row.name || symbol,
        symbol,
        yahoo: symbol,
        iconUrl: row.image || buildLogo(pickStockDomain(symbol)),
        capUSD,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.capUSD ?? 0) - (a.capUSD ?? 0))
    .slice(0, 30)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return normalized;
}

async function ensureRankSnapshot(market) {
  const bucket = getCacheBucket(market);
  const now = Date.now();

  if (bucket.rankedItems?.length && now - bucket.rankAt < RANK_TTL_MS) {
    return bucket.rankedItems;
  }

  const rankedItems =
    market === "KOSPI"
      ? await buildKospiRankSnapshot()
      : await buildNasdaqRankSnapshot();

  if (!rankedItems.length) {
    throw new Error(`${market} rank snapshot build failed`);
  }

  bucket.rankAt = now;
  bucket.rankedItems = rankedItems;
  return rankedItems;
}

async function buildPriceSnapshot(rankedItems, market) {
  const bucket = getCacheBucket(market);
  const usdKrw = market === "NASDAQ" ? await getUsdKrwCached(bucket) : 1;

  const quoteRows = await fetchYahooQuoteBatch(rankedItems.map((item) => item.yahoo));
  const quoteMap = new Map(quoteRows.map((q) => [q.symbol, q]));

  const rows = await Promise.all(
    rankedItems.map(async (item) => {
      const quote = quoteMap.get(item.yahoo);
      let info = quote ? quoteRowToInfo(quote) : null;

      if (info?.price == null || info?.changePct == null) {
        try {
          const chartInfo = await fetchYahooChartMeta(item.yahoo);
          info = {
            shortName: info?.shortName || chartInfo.shortName || item.displayNameEN || item.name,
            price: info?.price ?? chartInfo.price,
            changePct: info?.changePct ?? chartInfo.changePct,
          };
        } catch {
          info = info || {
            shortName: item.displayNameEN || item.name,
            price: null,
            changePct: null,
          };
        }
      }

      return {
        rank: item.rank,
        name: item.name,
        displayNameEN: info?.shortName || item.displayNameEN || item.name,
        symbol: item.symbol,
        iconUrl: item.iconUrl || buildLogo(pickStockDomain(item.symbol)),
        capKRW:
          market === "NASDAQ"
            ? item.capUSD != null
              ? Math.round(item.capUSD * usdKrw)
              : null
            : item.capKRW ?? null,
        priceKRW:
          market === "NASDAQ"
            ? info?.price != null
              ? Number((info.price * usdKrw).toFixed(2))
              : null
            : info?.price != null
              ? Number(info.price.toFixed(2))
              : null,
        changePct: info?.changePct ?? null,
      };
    })
  );

  return rows;
}

async function ensurePriceSnapshot(market) {
  const bucket = getCacheBucket(market);
  const now = Date.now();

  if (bucket.pricedItems?.length && now - bucket.priceAt < PRICE_TTL_MS) {
    return bucket.pricedItems;
  }

  const rankedItems = await ensureRankSnapshot(market);
  const pricedItems = await buildPriceSnapshot(rankedItems, market);

  if (!pricedItems.length) {
    throw new Error(`${market} price snapshot build failed`);
  }

  bucket.priceAt = now;
  bucket.pricedItems = pricedItems;
  return pricedItems;
}

export default async function handler(req, res) {
  const market = String(req.query?.market || "KOSPI").toUpperCase();

  if (!["KOSPI", "NASDAQ"].includes(market)) {
    res.status(400).json({ error: "market must be KOSPI or NASDAQ" });
    return;
  }

  try {
    const bucket = getCacheBucket(market);
    const items = await ensurePriceSnapshot(market);

    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
    res.status(200).json({
      items,
      stale: false,
      rankUpdatedAt: bucket.rankAt || null,
      priceUpdatedAt: bucket.priceAt || null,
      rankRefreshHours: 6,
      priceRefreshSeconds: 20,
    });
  } catch (error) {
    const bucket = getCacheBucket(market);
    const fallbackItems = bucket.pricedItems?.length ? bucket.pricedItems : [];

    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
    res.status(200).json({
      items: fallbackItems,
      stale: true,
      rankUpdatedAt: bucket.rankAt || null,
      priceUpdatedAt: bucket.priceAt || null,
      rankRefreshHours: 6,
      priceRefreshSeconds: 20,
      error: String(error?.message || error),
    });
  }
}