function favicon(domain) {
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}`;
}

function makeMeta(name, displayNameEN, domain) {
  return {
    name,
    displayNameEN,
    domain,
    iconUrl: favicon(domain),
  };
}

export const ASSET_META = {
  KOSPI: {
    "005930": makeMeta("삼성전자", "Samsung Electronics", "samsung.com"),
    "000660": makeMeta("SK하이닉스", "SK hynix", "skhynix.com"),
    "373220": makeMeta("LG에너지솔루션", "LG Energy Solution", "lgensol.com"),
    "207940": makeMeta("삼성바이오로직스", "Samsung Biologics", "samsungbiologics.com"),
    "005380": makeMeta("현대차", "Hyundai Motor", "hyundai.com"),
    "068270": makeMeta("셀트리온", "Celltrion", "celltrion.com"),
    "000270": makeMeta("기아", "Kia", "kia.com"),
    "105560": makeMeta("KB금융", "KB Financial Group", "kbfg.com"),
    "035420": makeMeta("NAVER", "NAVER", "navercorp.com"),
    "055550": makeMeta("신한지주", "Shinhan Financial Group", "shinhan.com"),
    "005490": makeMeta("POSCO홀딩스", "POSCO Holdings", "posco.com"),
    "006400": makeMeta("삼성SDI", "Samsung SDI", "samsungsdi.com"),
    "035720": makeMeta("카카오", "Kakao", "kakaocorp.com"),
    "051910": makeMeta("LG화학", "LG Chem", "lgchem.com"),
    "028260": makeMeta("삼성물산", "Samsung C&T", "samsungcnt.com"),
    "086790": makeMeta("하나금융지주", "Hana Financial Group", "hanafn.com"),
    "015760": makeMeta("한국전력", "KEPCO", "kepco.co.kr"),
    "329180": makeMeta("HD현대중공업", "HD Hyundai Heavy Industries", "hd-hhi.com"),
    "138040": makeMeta("메리츠금융지주", "Meritz Financial Group", "meritzfinancialgroup.com"),
    "032830": makeMeta("삼성생명", "Samsung Life", "samsunglife.com"),
    "259960": makeMeta("크래프톤", "Krafton", "krafton.com"),
    "033780": makeMeta("KT&G", "KT&G", "ktng.com"),
    "011200": makeMeta("HMM", "HMM", "hmm21.com"),
    "316140": makeMeta("우리금융지주", "Woori Financial Group", "woorifg.com"),
    "034020": makeMeta("두산에너빌리티", "Doosan Enerbility", "doosanenerbility.com"),
    "003490": makeMeta("대한항공", "Korean Air", "koreanair.com"),
    "066570": makeMeta("LG전자", "LG Electronics", "lge.com"),
    "003670": makeMeta("포스코퓨처엠", "POSCO Future M", "poscofuturem.com"),
    "009150": makeMeta("삼성전기", "Samsung Electro-Mechanics", "samsung.com"),
    "012450": makeMeta("한화에어로스페이스", "Hanwha Aerospace", "hanwhaaerospace.com"),
  },

  NASDAQ: {
    AAPL: makeMeta("애플", "Apple", "apple.com"),
    MSFT: makeMeta("마이크로소프트", "Microsoft", "microsoft.com"),
    NVDA: makeMeta("엔비디아", "NVIDIA", "nvidia.com"),
    AMZN: makeMeta("아마존", "Amazon", "amazon.com"),
    GOOGL: makeMeta("알파벳 A", "Alphabet A", "google.com"),
    META: makeMeta("메타", "Meta", "meta.com"),
    AVGO: makeMeta("브로드컴", "Broadcom", "broadcom.com"),
    TSLA: makeMeta("테슬라", "Tesla", "tesla.com"),
    COST: makeMeta("코스트코", "Costco", "costco.com"),
    NFLX: makeMeta("넷플릭스", "Netflix", "netflix.com"),
    ADBE: makeMeta("어도비", "Adobe", "adobe.com"),
    PEP: makeMeta("펩시코", "PepsiCo", "pepsico.com"),
    QCOM: makeMeta("퀄컴", "Qualcomm", "qualcomm.com"),
    CSCO: makeMeta("시스코", "Cisco", "cisco.com"),
    AMD: makeMeta("AMD", "AMD", "amd.com"),
    INTU: makeMeta("인튜이트", "Intuit", "intuit.com"),
    TXN: makeMeta("텍사스인스트루먼트", "Texas Instruments", "ti.com"),
    ISRG: makeMeta("인튜이티브서지컬", "Intuitive Surgical", "intuitive.com"),
    AZN: makeMeta("아스트라제네카", "AstraZeneca", "astrazeneca.com"),
    PLTR: makeMeta("팔란티어", "Palantir", "palantir.com"),
    ADI: makeMeta("아날로그디바이스", "Analog Devices", "analog.com"),
    MRVL: makeMeta("마벨", "Marvell", "marvell.com"),
    MU: makeMeta("마이크론", "Micron", "micron.com"),
    FI: makeMeta("파이서브", "Fiserv", "fiserv.com"),
    AMGN: makeMeta("암젠", "Amgen", "amgen.com"),
    GILD: makeMeta("길리어드", "Gilead Sciences", "gilead.com"),
    INTC: makeMeta("인텔", "Intel", "intel.com"),
    ABNB: makeMeta("에어비앤비", "Airbnb", "airbnb.com"),
    BKNG: makeMeta("부킹홀딩스", "Booking Holdings", "bookingholdings.com"),
    SBUX: makeMeta("스타벅스", "Starbucks", "starbucks.com"),
  },
};

export function getAssetStaticMeta(market, symbol) {
  const m = String(market || "").toUpperCase();
  const s = String(symbol || "").toUpperCase();
  return ASSET_META[m]?.[s] || null;
}

export function withStaticAssetMeta(asset) {
  const meta = getAssetStaticMeta(asset?.market, asset?.symbol);
  if (!meta) return { ...asset };

  return {
    ...asset,
    name: asset?.name || meta.name,
    displayNameEN: asset?.displayNameEN || meta.displayNameEN || meta.name,
    iconUrl: asset?.iconUrl || meta.iconUrl || "",
  };
}