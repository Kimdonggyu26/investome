const API = "https://api.frankfurter.app";

function toKoreanTodayLabel() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

async function fetchRates(date) {
  const url = `${API}/${date}?from=USD&to=KRW,JPY,CNY,EUR,AUD`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("fx api error");
  }

  const json = await res.json();

  return {
    USDKRW: json.rates.KRW,
    JPYKRW: json.rates.JPY,
    CNYKRW: json.rates.CNY,
    EURKRW: json.rates.EUR,
    AUDKRW: json.rates.AUD,
  };
}

function subtractDay(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0,10);
}

export async function fetchFxRates() {

  const today = new Date().toISOString().slice(0,10);

  let latestDate = today;
  let latest;

  try {
    latest = await fetchRates(today);
  } catch {

    latestDate = subtractDay(today,1);
    latest = await fetchRates(latestDate);
  }

  const prevDate = subtractDay(latestDate,1);

  let previous;

  try {
    previous = await fetchRates(prevDate);
  } catch {
    previous = latest;
  }

  return {
    updatedDate: toKoreanTodayLabel(),
    baseDate: latestDate,
    previousDate: prevDate,

    ...latest,

    changes: {
      USDKRW: previous.USDKRW,
      JPYKRW: previous.JPYKRW,
      CNYKRW: previous.CNYKRW,
      EURKRW: previous.EURKRW,
      AUDKRW: previous.AUDKRW,
    },
  };
}