// src/components/FxRates.jsx
import { useEffect, useRef, useState } from "react";
import { fetchFx } from "../api/fxApi";
import "./FxRates.css";

const FX = [
  {
    key: "USDKRW",
    label: "미국 / USD",
    flag: "https://flagcdn.com/w40/us.png",
  },
  {
    key: "JPYKRW",
    label: "일본 / JPY",
    flag: "https://flagcdn.com/w40/jp.png",
  },
  {
    key: "CNYKRW",
    label: "중국 / CNY",
    flag: "https://flagcdn.com/w40/cn.png",
  },
  {
    key: "EURKRW",
    label: "유럽 / EUR",
    flag: "https://flagcdn.com/w40/eu.png",
  },
  {
    key: "AUDKRW",
    label: "호주 / AUD",
    flag: "https://flagcdn.com/w40/au.png",
  },
];

function fmt(n) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  return `${n.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원`;
}

function changePct(now, prev) {
  if (typeof now !== "number" || typeof prev !== "number" || !isFinite(prev) || prev === 0) return null;
  return ((now - prev) / prev) * 100;
}

function color(p) {
  if (typeof p !== "number") return "rgba(255,255,255,0.55)";
  if (p > 0) return "rgba(80, 255, 170, 0.95)"; // neon green
  if (p < 0) return "rgba(255,120,170,0.95)";   // pink
  return "rgba(255,255,255,0.55)";
}

export default function FxRates() {
  const [fx, setFx] = useState(null);
  const [err, setErr] = useState(null);
  const prevRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setErr(null);
        const data = await fetchFx();

        const prev = prevRef.current;
        prevRef.current = data;

        if (!mounted) return;
        setFx({ ...data, _prev: prev });
      } catch (e) {
        if (!mounted) return;
        setErr(e);
      }
    };

    load();
    const t = setInterval(load, 10000); // 10초마다 갱신
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

        <div className="fxUpdated">{fx?.updatedUtc ? "updated" : ""}</div>
      </div>

      {err && (
        <div className="muted" style={{ marginTop: 10 }}>
          환율을 불러오지 못했어요.
        </div>
      )}

      <div className="fxList">
        {FX.map((c) => {
          const now = fx?.[c.key];
          const prev = fx?._prev?.[c.key];
          const p = changePct(now, prev);

          const col = color(p);
          const sign = typeof p === "number" && p > 0 ? "▲" : "▼";
          const pctText = typeof p === "number" ? `${sign} ${Math.abs(p).toFixed(2)}%` : "-";

          return (
            <div className="fxRow" key={c.key}>
              <div className="fxLeft">
                <div className="fxFlag">
                  <img src={c.flag} alt="" />
                </div>

                <div className="fxMeta">
                  <div className="fxValue">{fmt(now)}</div>
                  <div className="fxLabel">{c.label}</div>
                </div>
              </div>

              <div className="fxRight" style={{ color: col }}>
                {pctText}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fxFoot muted">{fx?.updatedUtc || ""}</div>
    </div>
  );
}