import { SEARCH_ASSETS } from "../data/searchAssets";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rankingApiUrl(path) {
  const base = (import.meta.env.VITE_RANKING_API_BASE_URL || "").trim();
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

function buildLogo(domain) {
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(
    domain
  )}`;
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

    NVDA: "nvidia.com",
    AAPL: "apple.com",
    GOOGL: "google.com",
    GOOG: "google.com",
    MSFT: "microsoft.com",
    AMZN: "amazon.com",
    AVGO: "broadcom.com",
    META: "meta.com",
    TSLA: "tesla.com",
    ASML: "asml.com",
    NFLX: "netflix.com",
    COST: "costco.com",
    AMD: "amd.com",
    MU: "micron.com",
    CSCO: "cisco.com",
    AZN: "astrazeneca.com",
    LRCX: "lamresearch.com",
    TMUS: "t-mobile.com",
    AMAT: "appliedmaterials.com",
    ISRG: "intuitive.com",
    LIN: "linde.com",
    PEP: "pepsico.com",
    INTC: "intel.com",
    QCOM: "qualcomm.com",
    AMGN: "amgen.com",
    INTU: "intuit.com",
    BKNG: "bookingholdings.com",
    KLAC: "kla.com",
    PDD: "pddholdings.com",
    ADBE: "adobe.com",
    PLTR: "palantir.com",
    ORCL: "oracle.com",
    CMCSA: "corporate.comcast.com",
    ADI: "analog.com",
    GILD: "gilead.com",
    ABNB: "airbnb.com",
    PANW: "paloaltonetworks.com",
    MELI: "mercadolibre.com",
    SNPS: "synopsys.com",
    CDNS: "cadence.com",
    ADP: "adp.com",
    CRWD: "crowdstrike.com",
    MRVL: "marvell.com",
  };

  return map[String(symbol || "").toUpperCase()] || "";
}

function buildCommodityIcon(symbol) {
  const map = {
    "GC=F": "/icons/commodities/gold.png",
    "SI=F": "/icons/commodities/silver.png",
    "CL=F": "/icons/commodities/oil.png",
    "BZ=F": "/icons/commodities/brent.png",
    "NG=F": "/icons/commodities/gas.png",
    "PL=F": "/icons/commodities/platinum.png",
    "PA=F": "/icons/commodities/palladium.png",
  };

  return map[String(symbol || "").toUpperCase()] || "";
}

function normalizeRow(row, index) {
  const symbol = (row.symbol || "-").toUpperCase();
  const commodityIcon = buildCommodityIcon(symbol);
  const stockIcon = buildLogo(pickStockDomain(symbol));

  return {
    rank: row.rank ?? index + 1,
    name: row.name ?? "-",
    displayNameEN: row.displayNameEN ?? "",
    symbol,
    iconUrl: row.iconUrl || commodityIcon || stockIcon,
    coinId: row.coinId ?? "",
    capKRW: toNumber(row.capKRW),
    priceKRW: toNumber(row.priceKRW),
    changePct: toNumber(row.changePct),
  };
}

function toCryptoRow(coin, index) {
  return {
    rank: coin.market_cap_rank ?? index + 1,
    name: coin.name ?? "-",
    displayNameEN: coin.name ?? "",
    symbol: (coin.symbol || "-").toUpperCase(),
    iconUrl: coin.image ?? "",
    coinId: coin.id ?? "",
    capKRW: typeof coin.market_cap === "number" ? coin.market_cap : null,
    priceKRW: typeof coin.current_price === "number" ? coin.current_price : null,
    changePct:
      typeof coin.price_change_percentage_24h === "number"
        ? coin.price_change_percentage_24h
        : null,
  };
}

function hasUsableRows(rows) {
  return (
    Array.isArray(rows) &&
    rows.length > 0 &&
    rows.some(
      (row) =>
        row &&
        (row.priceKRW != null ||
          row.capKRW != null ||
          (row.name && row.name !== "-"))
    )
  );
}

function fallbackStockRows(market) {
  return SEARCH_ASSETS
    .filter((item) => item.market === market)
    .slice(0, 30)
    .map((item, index) =>
      normalizeRow(
        {
          rank: index + 1,
          name: item.name,
          displayNameEN: item.displayNameEN,
          symbol: item.symbol,
          iconUrl: buildLogo(pickStockDomain(item.symbol)),
          coinId: "",
          capKRW: null,
          priceKRW: null,
          changePct: null,
        },
        index
      )
    );
}

async function readJsonOrThrow(res, label) {
  if (!res.ok) {
    throw new Error(`${label} failed: ${res.status}`);
  }
  return res.json();
}

let cryptoClientCache = {
  data: null,
  at: 0,
  inflight: null,
};

export async function fetchCryptoTop30KRW() {
  const now = Date.now();

  if (
    Array.isArray(cryptoClientCache.data) &&
    cryptoClientCache.data.length > 0 &&
    now - cryptoClientCache.at < 60_000
  ) {
    return cryptoClientCache.data;
  }

  if (cryptoClientCache.inflight) {
    return cryptoClientCache.inflight;
  }

  cryptoClientCache.inflight = fetch(rankingApiUrl("/api/crypto-top30"))
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Crypto top30 failed: ${res.status}`);
      }

      const json = await res.json();
      const rows = Array.isArray(json)
        ? json.map(toCryptoRow)
        : Array.isArray(json?.items)
        ? json.items.map(normalizeRow)
        : [];

      cryptoClientCache.data = rows;
      cryptoClientCache.at = Date.now();
      return rows;
    })
    .finally(() => {
      cryptoClientCache.inflight = null;
    });

  return cryptoClientCache.inflight;
}

export async function fetchCommoditiesTopKRW() {
  const json = await readJsonOrThrow(
    await fetch(rankingApiUrl("/api/commodity-top")),
    "commodities top"
  );
  const items = Array.isArray(json?.items) ? json.items : [];
  return items.map(normalizeRow);
}

async function fetchStockTop30(market) {
  try {
    const json = await readJsonOrThrow(
      await fetch(rankingApiUrl(`/api/stock-top30?market=${market}`)),
      `${market} top30`
    );

    const items = Array.isArray(json?.items) ? json.items : [];
    const rows = items.map(normalizeRow);

    if (hasUsableRows(rows)) {
      return rows;
    }

    return fallbackStockRows(market);
  } catch {
    return fallbackStockRows(market);
  }
}

export async function fetchKospiTop30KRW() {
  return fetchStockTop30("KOSPI");
}

export async function fetchNasdaqTop30KRW() {
  return fetchStockTop30("NASDAQ");
}