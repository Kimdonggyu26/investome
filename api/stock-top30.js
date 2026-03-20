import fs from "fs";
import path from "path";
import iconv from "iconv-lite";

const cache = new Map();

const RANK_TTL_MS = 6 * 60 * 60 * 1000;
const PRICE_TTL_MS = 20 * 1000;
const FX_TTL_MS = 20 * 1000;
const KIS_TOKEN_TTL_MS = 23 * 60 * 60 * 1000;

const KIS_APP_KEY = process.env.KIS_APP_KEY || "";
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || "";
const KIS_BASE_URL =
  process.env.KIS_BASE_URL || "https://openapi.koreainvestment.com:9443";
const KIS_MARKET_CAP_TR_ID =
  process.env.KIS_MARKET_CAP_TR_ID || "FHPST01740000";

const kisTokenCache = {
  token: "",
  at: 0,
};

const NASDAQ_FIXED_UNIVERSE = [
  { symbol: "AAPL", name: "애플", displayNameEN: "Apple Inc.", domain: "apple.com" },
  { symbol: "MSFT", name: "마이크로소프트", displayNameEN: "Microsoft Corporation", domain: "microsoft.com" },
  { symbol: "NVDA", name: "엔비디아", displayNameEN: "NVIDIA Corporation", domain: "nvidia.com" },
  { symbol: "AMZN", name: "아마존", displayNameEN: "Amazon.com, Inc.", domain: "amazon.com" },
  { symbol: "GOOGL", name: "알파벳A", displayNameEN: "Alphabet Inc. Class A", domain: "google.com" },
  { symbol: "GOOG", name: "알파벳C", displayNameEN: "Alphabet Inc. Class C", domain: "google.com" },
  { symbol: "META", name: "메타", displayNameEN: "Meta Platforms, Inc.", domain: "meta.com" },
  { symbol: "AVGO", name: "브로드컴", displayNameEN: "Broadcom Inc.", domain: "broadcom.com" },
  { symbol: "TSLA", name: "테슬라", displayNameEN: "Tesla, Inc.", domain: "tesla.com" },
  { symbol: "COST", name: "코스트코", displayNameEN: "Costco Wholesale Corporation", domain: "costco.com" },
  { symbol: "NFLX", name: "넷플릭스", displayNameEN: "Netflix, Inc.", domain: "netflix.com" },
  { symbol: "ASML", name: "ASML", displayNameEN: "ASML Holding N.V.", domain: "asml.com" },
  { symbol: "TMUS", name: "T-모바일", displayNameEN: "T-Mobile US, Inc.", domain: "t-mobile.com" },
  { symbol: "CSCO", name: "시스코", displayNameEN: "Cisco Systems, Inc.", domain: "cisco.com" },
  { symbol: "AMD", name: "AMD", displayNameEN: "Advanced Micro Devices, Inc.", domain: "amd.com" },
  { symbol: "PEP", name: "펩시코", displayNameEN: "PepsiCo, Inc.", domain: "pepsico.com" },
  { symbol: "LIN", name: "린데", displayNameEN: "Linde plc", domain: "linde.com" },
  { symbol: "INTU", name: "인튜이트", displayNameEN: "Intuit Inc.", domain: "intuit.com" },
  { symbol: "QCOM", name: "퀄컴", displayNameEN: "QUALCOMM Incorporated", domain: "qualcomm.com" },
  { symbol: "AMGN", name: "암젠", displayNameEN: "Amgen Inc.", domain: "amgen.com" },
  { symbol: "TXN", name: "텍사스인스트루먼트", displayNameEN: "Texas Instruments Incorporated", domain: "ti.com" },
  { symbol: "INTC", name: "인텔", displayNameEN: "Intel Corporation", domain: "intel.com" },
  { symbol: "HON", name: "허니웰", displayNameEN: "Honeywell International Inc.", domain: "honeywell.com" },
  { symbol: "AMAT", name: "어플라이드머티어리얼즈", displayNameEN: "Applied Materials, Inc.", domain: "appliedmaterials.com" },
  { symbol: "BKNG", name: "부킹홀딩스", displayNameEN: "Booking Holdings Inc.", domain: "bookingholdings.com" },
  { symbol: "ISRG", name: "인튜이티브서지컬", displayNameEN: "Intuitive Surgical, Inc.", domain: "intuitive.com" },
  { symbol: "ADBE", name: "어도비", displayNameEN: "Adobe Inc.", domain: "adobe.com" },
  { symbol: "MU", name: "마이크론", displayNameEN: "Micron Technology, Inc.", domain: "micron.com" },
  { symbol: "ADP", name: "ADP", displayNameEN: "Automatic Data Processing, Inc.", domain: "adp.com" },
  { symbol: "LRCX", name: "램리서치", displayNameEN: "Lam Research Corporation", domain: "lamresearch.com" },
  { symbol: "KLAC", name: "KLA", displayNameEN: "KLA Corporation", domain: "kla.com" },
  { symbol: "PANW", name: "팔로알토네트웍스", displayNameEN: "Palo Alto Networks, Inc.", domain: "paloaltonetworks.com" },
  { symbol: "SNPS", name: "시놉시스", displayNameEN: "Synopsys, Inc.", domain: "synopsys.com" },
  { symbol: "CDNS", name: "케이던스", displayNameEN: "Cadence Design Systems, Inc.", domain: "cadence.com" },
  { symbol: "MRVL", name: "마벨", displayNameEN: "Marvell Technology, Inc.", domain: "marvell.com" },
  { symbol: "PLTR", name: "팔란티어", displayNameEN: "Palantir Technologies Inc.", domain: "palantir.com" },
  { symbol: "ADI", name: "아나로그디바이스", displayNameEN: "Analog Devices, Inc.", domain: "analog.com" },
  { symbol: "CMCSA", name: "컴캐스트", displayNameEN: "Comcast Corporation", domain: "corporate.comcast.com" },
  { symbol: "GILD", name: "길리어드", displayNameEN: "Gilead Sciences, Inc.", domain: "gilead.com" },
  { symbol: "ABNB", name: "에어비앤비", displayNameEN: "Airbnb, Inc.", domain: "airbnb.com" },
  { symbol: "PDD", name: "핀둬둬", displayNameEN: "PDD Holdings Inc.", domain: "pddholdings.com" },
  { symbol: "MELI", name: "메르카도리브레", displayNameEN: "MercadoLibre, Inc.", domain: "mercadolibre.com" },
  { symbol: "ORCL", name: "오라클", displayNameEN: "Oracle Corporation", domain: "oracle.com" },
];

const KOSPI_FIXED_UNIVERSE = [
  { symbol: "005930", name: "삼성전자", displayNameEN: "Samsung Electronics", domain: "samsung.com" },
  { symbol: "000660", name: "SK하이닉스", displayNameEN: "SK hynix", domain: "skhynix.com" },
  { symbol: "373220", name: "LG에너지솔루션", displayNameEN: "LG Energy Solution", domain: "lgensol.com" },
  { symbol: "207940", name: "삼성바이오로직스", displayNameEN: "Samsung Biologics", domain: "samsungbiologics.com" },
  { symbol: "005380", name: "현대차", displayNameEN: "Hyundai Motor", domain: "hyundai.com" },
  { symbol: "068270", name: "셀트리온", displayNameEN: "Celltrion", domain: "celltrion.com" },
  { symbol: "000270", name: "기아", displayNameEN: "Kia", domain: "kia.com" },
  { symbol: "105560", name: "KB금융", displayNameEN: "KB Financial Group", domain: "kbfg.com" },
  { symbol: "035420", name: "NAVER", displayNameEN: "NAVER", domain: "navercorp.com" },
  { symbol: "055550", name: "신한지주", displayNameEN: "Shinhan Financial Group", domain: "shinhan.com" },
  { symbol: "005490", name: "POSCO홀딩스", displayNameEN: "POSCO Holdings", domain: "posco-inc.com" },
  { symbol: "006400", name: "삼성SDI", displayNameEN: "Samsung SDI", domain: "samsungsdi.com" },
  { symbol: "035720", name: "카카오", displayNameEN: "Kakao", domain: "kakaocorp.com" },
  { symbol: "051910", name: "LG화학", displayNameEN: "LG Chem", domain: "lgchem.com" },
  { symbol: "028260", name: "삼성물산", displayNameEN: "Samsung C&T", domain: "samsungcnt.com" },
  { symbol: "086790", name: "하나금융지주", displayNameEN: "Hana Financial Group", domain: "hanafn.com" },
  { symbol: "015760", name: "한국전력", displayNameEN: "KEPCO", domain: "kepco.co.kr" },
  { symbol: "329180", name: "HD현대중공업", displayNameEN: "HD Hyundai Heavy Industries", domain: "hd-hhi.com" },
  { symbol: "138040", name: "메리츠금융지주", displayNameEN: "Meritz Financial Group", domain: "meritzfinancialgroup.com" },
  { symbol: "032830", name: "삼성생명", displayNameEN: "Samsung Life", domain: "samsunglife.com" },
  { symbol: "259960", name: "크래프톤", displayNameEN: "Krafton", domain: "krafton.com" },
  { symbol: "033780", name: "KT&G", displayNameEN: "KT&G", domain: "ktng.com" },
  { symbol: "011200", name: "HMM", displayNameEN: "HMM", domain: "hmm21.com" },
  { symbol: "316140", name: "우리금융지주", displayNameEN: "Woori Financial Group", domain: "woorifg.com" },
  { symbol: "034020", name: "두산에너빌리티", displayNameEN: "Doosan Enerbility", domain: "doosanenerbility.com" },
  { symbol: "003490", name: "대한항공", displayNameEN: "Korean Air", domain: "koreanair.com" },
  { symbol: "066570", name: "LG전자", displayNameEN: "LG Electronics", domain: "lge.com" },
  { symbol: "003670", name: "포스코퓨처엠", displayNameEN: "POSCO Future M", domain: "poscofuturem.com" },
  { symbol: "009150", name: "삼성전기", displayNameEN: "Samsung Electro-Mechanics", domain: "sem.samsung.com" },
  { symbol: "012450", name: "한화에어로스페이스", displayNameEN: "Hanwha Aerospace", domain: "hanwhaaerospace.com" },
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildLogo(domain) {
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(
    domain
  )}`;
}

function normalizeSymbol(raw) {
  const onlyDigits = String(raw || "").replace(/\D/g, "");
  if (!onlyDigits) return String(raw || "").trim().toUpperCase();
  return onlyDigits.padStart(6, "0");
}

function normalizeCompanyName(name) {
  return String(name || "")
    .replace(/\s+/g, "")
    .replace(/보통주$/g, "")
    .replace(/주식$/g, "")
    .trim();
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

function loadKospiMaster() {
  const bucket = getCacheBucket("KOSPI");

  if (bucket.masterLoaded && bucket.masterItems.length) {
    return bucket.masterItems;
  }

  const filePath = path.join(process.cwd(), "tmp", "kospi.csv");
  const rows = parseCsv(readCp949Csv(filePath));

  const nameOverrides = {
    "005930": { name: "삼성전자", displayNameEN: "Samsung Electronics" },
    "005935": { name: "삼성전자우", displayNameEN: "Samsung Electronics Pref" },
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
          String(rawEnglish || "").trim() ||
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

function pickStockDomain(symbol) {
  const map = {
    "005930": "samsung.com",
    "005935": "samsung.com",
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
    ASML: "asml.com",
    TMUS: "t-mobile.com",
    CSCO: "cisco.com",
    AMD: "amd.com",
    PEP: "pepsico.com",
    LIN: "linde.com",
    INTU: "intuit.com",
    QCOM: "qualcomm.com",
    AMGN: "amgen.com",
    TXN: "ti.com",
    INTC: "intel.com",
    HON: "honeywell.com",
    AMAT: "appliedmaterials.com",
    BKNG: "bookingholdings.com",
    ISRG: "intuitive.com",
    ADBE: "adobe.com",
    MU: "micron.com",
    ADP: "adp.com",
    LRCX: "lamresearch.com",
    KLAC: "kla.com",
    PANW: "paloaltonetworks.com",
    SNPS: "synopsys.com",
    CDNS: "cadence.com",
    MRVL: "marvell.com",
    PLTR: "palantir.com",
    ADI: "analog.com",
    CMCSA: "corporate.comcast.com",
    GILD: "gilead.com",
    ABNB: "airbnb.com",
    PDD: "pddholdings.com",
    MELI: "mercadolibre.com",
    ORCL: "oracle.com",
  };

  return map[String(symbol || "").toUpperCase()] || "";
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

  url.searchParams.set("fid_cond_mrkt_div_code", "J");
  url.searchParams.set("fid_cond_scr_div_code", "20174");
  url.searchParams.set("fid_div_cls_code", "0");
  url.searchParams.set("fid_input_iscd", "0000");
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
  const rawRank = firstNonEmpty(row, ["data_rank", "rank"]);

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

async function fetchYahooBatchQuote(symbols) {
  const url =
    "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
    encodeURIComponent(symbols.join(","));
  const json = await fetchJson(url);
  return Array.isArray(json?.quoteResponse?.result)
    ? json.quoteResponse.result
    : [];
}

function normalizeYahooNasdaqRankRow(baseItem, quote, usdKrw) {
  const marketCapUSD =
    toNumber(quote?.marketCap) ??
    toNumber(quote?.regularMarketCap) ??
    null;

  const priceUSD =
    toNumber(quote?.regularMarketPrice) ??
    toNumber(quote?.postMarketPrice) ??
    toNumber(quote?.preMarketPrice) ??
    toNumber(quote?.regularMarketPreviousClose) ??
    null;

  const changePct =
    toNumber(quote?.regularMarketChangePercent) ??
    toNumber(quote?.postMarketChangePercent) ??
    toNumber(quote?.preMarketChangePercent) ??
    null;

  return {
    rank: 0,
    name: String(quote?.shortName || "").trim() || baseItem.name,
    displayNameEN:
      String(quote?.longName || quote?.shortName || "").trim() ||
      baseItem.displayNameEN,
    symbol: baseItem.symbol,
    iconUrl: buildLogo(baseItem.domain || pickStockDomain(baseItem.symbol)),
    capKRW: marketCapUSD != null ? Math.round(marketCapUSD * usdKrw) : null,
    priceKRW: priceUSD != null ? Number((priceUSD * usdKrw).toFixed(2)) : null,
    changePct,
  };
}

async function buildKospiYahooFallbackSnapshot() {
  const masterMap = getKospiMasterMap();

  const yahooSymbols = KOSPI_FIXED_UNIVERSE.map((item) => `${item.symbol}.KS`);
  const quoteRows = await fetchYahooBatchQuote(yahooSymbols);

  const quoteMap = new Map(
    quoteRows.map((row) => [String(row?.symbol || "").toUpperCase(), row])
  );

  const normalized = KOSPI_FIXED_UNIVERSE.map((item, index) => {
    const quote = quoteMap.get(`${item.symbol}.KS`) || {};
    const master = masterMap.get(item.symbol);

    const marketCap =
      toNumber(quote?.marketCap) ??
      toNumber(quote?.regularMarketCap) ??
      null;

    const price =
      toNumber(quote?.regularMarketPrice) ??
      toNumber(quote?.regularMarketPreviousClose) ??
      null;

    const changePct =
      toNumber(quote?.regularMarketChangePercent) ??
      null;

    return {
      rank: index + 1,
      name: master?.name || item.name,
      displayNameEN: master?.displayNameEN || item.displayNameEN,
      symbol: item.symbol,
      iconUrl: buildLogo(item.domain || pickStockDomain(item.symbol)),
      capKRW: marketCap,
      priceKRW: price,
      changePct,
    };
  });

  const hasMarketCap = normalized.some((item) => item.capKRW != null);

  const sorted = [...normalized]
    .sort((a, b) => {
      if (hasMarketCap) {
        return (b.capKRW || 0) - (a.capKRW || 0);
      }
      return a.rank - b.rank;
    })
    .slice(0, 30)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  if (!sorted.length) {
    throw new Error("KOSPI Yahoo fallback snapshot build failed");
  }

  return sorted;
}

async function buildKospiRankSnapshot() {
  const masterMap = getKospiMasterMap();

  try {
    const rows = await fetchKisMarketCapTop30();

    const normalized = rows
      .map((row, index) => normalizeKisMarketCapRow(row, index, masterMap))
      .filter((item) => item.symbol && item.capKRW != null)
      .sort((a, b) => (a.rank || 9999) - (b.rank || 9999))
      .slice(0, 30)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    if (!normalized.length) {
      throw new Error("KOSPI top30 normalization failed");
    }

    return normalized;
  } catch {
    return buildKospiYahooFallbackSnapshot();
  }
}

async function buildNasdaqRankSnapshot() {
  const bucket = getCacheBucket("NASDAQ");
  const usdKrw = await getUsdKrwCached(bucket);

  const quoteRows = await fetchYahooBatchQuote(
    NASDAQ_FIXED_UNIVERSE.map((item) => item.symbol)
  );

  const quoteMap = new Map(
    quoteRows.map((row) => [String(row?.symbol || "").toUpperCase(), row])
  );

  const normalized = NASDAQ_FIXED_UNIVERSE
    .map((item) =>
      normalizeYahooNasdaqRankRow(item, quoteMap.get(item.symbol) || {}, usdKrw)
    )
    .filter((item) => item.symbol && item.capKRW != null)
    .sort((a, b) => (b.capKRW || 0) - (a.capKRW || 0))
    .slice(0, 30)
    .map((item, index) => ({
      ...item,
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
    const quoteRows = await fetchYahooBatchQuote(
      rankedItems.map((item) => `${item.symbol}.KS`)
    );

    const quoteMap = new Map(
      quoteRows.map((row) => [String(row?.symbol || "").toUpperCase(), row])
    );

    return rankedItems.map((item) => {
      const quote = quoteMap.get(`${item.symbol}.KS`) || {};

      const marketCap =
        toNumber(quote?.marketCap) ??
        toNumber(quote?.regularMarketCap) ??
        item.capKRW ??
        null;

      const price =
        toNumber(quote?.regularMarketPrice) ??
        toNumber(quote?.regularMarketPreviousClose) ??
        item.priceKRW ??
        null;

      const changePct =
        toNumber(quote?.regularMarketChangePercent) ??
        item.changePct ??
        null;

      return {
        rank: item.rank,
        name: String(quote?.shortName || "").trim() || item.name,
        displayNameEN:
          String(quote?.longName || quote?.shortName || "").trim() ||
          item.displayNameEN,
        symbol: item.symbol,
        iconUrl: item.iconUrl || buildLogo(pickStockDomain(item.symbol)),
        capKRW: marketCap,
        priceKRW: price,
        changePct,
      };
    });
  }

  const bucket = getCacheBucket(market);
  const usdKrw = await getUsdKrwCached(bucket);
  const quoteRows = await fetchYahooBatchQuote(
    rankedItems.map((item) => item.symbol)
  );
  const quoteMap = new Map(
    quoteRows.map((row) => [String(row?.symbol || "").toUpperCase(), row])
  );

  return rankedItems.map((item) => {
    const quote = quoteMap.get(item.symbol) || {};
    const marketCapUSD =
      toNumber(quote?.marketCap) ??
      toNumber(quote?.regularMarketCap) ??
      null;

    const priceUSD =
      toNumber(quote?.regularMarketPrice) ??
      toNumber(quote?.postMarketPrice) ??
      toNumber(quote?.preMarketPrice) ??
      toNumber(quote?.regularMarketPreviousClose) ??
      null;

    const changePct =
      toNumber(quote?.regularMarketChangePercent) ??
      toNumber(quote?.postMarketChangePercent) ??
      toNumber(quote?.preMarketChangePercent) ??
      item.changePct ??
      null;

    return {
      rank: item.rank,
      name: String(quote?.shortName || "").trim() || item.name,
      displayNameEN:
        String(quote?.longName || quote?.shortName || "").trim() ||
        item.displayNameEN,
      symbol: item.symbol,
      iconUrl: item.iconUrl || buildLogo(pickStockDomain(item.symbol)),
      capKRW: marketCapUSD != null ? Math.round(marketCapUSD * usdKrw) : item.capKRW,
      priceKRW: priceUSD != null ? Number((priceUSD * usdKrw).toFixed(2)) : item.priceKRW,
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
      mode:
        market === "NASDAQ"
          ? "fixed-universe-yahoo-sorted-by-marketcap"
          : "live-market-cap-ranking",
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
      mode:
        market === "NASDAQ"
          ? "fixed-universe-yahoo-sorted-by-marketcap"
          : "live-market-cap-ranking",
    });
  }
}