import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RankingTable.css";
import {
  fetchCryptoTop30KRW,
  fetchKospiTop30KRW,
  fetchNasdaqTop30KRW,
  getKoreanDummyTop30,
} from "../api/rankingApi";

const MARKETS = ["KOSPI", "NASDAQ", "CRYPTO"];

function formatCapKRW(n) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  const JO = 1_000_000_000_000;
  const EOK = 100_000_000;
  if (n >= JO) return `${Math.floor(n / JO).toLocaleString("ko-KR")}조`;
  if (n >= EOK) return `${Math.floor(n / EOK).toLocaleString("ko-KR")}억`;
  return "-";
}

function formatKRW(n) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

// ✅ 상승: 네온 그린 / 하락: 핑크 레드
function colorByChange(pct) {
  if (typeof pct !== "number") return "rgba(255,255,255,0.88)";
  if (pct > 0) return "rgba(80, 255, 170, 0.95)";
  if (pct < 0) return "rgba(255,120,170,0.95)";
  return "rgba(255,255,255,0.88)";
}

function ChangeText({ pct }) {
  const isNum = typeof pct === "number" && isFinite(pct);
  const col = colorByChange(pct);
  const sign = isNum && pct > 0 ? "+" : "";
  return (
    <span style={{ color: col, fontWeight: 900 }}>
      {isNum ? `${sign}${pct.toFixed(2)}%` : "-"}
    </span>
  );
}

function Avatar({ iconUrl, name }) {
  if (iconUrl) return <img className="avatar" src={iconUrl} alt={name} loading="lazy" />;
  const initial = (name || "?").trim().slice(0, 1);
  return <div className="avatar avatarFallback">{initial}</div>;
}

export default function RankingTable() {
  const navigate = useNavigate();
  const [market, setMarket] = useState("CRYPTO");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setErr(null);

        if (market === "CRYPTO") {
          const real = await fetchCryptoTop30KRW();
          if (!alive) return;
          setRows(real);
          return;
        }

        if (market === "KOSPI") {
          const realOrNull = await fetchKospiTop30KRW().catch(() => null);
          if (!alive) return;
          setRows(realOrNull ?? getKoreanDummyTop30("KOSPI"));
          return;
        }

        if (market === "NASDAQ") {
          const realOrNull = await fetchNasdaqTop30KRW().catch(() => null);
          if (!alive) return;
          setRows(realOrNull ?? getKoreanDummyTop30("NASDAQ"));
          return;
        }
      } catch (e) {
        if (!alive) return;
        setErr(e);
      }
    }

    load();
    const t = setInterval(load, market === "CRYPTO" ? 60_000 : 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [market]);

  return (
    <div className="rankingCard" id="ranking">
      <div className="rankingHeader">
        <h3>시가총액 TOP30</h3>

        <div className="marketTabs">
          {MARKETS.map((m) => (
            <button
              key={m}
              className={market === m ? "active" : ""}
              onClick={() => setMarket(m)}
              type="button"
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="muted" style={{ marginBottom: 10 }}>
          랭킹을 불러오지 못했어요.
        </div>
      )}

      <div className="rankingScroll luxuryScroll">
        <table className="rankingTable">
          <thead>
            <tr>
              <th style={{ width: 76 }}>순위</th>
              <th>종목</th>
              <th style={{ width: 170 }}>시가총액</th>
              <th style={{ width: 170 }}>현재가</th>
              <th style={{ width: 120 }}>등락률</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={`${market}-${r.rank}-${r.symbol}`}  // ✅ index 사용 안 함
                onClick={() => navigate(`/asset/${market}/${r.symbol}`)}
                title="클릭해서 상세보기"
              >
                <td className="rankCell">{r.rank}</td>

                <td>
                  <div className="nameCell">
                    <Avatar iconUrl={r.iconUrl} name={r.name} />
                    <div className="nameText">
                      <div className="nameMain">{r.name}</div>
                      <div className="muted nameSub">{r.symbol}</div>
                    </div>
                  </div>
                </td>

                <td>{formatCapKRW(r.capKRW)}</td>

                <td style={{ color: colorByChange(r.changePct), fontWeight: 900 }}>
                  {formatKRW(r.priceKRW)}
                </td>

                <td>
                  <ChangeText pct={r.changePct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="scrollGlowTop" />
        <div className="scrollGlowBottom" />
      </div>
    </div>
  );
}