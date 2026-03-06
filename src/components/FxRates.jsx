import { useEffect, useRef, useState } from "react";
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
  return `${n.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원`;
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

function todayText() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}. ${m}. ${day}`;
}

function formatPct(p) {
  if (typeof p !== "number" || !isFinite(p)) return "-";
  const abs = Math.abs(p);

  // 환율은 변화폭이 작아서 작은 값은 소수 4자리까지
  if (abs < 0.01) return `${abs.toFixed(4)}%`;
  if (abs < 0.1) return `${abs.toFixed(3)}%`;
  return `${abs.toFixed(2)}%`;
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

  // 오늘 첫값
  const baseRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setErr(null);
        const data = await fetchFx();

        if (!baseRef.current) {
          baseRef.current = data;
        }

        if (!mounted) return;
        setFx(data);
      } catch (e) {
        if (!mounted) return;
        setErr(e);
      }
    };

    load();
    const t = setInterval(load, 30_000); // 환율은 30초 정도 추천
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="fxCard" id="fx">
      <div className="fxHeader">
        <div>
          <div className="fxTitle">환율 모아보기</div>
          <div className="fxSub">Currency Exchange Rates at a Glance</div>
        </div>

        <div className="fxUpdated">{todayText()}</div>
      </div>

      {err && (
        <div className="muted" style={{ marginTop: 10 }}>
          환율을 불러오지 못했어요.
        </div>
      )}

      <div className="fxList">
        {FX.map((c) => {
          const now = fx?.[c.key];
          const base = baseRef.current?.[c.key];

          const diff = diffValue(now, base);
          const pct = changePct(now, base);

          const col = color(diff);
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
                  <div className="fxValue">{fmt(now)}</div>
                  <div className="fxLabel">{c.label}</div>
                </div>
              </div>

              <div className="fxRight" style={{ color: col }}>
                {typeof diff === "number" && typeof pct === "number"
                  ? `${arrow} ${formatDiff(diff)} (${formatPct(pct)})`
                  : "-"}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11,
          color: "rgba(255,255,255,0.45)",
          textAlign: "right",
          letterSpacing: ".3px",
        }}
      >
        Data Source : ER-API
      </div>
    </div>
  );
}