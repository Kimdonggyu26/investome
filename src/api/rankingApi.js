// src/api/rankingApi.js

const COINGECKO_MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets" +
  "?vs_currency=krw" +
  "&order=market_cap_desc" +
  "&per_page=30" +
  "&page=1" +
  "&sparkline=false" +
  "&price_change_percentage=24h";

function toCryptoRow(coin, index) {
  return {
    rank: coin.market_cap_rank ?? index + 1,
    name: coin.name ?? "-",
    symbol: (coin.symbol || "-").toUpperCase(),
    iconUrl: coin.image ?? "",
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

// 현재는 실데이터 API 미연결이라 null 반환 -> RankingTable에서 더미로 fallback
export async function fetchKospiTop30KRW() {
  return null;
}

export async function fetchNasdaqTop30KRW() {
  return null;
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
      symbol: item.symbol,
      iconUrl: "",
      capKRW: Math.max(50000000000000, Math.round(baseCap + wave * 15000000000000)),
      priceKRW: Math.max(1000, Math.round(basePrice + noise * 5000)),
      changePct: Number((wave * 2.15).toFixed(2)),
    };
  });
}

export function getKoreanDummyTop30(market) {
  const kospiNames = [
    { name: "삼성전자", symbol: "005930" },
    { name: "SK하이닉스", symbol: "000660" },
    { name: "LG에너지솔루션", symbol: "373220" },
    { name: "삼성바이오로직스", symbol: "207940" },
    { name: "현대차", symbol: "005380" },
    { name: "셀트리온", symbol: "068270" },
    { name: "기아", symbol: "000270" },
    { name: "KB금융", symbol: "105560" },
    { name: "NAVER", symbol: "035420" },
    { name: "신한지주", symbol: "055550" },
    { name: "POSCO홀딩스", symbol: "005490" },
    { name: "삼성SDI", symbol: "006400" },
    { name: "카카오", symbol: "035720" },
    { name: "LG화학", symbol: "051910" },
    { name: "삼성물산", symbol: "028260" },
    { name: "하나금융지주", symbol: "086790" },
    { name: "한국전력", symbol: "015760" },
    { name: "HD현대중공업", symbol: "329180" },
    { name: "메리츠금융지주", symbol: "138040" },
    { name: "삼성생명", symbol: "032830" },
    { name: "크래프톤", symbol: "259960" },
    { name: "KT&G", symbol: "033780" },
    { name: "HMM", symbol: "011200" },
    { name: "우리금융지주", symbol: "316140" },
    { name: "두산에너빌리티", symbol: "034020" },
    { name: "대한항공", symbol: "003490" },
    { name: "LG전자", symbol: "066570" },
    { name: "포스코퓨처엠", symbol: "003670" },
    { name: "삼성전기", symbol: "009150" },
    { name: "한화에어로스페이스", symbol: "012450" },
  ];

  const nasdaqNames = [
    { name: "애플", symbol: "AAPL" },
    { name: "마이크로소프트", symbol: "MSFT" },
    { name: "엔비디아", symbol: "NVDA" },
    { name: "아마존", symbol: "AMZN" },
    { name: "알파벳 A", symbol: "GOOGL" },
    { name: "메타", symbol: "META" },
    { name: "브로드컴", symbol: "AVGO" },
    { name: "테슬라", symbol: "TSLA" },
    { name: "코스트코", symbol: "COST" },
    { name: "넷플릭스", symbol: "NFLX" },
    { name: "어도비", symbol: "ADBE" },
    { name: "펩시코", symbol: "PEP" },
    { name: "퀄컴", symbol: "QCOM" },
    { name: "시스코", symbol: "CSCO" },
    { name: "AMD", symbol: "AMD" },
    { name: "인튜이트", symbol: "INTU" },
    { name: "텍사스인스트루먼트", symbol: "TXN" },
    { name: "인튜이티브서지컬", symbol: "ISRG" },
    { name: "아스트라제네카", symbol: "AZN" },
    { name: "팔란티어", symbol: "PLTR" },
    { name: "아날로그디바이스", symbol: "ADI" },
    { name: "마벨", symbol: "MRVL" },
    { name: "마이크론", symbol: "MU" },
    { name: "파이서브", symbol: "FI" },
    { name: "암젠", symbol: "AMGN" },
    { name: "길리어드", symbol: "GILD" },
    { name: "인텔", symbol: "INTC" },
    { name: "에어비앤비", symbol: "ABNB" },
    { name: "부킹홀딩스", symbol: "BKNG" },
    { name: "스타벅스", symbol: "SBUX" },
  ];

  return market === "KOSPI"
    ? makeDummyRows("KOSPI", kospiNames)
    : makeDummyRows("NASDAQ", nasdaqNames);
}