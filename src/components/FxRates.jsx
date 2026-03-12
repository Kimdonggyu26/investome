import { useEffect, useState } from "react";
import { fetchFx } from "../api/fxApi";
import "./FxRates.css";

const FX = [
  { key: "USDKRW", label: "미국 달러", code: "USD", flag: "https://flagcdn.com/w40/us.png" },
  { key: "JPYKRW", label: "일본 엔", code: "JPY", flag: "https://flagcdn.com/w40/jp.png" },
  { key: "CNYKRW", label: "중국 위안", code: "CNY", flag: "https://flagcdn.com/w40/cn.png" },
  { key: "EURKRW", label: "유로", code: "EUR", flag: "https://flagcdn.com/w40/eu.png" },
  { key: "AUDKRW", label: "호주 달러", code: "AUD", flag: "https://flagcdn.com/w40/au.png" },
];

function fmt(n) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function getDirection(v) {
  if (typeof v !== "number" || !isFinite(v)) return "neutral";
  if (v > 0) return "up";
  if (v < 0) return "down";
  return "neutral";
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
    <section className="fxCard" id="fx">
      <div className="fxHeader">
        <div className="fxHeading">
          <div className="fxEyebrow">
            <span className="fxLiveBadge">
              <span className="fxLiveDot" />
              LIVE FX
            </span>
            <span className="fxDatePill">기준일 {fx?.updatedDate || "-"}</span>
          </div>

          <div className="fxTitle">오늘의 환율</div>
          <div className="fxSub">주요 통화의 원화 기준 시세와 전일 대비 흐름</div>
        </div>
      </div>

      {err && (
        <div className="fxError">
          환율 데이터를 불러오지 못했어요.
        </div>
      )}

      <div className="fxList">
        {FX.map((item) => {
          const now = fx?.[item.key];
          const base = fx?.changes?.[item.key];

          const diff = diffValue(now, base);
          const pct = changePct(now, base);
          const direction = getDirection(diff);

          return (
            <article className="fxRow" key={item.key}>
              <div className="fxRowMain">
                <div className="fxFlag" aria-hidden="true">
                  <img src={item.flag} alt="" />
                </div>

                <div className="fxMeta">
                  <div className="fxTopLine">
                    <span className="fxName">{item.label}</span>
                    <span className="fxCode">{item.code}</span>
                  </div>

                  <div className="fxPrice">
                    {fmt(now)}
                    {now !== null && now !== undefined && (
                      <span className="fxUnit">원</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="fxRight">
                <div className={`fxChangeBadge ${direction}`}>
                  <span className="fxArrow">
                    {direction === "up" ? "▲" : direction === "down" ? "▼" : "•"}
                  </span>
                  <span>{formatPct(pct)}</span>
                </div>

                <div className={`fxDiff ${direction}`}>
                  전일 대비 {formatDiff(diff)}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="fxFooter">
        <span>Data Source</span>
        <strong>Frankfurter</strong>
      </div>
    </section>
  );
}