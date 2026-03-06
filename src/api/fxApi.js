// src/api/fxApi.js

const FX_URL = "https://open.er-api.com/v6/latest/USD";

export async function fetchFx() {
  const res = await fetch(FX_URL);
  if (!res.ok) throw new Error(`FX failed: ${res.status}`);

  const json = await res.json();
  const r = json?.rates || {};

  const USDKRW = typeof r.KRW === "number" ? r.KRW : null;
  const JPYKRW =
    typeof r.KRW === "number" && typeof r.JPY === "number" && r.JPY !== 0
      ? r.KRW / r.JPY
      : null;
  const CNYKRW =
    typeof r.KRW === "number" && typeof r.CNY === "number" && r.CNY !== 0
      ? r.KRW / r.CNY
      : null;
  const EURKRW =
    typeof r.KRW === "number" && typeof r.EUR === "number" && r.EUR !== 0
      ? r.KRW / r.EUR
      : null;
  const AUDKRW =
    typeof r.KRW === "number" && typeof r.AUD === "number" && r.AUD !== 0
      ? r.KRW / r.AUD
      : null;

  return {
    updatedUtc: json?.time_last_update_utc ?? "",
    USDKRW,
    JPYKRW,
    CNYKRW,
    EURKRW,
    AUDKRW,
  };
}