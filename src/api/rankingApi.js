

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
  };

  return map[String(symbol || "").toUpperCase()] || "";
}

function normalizeRow(row, index) {
  const symbol = (row.symbol || "-").toUpperCase();

  return {
    rank: row.rank ?? index + 1,
    name: row.name ?? "-",
    displayNameEN: row.displayNameEN ?? "",
    symbol,
    iconUrl: row.iconUrl ?? buildLogo(pickStockDomain(symbol)),
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

export async function fetchCryptoTop30KRW() {
  const res = await fetch("/api/crypto-top30");
  if (!res.ok) throw new Error(`Crypto top30 failed: ${res.status}`);

  const json = await res.json();
  if (!Array.isArray(json)) return [];

  return json.map(toCryptoRow);
}

export async function fetchCommoditiesTopKRW() {
  const res = await fetch("/api/commodity-top");
  if (!res.ok) throw new Error(`Commodities top failed: ${res.status}`);

  const json = await res.json();
  const items = Array.isArray(json?.items) ? json.items : [];

  return items.map(normalizeRow);
}

async function fetchStockTop30(market) {
  const res = await fetch(`/api/stock-top30?market=${market}`);
  if (!res.ok) throw new Error(`${market} top30 failed: ${res.status}`);

  const json = await res.json();
  const items = Array.isArray(json?.items) ? json.items : [];

  if (items.length === 0) {
    throw new Error(`${market} top30 empty`);
  }

  return items.map(normalizeRow);
}

export async function fetchKospiTop30KRW() {
  return fetchStockTop30("KOSPI");
}

export async function fetchNasdaqTop30KRW() {
  return fetchStockTop30("NASDAQ");
}

function makeDummyRows(market, names) {
  return names.map((item, idx) => {
    const rank = idx + 1;

    let baseCap = 0;
    let basePrice = 0;

    if (market === "KOSPI") {
      baseCap = 420000000000000 - idx * 9000000000000;
      basePrice = 82000 - idx * 1700;
    } else {
      baseCap = 4700000000000000 - idx * 120000000000000;
      basePrice = 620000 - idx * 14000;
    }

    const wave = Math.sin((idx + 1) * 1.27);
    const noise = Math.cos((idx + 2) * 0.83);

    return {
      rank,
      name: item.name,
      displayNameEN: item.displayNameEN || item.name,
      symbol: item.symbol,
      iconUrl: buildLogo(pickStockDomain(item.symbol)),
      coinId: "",
      capKRW: Math.max(50000000000000, Math.round(baseCap + wave * 15000000000000)),
      priceKRW: Math.max(1000, Math.round(basePrice + noise * 5000)),
      changePct: Number((wave * 2.15).toFixed(2)),
    };
  });
}

export function getKoreanDummyTop30(market) {
  const kospiNames = [
    { name: "삼성전자", displayNameEN: "Samsung Electronics", symbol: "005930" },
    { name: "SK하이닉스", displayNameEN: "SK hynix", symbol: "000660" },
    { name: "LG에너지솔루션", displayNameEN: "LG Energy Solution", symbol: "373220" },
    { name: "삼성바이오로직스", displayNameEN: "Samsung Biologics", symbol: "207940" },
    { name: "현대차", displayNameEN: "Hyundai Motor", symbol: "005380" },
    { name: "셀트리온", displayNameEN: "Celltrion", symbol: "068270" },
    { name: "기아", displayNameEN: "Kia", symbol: "000270" },
    { name: "KB금융", displayNameEN: "KB Financial Group", symbol: "105560" },
    { name: "NAVER", displayNameEN: "NAVER", symbol: "035420" },
    { name: "신한지주", displayNameEN: "Shinhan Financial Group", symbol: "055550" },
    { name: "POSCO홀딩스", displayNameEN: "POSCO Holdings", symbol: "005490" },
    { name: "삼성SDI", displayNameEN: "Samsung SDI", symbol: "006400" },
    { name: "카카오", displayNameEN: "Kakao", symbol: "035720" },
    { name: "LG화학", displayNameEN: "LG Chem", symbol: "051910" },
    { name: "삼성물산", displayNameEN: "Samsung C&T", symbol: "028260" },
    { name: "하나금융지주", displayNameEN: "Hana Financial Group", symbol: "086790" },
    { name: "한국전력", displayNameEN: "KEPCO", symbol: "015760" },
    { name: "HD현대중공업", displayNameEN: "HD Hyundai Heavy Industries", symbol: "329180" },
    { name: "메리츠금융지주", displayNameEN: "Meritz Financial Group", symbol: "138040" },
    { name: "삼성생명", displayNameEN: "Samsung Life", symbol: "032830" },
    { name: "크래프톤", displayNameEN: "Krafton", symbol: "259960" },
    { name: "KT&G", displayNameEN: "KT&G", symbol: "033780" },
    { name: "HMM", displayNameEN: "HMM", symbol: "011200" },
    { name: "우리금융지주", displayNameEN: "Woori Financial Group", symbol: "316140" },
    { name: "두산에너빌리티", displayNameEN: "Doosan Enerbility", symbol: "034020" },
    { name: "대한항공", displayNameEN: "Korean Air", symbol: "003490" },
    { name: "LG전자", displayNameEN: "LG Electronics", symbol: "066570" },
    { name: "포스코퓨처엠", displayNameEN: "POSCO Future M", symbol: "003670" },
    { name: "삼성전기", displayNameEN: "Samsung Electro-Mechanics", symbol: "009150" },
    { name: "한화에어로스페이스", displayNameEN: "Hanwha Aerospace", symbol: "012450" },
  ];

  const nasdaqNames = [
    { name: "애플", displayNameEN: "Apple", symbol: "AAPL" },
    { name: "마이크로소프트", displayNameEN: "Microsoft", symbol: "MSFT" },
    { name: "엔비디아", displayNameEN: "NVIDIA", symbol: "NVDA" },
    { name: "아마존", displayNameEN: "Amazon", symbol: "AMZN" },
    { name: "알파벳 A", displayNameEN: "Alphabet A", symbol: "GOOGL" },
    { name: "메타", displayNameEN: "Meta", symbol: "META" },
    { name: "브로드컴", displayNameEN: "Broadcom", symbol: "AVGO" },
    { name: "테슬라", displayNameEN: "Tesla", symbol: "TSLA" },
    { name: "코스트코", displayNameEN: "Costco", symbol: "COST" },
    { name: "넷플릭스", displayNameEN: "Netflix", symbol: "NFLX" },
    { name: "어도비", displayNameEN: "Adobe", symbol: "ADBE" },
    { name: "펩시코", displayNameEN: "PepsiCo", symbol: "PEP" },
    { name: "퀄컴", displayNameEN: "Qualcomm", symbol: "QCOM" },
    { name: "시스코", displayNameEN: "Cisco", symbol: "CSCO" },
    { name: "AMD", displayNameEN: "AMD", symbol: "AMD" },
    { name: "인튜이트", displayNameEN: "Intuit", symbol: "INTU" },
    { name: "텍사스인스트루먼트", displayNameEN: "Texas Instruments", symbol: "TXN" },
    { name: "인튜이티브서지컬", displayNameEN: "Intuitive Surgical", symbol: "ISRG" },
    { name: "아스트라제네카", displayNameEN: "AstraZeneca", symbol: "AZN" },
    { name: "팔란티어", displayNameEN: "Palantir", symbol: "PLTR" },
    { name: "아날로그디바이스", displayNameEN: "Analog Devices", symbol: "ADI" },
    { name: "마벨", displayNameEN: "Marvell", symbol: "MRVL" },
    { name: "마이크론", displayNameEN: "Micron", symbol: "MU" },
    { name: "파이서브", displayNameEN: "Fiserv", symbol: "FI" },
    { name: "암젠", displayNameEN: "Amgen", symbol: "AMGN" },
    { name: "길리어드", displayNameEN: "Gilead Sciences", symbol: "GILD" },
    { name: "인텔", displayNameEN: "Intel", symbol: "INTC" },
    { name: "에어비앤비", displayNameEN: "Airbnb", symbol: "ABNB" },
    { name: "부킹홀딩스", displayNameEN: "Booking Holdings", symbol: "BKNG" },
    { name: "스타벅스", displayNameEN: "Starbucks", symbol: "SBUX" },
  ];

  return market === "KOSPI"
    ? makeDummyRows("KOSPI", kospiNames)
    : makeDummyRows("NASDAQ", nasdaqNames);
}