import fs from "fs";
import path from "path";
import iconv from "iconv-lite";

const cache = new Map();

const RANK_TTL_MS = 6 * 60 * 60 * 1000; // 6시간
const PRICE_TTL_MS = 20 * 1000; // 20초
const FX_TTL_MS = 20 * 1000;
const KIS_TOKEN_TTL_MS = 23 * 60 * 60 * 1000;

const FMP_API_KEY = process.env.FMP_API_KEY || "";
const KIS_APP_KEY = process.env.KIS_APP_KEY || "";
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || "";
const KIS_BASE_URL =
  process.env.KIS_BASE_URL || "https://openapi.koreainvestment.com:9443";

/**
 * KIS market-cap ranking endpoint / params are consistent with
 * publicly documented "국내주식 시가총액 상위" availability on KIS docs,
 * and this default TR value is the one commonly used in working examples.
 * If your account/doc shows a different TR, only this env value needs changing.
 */
const KIS_MARKET_CAP_TR_ID =
  process.env.KIS_MARKET_CAP_TR_ID || "FHPST01740000";

const kisTokenCache = {
  token: "",
  at: 0,
};

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[,%\s,]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeSymbol(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (/^\d{6}$/.test(raw)) return raw;
  const onlyDigits = raw.replace(/\D/g, "");
  if (!onlyDigits) return raw;
  return onlyDigits.padStart(6, "0");
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
    ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(
        domain
      )}`
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

function getCacheBucket(market) {
  if (!cache.has(market)) {
    cache.set(market, {
      rankAt: 0,
      rankedItems: [],
      priceAt: 0,
      pricedItems: [],
      fxAt: 0,
      usdKrw: 1350,
      masterLoaded: false,
      masterItems: [],
    });
  }
  return cache.get(market);
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      Accept: "application/json,text/plain,*/*",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Upstream failed: ${res.status} ${text.slice(0, 250)}`);
  }

  return text;
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 250)}`);
  }
}

async function fetchUsdKrw() {
  try {
    const json = await fetchJson(
      "https://api.frankfurter.app/latest?from=USD&to=KRW"
    );
    return toNumber(json?.rates?.KRW) || 1350;
  } catch {
    return 1350;
  }
}

async function getUsdKrwCached(bucket) {
  const now = Date.now();
  if (bucket.usdKrw && now - bucket.fxAt < FX_TTL_MS) {
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

  const headers = splitCsvLine(lines[0]).map((h) =>
    h.replace(/^\uFEFF/, "").trim()
  );

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

function readCp949Csv(filePath) {
  const buffer = fs.readFileSync(filePath);
  const text = iconv.decode(buffer, "cp949");
  return text.replace(/^\uFEFF/, "");
}

function normalizeCompanyName(name) {
  return String(name || "")
    .replace(/\s+/g, "")
    .replace(/보통주$/g, "")
    .replace(/주식$/g, "")
    .trim();
}

function titleCaseEnglish(value) {
  const s = String(value || "").trim();
  if (!s) return s;
  return s;
}

function loadKospiMaster() {
  const bucket = getCacheBucket("KOSPI");
  if (bucket.masterLoaded && bucket.masterItems.length) {
    return bucket.masterItems;
  }

  const filePath = path.join(process.cwd(), "tmp", "kospi.csv");
  const rows = parseCsv(readCp949Csv(filePath));

  const nameOverrides = {
    "005930": { name: "삼성전자", displayNameEN: "Samsung Electronics" },
    "000660": { name: "SK하이닉스", displayNameEN: "SK hynix" },
    "373220": { name: "LG에너지솔루션", displayNameEN: "LG Energy Solution" },
    "207940": { name: "삼성바이오로직스", displayNameEN: "Samsung Biologics" },
    "005380": { name: "현대차", displayNameEN: "Hyundai Motor" },
    "068270": { name: "셀트리온", displayNameEN: "Celltrion" },
    "000270": { name: "기아", displayNameEN: "Kia" },
    "105560": { name: "KB금융", displayNameEN: "KB Financial Group" },
    "035420": { name: "NAVER", displayNameEN: "NAVER" },
    "055550": { name: "신한지주", displayNameEN: "Shinhan Financial Group" },
    "005490": { name: "POSCO홀딩스", displayNameEN: "POSCO Holdings" },
    "006400": { name: "삼성SDI", displayNameEN: "Samsung SDI" },
    "035720": { name: "카카오", displayNameEN: "Kakao" },
    "051910": { name: "LG화학", displayNameEN: "LG Chem" },
    "028260": { name: "삼성물산", displayNameEN: "Samsung C&T" },
    "086790": { name: "하나금융지주", displayNameEN: "Hana Financial Group" },
    "015760": { name: "한국전력", displayNameEN: "KEPCO" },
    "329180": {
      name: "HD현대중공업",
      displayNameEN: "HD Hyundai Heavy Industries",
    },
    "138040": {
      name: "메리츠금융지주",
      displayNameEN: "Meritz Financial Group",
    },
    "032830": { name: "삼성생명", displayNameEN: "Samsung Life" },
    "259960": { name: "크래프톤", displayNameEN: "Krafton" },
    "033780": { name: "KT&G", displayNameEN: "KT&G" },
    "011200": { name: "HMM", displayNameEN: "HMM" },
    "316140": { name: "우리금융지주", displayNameEN: "Woori Financial Group" },
    "034020": { name: "두산에너빌리티", displayNameEN: "Doosan Enerbility" },
    "003490": { name: "대한항공", displayNameEN: "Korean Air" },
    "066570": { name: "LG전자", displayNameEN: "LG Electronics" },
    "003670": { name: "포스코퓨처엠", displayNameEN: "POSCO Future M" },
    "009150": {
      name: "삼성전기",
      displayNameEN: "Samsung Electro-Mechanics",
    },
    "012450": { name: "한화에어로스페이스", displayNameEN: "Hanwha Aerospace" },
  };

  const items = rows
    .map((row) => {
      const symbol = normalizeSymbol(
        getByNormalizedKeys(row, ["단축코드", "종목코드", "표준단축코드"])
      );
      if (!symbol) return null;

      const rawName = getByNormalizedKeys(row, [
        "한글종목명",
        "종목명",
        "한글 종목명",
      ]);
      const rawEnglish = getByNormalizedKeys(row, [
        "영문종목명",
        "영문명",
        "영문 종목명",
      ]);
      const stockType = getByNormalizedKeys(row, ["주식종류"]);

      if (!rawName) return null;
      if (stockType && !stockType.includes("보통주")) return null;

      const override = nameOverrides[symbol] || null;

      return {
        symbol,
        name: override?.name || normalizeCompanyName(rawName),
        displayNameEN:
          override?.displayNameEN ||
          titleCaseEnglish(rawEnglish) ||
          normalizeCompanyName(rawName),
      };
    })
    .filter(Boolean);

  bucket.masterLoaded = true;
  bucket.masterItems = items;
  return items;
}

function getKospiMasterMap() {
  return new Map(loadKospiMaster().map((item) => [item.symbol, item]));
}

async function getKisAccessToken() {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    throw new Error("KIS credentials are missing");
  }

  const now = Date.now();
  if (kisTokenCache.token && now - kisTokenCache.at < KIS_TOKEN_TTL_MS) {
    return kisTokenCache.token;
  }

  const json = await fetchJson(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
    }),
  });

  const token = String(json?.access_token || "").trim();
  if (!token) {
    throw new Error("KIS access token not returned");
  }

  kisTokenCache.token = token;
  kisTokenCache.at = now;
  return token;
}

async function fetchKisMarketCapTop30() {
  const token = await getKisAccessToken();

  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/ranking/market-cap`
  );
  url.searchParams.set("fid_cond_mrkt_div_code", "J"); // KRX
  url.searchParams.set("fid_cond_scr_div_code", "20174");
  url.searchParams.set("fid_div_cls_code", "0");
  url.searchParams.set("fid_input_iscd", "0000"); // KOSPI
  url.searchParams.set("fid_trgt_cls_code", "0");
  url.searchParams.set("fid_trgt_exls_cls_code", "0");
  url.searchParams.set("fid_input_price_1", "");
  url.searchParams.set("fid_input_price_2", "");
  url.searchParams.set("fid_vol_cnt", "");

  const json = await fetchJson(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
      tr_id: KIS_MARKET_CAP_TR_ID,
    },
  });

  const rows = Array.isArray(json?.output) ? json.output : [];
  if (!rows.length) {
    throw new Error("KIS market-cap output is empty");
  }

  return rows.slice(0, 30);
}

function firstNonEmpty(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function normalizeKisMarketCapRow(row, index, masterMap) {
  const symbol = normalizeSymbol(
    firstNonEmpty(row, [
      "mksc_shrn_iscd",
      "stck_shrn_iscd",
      "shrn_iscd",
      "isu_cd",
      "iscd",
      "stck_shrn_iscd1",
    ])
  );

  const master = masterMap.get(symbol);
  const rawKorName = firstNonEmpty(row, ["hts_kor_isnm", "prdt_name", "stck_name"]);
  const rawPrice = firstNonEmpty(row, ["stck_prpr", "cur_prc", "bstp_nmix_prpr"]);
  const rawPct = firstNonEmpty(row, ["prdy_ctrt", "flu_rt", "chg_rate"]);
  const rawCap = firstNonEmpty(row, ["stck_avls", "data_valx", "mkt_cap"]);
  const rawRank = firstNonEmpty(row, ["data_rank", "rank", "rprs_mrkt_kor_name"]);

  const name = master?.name || normalizeCompanyName(rawKorName) || symbol;
  const displayNameEN = master?.displayNameEN || name;

  return {
    rank: toNumber(rawRank) || index + 1,
    name,
    displayNameEN,
    symbol,
    iconUrl: buildLogo(pickStockDomain(symbol)),
    capKRW: toNumber(rawCap),
    priceKRW: toNumber(rawPrice),
    changePct: toNumber(rawPct),
  };
}

async function fetchFmpBatchQuote(symbols) {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY is missing");
  }

  const groups = chunk(symbols, 50);
  const settled = await Promise.allSettled(
    groups.map(async (group) => {
      const url =
        "https://financialmodelingprep.com/stable/batch-quote" +
        `?symbols=${encodeURIComponent(group.join(","))}` +
        `&apikey=${encodeURIComponent(FMP_API_KEY)}`;
      const json = await fetchJson(url);
      return Array.isArray(json) ? json : [];
    })
  );

  const rows = [];
  for (const item of settled) {
    if (item.status === "fulfilled") {
      rows.push(...item.value);
    }
  }
  return rows;
}

async function buildKospiRankSnapshot() {
  const masterMap = getKospiMasterMap();
  const rows = await fetchKisMarketCapTop30();

  const normalized = rows
    .map((row, index) => normalizeKisMarketCapRow(row, index, masterMap))
    .filter((item) => item.symbol && item.capKRW != null)
    .sort((a, b) => (a.rank || 9999) - (b.rank || 9999))
    .slice(0, 30);

  if (!normalized.length) {
    throw new Error("KOSPI top30 normalization failed");
  }

  return normalized.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

async function buildNasdaqRankSnapshot() {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY is missing");
  }

  const url =
    "https://financialmodelingprep.com/stable/company-screener" +
    `?exchange=NASDAQ&isEtf=false&isFund=false&limit=300&apikey=${encodeURIComponent(
      FMP_API_KEY
    )}`;

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

  if (!normalized.length) {
    throw new Error("NASDAQ top30 normalization failed");
  }

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
  if (market === "KOSPI") {
    return rankedItems.map((item) => ({
      rank: item.rank,
      name: item.name,
      displayNameEN: item.displayNameEN,
      symbol: item.symbol,
      iconUrl: item.iconUrl,
      capKRW: item.capKRW,
      priceKRW: item.priceKRW,
      changePct: item.changePct,
    }));
  }

  const bucket = getCacheBucket(market);
  const usdKrw = await getUsdKrwCached(bucket);
  const quoteRows = await fetchFmpBatchQuote(
    rankedItems.map((item) => item.symbol)
  );
  const quoteMap = new Map(
    quoteRows.map((q) => [String(q.symbol || "").toUpperCase(), q])
  );

  return rankedItems.map((item) => {
    const quote = quoteMap.get(item.symbol) || {};
    const price =
      toNumber(quote?.price) ??
      toNumber(quote?.previousClose) ??
      toNumber(quote?.dayLow) ??
      null;
    const changePct =
      toNumber(quote?.changesPercentage) ??
      toNumber(quote?.changePercentage) ??
      null;

    return {
      rank: item.rank,
      name: item.name,
      displayNameEN: item.displayNameEN,
      symbol: item.symbol,
      iconUrl: item.iconUrl || buildLogo(pickStockDomain(item.symbol)),
      capKRW: item.capUSD != null ? Math.round(item.capUSD * usdKrw) : null,
      priceKRW: price != null ? Number((price * usdKrw).toFixed(2)) : null,
      changePct,
    };
  });
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