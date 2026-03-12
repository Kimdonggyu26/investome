const API = "https://api.frankfurter.app";

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function subtractDay(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

async function fetchRates(date) {
  // EUR 기준으로 받아서 각 통화의 KRW 환율로 변환
  // 예) json.rates.KRW = 1580, json.rates.USD = 1.09 라면
  // 1 USD = 1580 / 1.09 KRW
  const url = `${API}/${date}?from=EUR&to=KRW,USD,JPY,CNY,AUD`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("fx api error");
  }

  const json = await res.json();
  const rates = json?.rates || {};

  const krw = rates.KRW;
  const usd = rates.USD;
  const jpy = rates.JPY;
  const cny = rates.CNY;
  const aud = rates.AUD;

  if (
    typeof krw !== "number" ||
    typeof usd !== "number" ||
    typeof jpy !== "number" ||
    typeof cny !== "number" ||
    typeof aud !== "number"
  ) {
    throw new Error("invalid fx response");
  }

  return {
    actualDate: json.date,
    rates: {
      USDKRW: krw / usd,
      JPYKRW: krw / jpy,
      CNYKRW: krw / cny,
      EURKRW: krw,
      AUDKRW: krw / aud,
    },
  };
}

async function findLatestAvailableRates(startDate, maxBacktrack = 10) {
  for (let i = 0; i <= maxBacktrack; i += 1) {
    const target = subtractDay(startDate, i);

    try {
      const result = await fetchRates(target);
      return result;
    } catch {
      // 이전 날짜 재시도
    }
  }

  throw new Error("No available fx data found");
}

export async function fetchFx() {
  const today = formatDate(new Date());

  const latestResult = await findLatestAvailableRates(today, 10);
  const previousResult = await findLatestAvailableRates(
    subtractDay(latestResult.actualDate, 1),
    10
  );

  return {
    updatedDate: latestResult.actualDate,
    baseDate: latestResult.actualDate,
    previousDate: previousResult.actualDate,
    ...latestResult.rates,
    changes: {
      USDKRW: previousResult.rates.USDKRW,
      JPYKRW: previousResult.rates.JPYKRW,
      CNYKRW: previousResult.rates.CNYKRW,
      EURKRW: previousResult.rates.EURKRW,
      AUDKRW: previousResult.rates.AUDKRW,
    },
  };
}