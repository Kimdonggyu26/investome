import { useEffect, useState } from "react";
import { fetchFx } from "../api/fxApi";
import "./FxRates.css";

const FX = [
  { key: "USDKRW", label: "미국 / USD", flag: "https://flagcdn.com/w40/us.png" },
  { key: "JPYKRW", label: "일본 / JPY", flag: "https://flagcdn.com/w40/jp.png" },
  { key: "CNYKRW", label: "중국 / CNY", flag: "https://flagcdn.com/w40/cn.png" },
  { key: "EURKRW", label: "유럽 / EUR", flag: "https://flagcdn.com/w40/eu.png" },
  { key: "AUDKRW", label: "호주 / AUD", flag: "https://flagcdn.com/w40/au.png" },
];

function fmt(n) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function diffValue(now, base) {
  if (
    typeof now !== "number" ||
    typeof base !== "number" ||
    !isFinite(now) ||
    !isFinite(base)
  ) {
    return null;
  }
  return now - base;
}

function changePct(now, base) {
  if (
    typeof now !== "number" ||
    typeof base !== "number" ||
    !isFinite(now) ||
    !isFinite(base) ||
    base === 0
  ) {
    return null;
  }
  return ((now - base) / base) * 100;
}

function color(v) {
  if (typeof v !== "number") return "rgba(255,255,255,0.55)";
  if (v > 0) return "rgba(80,255,170,0.95)";
  if (v < 0) return "rgba(255,120,170,0.95)";
  return "rgba(255,255,255,0.55)";
}

function formatPct(p) {
  if (typeof p !== "number" || !isFinite(p)) return "-";
  const sign = p > 0 ? "+" : p < 0 ? "-" : "";
  const abs = Math.abs(p);

  if (abs < 0.01) return `${sign}${abs.toFixed(4)}%`;
  if (abs < 0.1) return `${sign}${abs.toFixed(3)}%`;
  return `${sign}${abs.toFixed(2)}%`;
}

function formatDiff(v) {
  if (typeof v !== "number" || !isFinite(v)) return "-";
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}${Math.abs(v).toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}원`;
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
        if (!mounted) return;
        setFx(data);
      } catch (e) {
        if (!mounted) return;
        setErr(e);
      }
    };

    load();
    const t = setInterval(load, 30_000);

    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="fxCard" id="fx">
      <div className="fxHeader">
        <div>
          <div className="fxTitle">오늘의 환율</div>
          <div className="fxSub">Today's Exchange Rate</div>
        </div>

        <div className="fxUpdated">{fx?.updatedDate || "-"}</div>
      </div>

      {err && (
        <div className="muted" style={{ marginTop: 10 }}>
          환율을 불러오지 못했어요.
        </div>
      )}

      <div className="fxList">
        {FX.map((c) => {
          const now = fx?.[c.key];
          const base = fx?.changes?.[c.key];

          const diff = diffValue(now, base);
          const pct = changePct(now, base);
          const col = color(diff);
          const valueText = fmt(now);

          const arrow =
            typeof diff === "number"
              ? diff > 0
                ? "▲"
                : diff < 0
                ? "▼"
                : "•"
              : "";

          return (
            <div className="fxRow" key={c.key}>
              <div className="fxLeft">
                <div className="fxFlag" aria-hidden="true">
                  <img src={c.flag} alt="" />
                </div>

                <div className="fxMeta">
                  <div className="fxValue">
                    {valueText}
                    {valueText !== "-" && <span className="fxUnit">원</span>}
                  </div>
                  <div className="fxLabel">{c.label}</div>
                </div>
              </div>

              <div className="fxRight" style={{ color: col }}>
                {typeof diff === "number" && typeof pct === "number" ? (
                  <>
                    <div className="fxPct">{formatPct(pct)}</div>
                    <div className="fxDiff">
                      {arrow} {formatDiff(diff)}
                    </div>
                  </>
                ) : (
                  "-"
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fxSource">Data Source : Frankfurter</div>
    </div>
  );
}