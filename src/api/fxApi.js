function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildFxSnapshot(rateMap = {}) {
  const KRW = rateMap.KRW;
  const JPY = rateMap.JPY;
  const CNY = rateMap.CNY;
  const EUR = rateMap.EUR;
  const AUD = rateMap.AUD;

  return {
    USDKRW: typeof KRW === "number" ? KRW : null,
    JPYKRW:
      typeof KRW === "number" && typeof JPY === "number" && JPY !== 0
        ? KRW / JPY
        : null,
    CNYKRW:
      typeof KRW === "number" && typeof CNY === "number" && CNY !== 0
        ? KRW / CNY
        : null,
    EURKRW:
      typeof KRW === "number" && typeof EUR === "number" && EUR !== 0
        ? KRW / EUR
        : null,
    AUDKRW:
      typeof KRW === "number" && typeof AUD === "number" && AUD !== 0
        ? KRW / AUD
        : null,
  };
}

export async function fetchFx() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const url =
    `https://api.frankfurter.app/${toYmd(start)}..${toYmd(end)}` +
    `?from=USD&to=KRW,JPY,CNY,EUR,AUD`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`FX failed: ${res.status}`);

  const json = await res.json();
  const rates = json?.rates || {};
  const dates = Object.keys(rates).sort();

  if (dates.length === 0) {
    throw new Error("No FX data");
  }

  const latestDate = dates[dates.length - 1];
  const prevDate = dates[dates.length - 2] || latestDate;

  const latest = buildFxSnapshot(rates[latestDate]);
  const previous = buildFxSnapshot(rates[prevDate]);

  return {
    updatedDate: latestDate,
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