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
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function diffValue(now, base) {
  if (
    typeof now !== "number" ||
    typeof base !== "number" ||
    !Number.isFinite(now) ||
    !Number.isFinite(base)
  ) {
    return null;
  }
  return now - base;
}

function changePct(now, base) {
  if (
    typeof now !== "number" ||
    typeof base !== "number" ||
    !Number.isFinite(now) ||
    !Number.isFinite(base) ||
    base === 0
  ) {
    return null;
  }
  return ((now - base) / base) * 100;
}

function color(v) {
  if (typeof v !== "number") return "var(--muted)";
  if (v > 0) return "var(--up-strong)";
  if (v < 0) return "var(--down-strong)";
  return "var(--muted)";
}

function toneClass(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "isFlat";
  if (v > 0) return "isUp";
  if (v < 0) return "isDown";
  return "isFlat";
}

function formatPct(p) {
  if (typeof p !== "number" || !Number.isFinite(p)) return "-";
  const sign = p > 0 ? "+" : p < 0 ? "-" : "";
  const abs = Math.abs(p);

  if (abs < 0.01) return `${sign}${abs.toFixed(4)}%`;
  if (abs < 0.1) return `${sign}${abs.toFixed(3)}%`;
  return `${sign}${abs.toFixed(2)}%`;
}

function formatDiff(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "-";
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}${Math.abs(v).toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}원`;
}

function formatDateLabel(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
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
          <div className="tickerLiveBadge live sectionTickerBadge">
            <span className="tickerLiveDot" />
            <span>LIVE</span>
          </div>

          <div className="fxTitle">오늘의 환율</div>
          <div className="fxSub">원화 기준 주요 환율 현황</div>
        </div>

        <div className="fxUpdated">{formatDateLabel(fx?.updatedDate) || "불러오는 중..."}</div>
      </div>

      {err && (
        <div className="muted" style={{ marginTop: 10 }}>
          환율 데이터를 불러오지 못했어요.
        </div>
      )}

      <div className="fxList">
        {FX.map((c) => {
          const now = fx?.[c.key];
          const base = fx?.changes?.[c.key];

          const diff = diffValue(now, base);
          const pct = changePct(now, base);
          const col = color(diff);
          const tone = toneClass(diff);
          const valueText = fmt(now);

          const status =
            typeof diff === "number"
              ? diff > 0
                ? "상승"
                : diff < 0
                  ? "하락"
                  : "보합"
              : "";

          return (
            <div className={`fxRow ${tone}`} key={c.key}>
              <div className="fxLeft">
                <div className="fxFlag" aria-hidden="true">
                  <img src={c.flag} alt="" />
                </div>

                <div className="fxMeta">
                  <div className={`fxValue ${tone}`}>
                    {valueText}
                    {valueText !== "-" && <span className="fxUnit"> 원</span>}
                  </div>
                  <div className="fxLabel">{c.label}</div>
                </div>
              </div>

              <div className={`fxRight ${tone}`} style={{ color: col }}>
                {typeof diff === "number" && typeof pct === "number" ? (
                  <>
                    <div className="fxPct">{formatPct(pct)}</div>
                    <div className="fxDiff">
                      {status} {formatDiff(diff)}
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

      <div className="fxSource">데이터 출처 : Frankfurter</div>
    </div>
  );
}
