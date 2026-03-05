// src/api/fxApi.js
export async function fetchFx() {
  const res = await fetch("/fx/v6/latest/USD");
  if (!res.ok) throw new Error(`FX failed: ${res.status}`);
  const json = await res.json();
  const r = json?.rates || {};

  // USD base로: 1 통화의 KRW 가격
  const USDKRW = r.KRW ?? null;
  const JPYKRW = r.KRW && r.JPY ? r.KRW / r.JPY : null; // 1 JPY -> KRW
  const CNYKRW = r.KRW && r.CNY ? r.KRW / r.CNY : null; // 1 CNY -> KRW
  const EURKRW = r.KRW && r.EUR ? r.KRW / r.EUR : null; // 1 EUR -> KRW
  const AUDKRW = r.KRW && r.AUD ? r.KRW / r.AUD : null; // 1 AUD -> KRW

  return {
    updatedUtc: json?.time_last_update_utc ?? "",
    USDKRW,
    JPYKRW,
    CNYKRW,
    EURKRW,
    AUDKRW,
  };
}