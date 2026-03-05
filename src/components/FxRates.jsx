import { useEffect, useState } from "react";
import { fetchFx } from "../api/fxApi";

function fmt(v) {
  if (typeof v !== "number") return "-";
  return "₩" + v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

export default function FxRates() {
  const [fx, setFx] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setErr(null);
        const data = await fetchFx();
        if (mounted) setFx(data);
      } catch (e) {
        if (mounted) setErr(e);
      }
    };

    load();
    const t = setInterval(load, 30 * 60 * 1000); // 30분
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="card" style={{ padding: 18 }}>
      <h3 style={{ margin: 0 }}>실시간 환율정보</h3>
      <hr className="hr" />

      {err && <div className="muted">환율을 불러오지 못했어요.</div>}

      <div style={{ display: "grid", gap: 10 }}>
        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.02)" }}>
          <div className="muted" style={{ fontSize: 12 }}>USD/KRW</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{fmt(fx?.USDKRW)}</div>
        </div>

        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.02)" }}>
          <div className="muted" style={{ fontSize: 12 }}>JPY/KRW (1 JPY)</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{fmt(fx?.JPYKRW)}</div>
        </div>

        <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.02)" }}>
          <div className="muted" style={{ fontSize: 12 }}>EUR/KRW (1 EUR)</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{fmt(fx?.EURKRW)}</div>
        </div>

        <div className="muted" style={{ fontSize: 12 }}>
          {fx?.updatedUtc ? `updated: ${fx.updatedUtc}` : ""}
        </div>
      </div>
    </div>
  );
}