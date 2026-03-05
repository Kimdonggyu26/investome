export async function fetchFx() {
  // No-key endpoint (USD base)
  const res = await fetch("/fx/v6/latest/USD");
  if (!res.ok) throw new Error(`FX failed: ${res.status}`);
  const json = await res.json();

  const r = json?.rates || {};
  const USDKRW = r.KRW;

  // 1 JPY in KRW = (USD->KRW) / (USD->JPY)
  const JPYKRW = (r.KRW && r.JPY) ? (r.KRW / r.JPY) : null;

  // 1 EUR in KRW = (USD->KRW) / (USD->EUR)
  const EURKRW = (r.KRW && r.EUR) ? (r.KRW / r.EUR) : null;

  return {
    updatedUtc: json?.time_last_update_utc ?? "",
    USDKRW,
    JPYKRW,
    EURKRW,
  };
}