const API = "https://api.frankfurter.app";

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function subtractDay(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() - days);
  return formatLocalDate(d);
}

async function fetchRatesByKrw(date) {
  // 1 KRW 당 각 통화값을 받아온 뒤 역산해서 "1통화 = 몇 원" 형태로 변환
  const url = `${API}/${date}?from=KRW&to=USD,JPY,CNY,EUR,AUD`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("fx api error");
  }

  const json = await res.json();
  const rates = json?.rates || {};

  const invert = (v) => {
    if (typeof v !== "number" || !isFinite(v) || v === 0) {
      throw new Error("invalid fx rate");
    }
    return 1 / v;
  };

  return {
    USDKRW: invert(rates.USD),
    JPYKRW: invert(rates.JPY),
    CNYKRW: invert(rates.CNY),
    EURKRW: invert(rates.EUR),
    AUDKRW: invert(rates.AUD),
  };
}

async function findLatestAvailableRates(startDate, maxBacktrack = 10) {
  for (let i = 0; i <= maxBacktrack; i += 1) {
    const target = subtractDay(startDate, i);
    try {
      const rates = await fetchRatesByKrw(target);
      return { date: target, rates };
    } catch {
      // 다음 이전 날짜 재시도
    }
  }
  throw new Error("No available fx data found");
}

export async function fetchFx() {
  const today = formatLocalDate(new Date());

  const latestResult = await findLatestAvailableRates(today, 10);
  const previousResult = await findLatestAvailableRates(
    subtractDay(latestResult.date, 1),
    10
  );

  return {
    updatedDate: latestResult.date,
    baseDate: latestResult.date,
    previousDate: previousResult.date,
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