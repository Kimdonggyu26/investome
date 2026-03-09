import { useEffect, useRef, useState } from "react";
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

function colorByChange(pct) {
  if (typeof pct !== "number") return "rgba(255,255,255,0.88)";
  if (pct > 0) return "rgba(80,255,170,0.95)";
  if (pct < 0) return "rgba(255,120,170,0.95)";
  return "rgba(255,255,255,0.88)";
}

function Avatar({ iconUrl, name }) {
  const [imgError, setImgError] = useState(false);

  if (iconUrl && !imgError) {
    return (
      <img
        className="avatar"
        src={iconUrl}
        alt={name}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  const initial = (name || "?").trim().slice(0, 1);
  return <div className="avatar avatarFallback">{initial}</div>;
}

export default function RankingTable() {
  const navigate = useNavigate();

  const [market, setMarket] = useState("CRYPTO");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [flashMap, setFlashMap] = useState({});

  const prevRowsRef = useRef([]);
  const flashTimerRef = useRef(null);

  useEffect(() => {
    let alive = true;

    async function fetchRows() {
      try {
        setErr(null);

        let nextRows = [];

        if (market === "CRYPTO") {
          nextRows = await fetchCryptoTop30KRW();
        } else if (market === "KOSPI") {
          const realOrNull = await fetchKospiTop30KRW().catch(() => null);
          nextRows = realOrNull ?? getKoreanDummyTop30("KOSPI");
        } else {
          const realOrNull = await fetchNasdaqTop30KRW().catch(() => null);
          nextRows = realOrNull ?? getKoreanDummyTop30("NASDAQ");
        }

        if (!alive) return;

        const prevMap = Object.fromEntries(
          prevRowsRef.current.map((r) => [r.symbol, r])
        );

        const flashes = {};
        nextRows.forEach((r) => {
          const prev = prevMap[r.symbol];
          if (!prev) return;

          const priceChanged = prev.priceKRW !== r.priceKRW;
          const pctChanged = prev.changePct !== r.changePct;

          if (priceChanged || pctChanged) {
            flashes[r.symbol] =
              typeof r.changePct === "number" && r.changePct < 0 ? "down" : "up";
          }
        });

        setRows(nextRows);
        prevRowsRef.current = nextRows;

        if (flashTimerRef.current) {
          clearTimeout(flashTimerRef.current);
        }

        if (Object.keys(flashes).length > 0) {
          setFlashMap(flashes);
          flashTimerRef.current = setTimeout(() => {
            setFlashMap({});
          }, 1100);
        }
      } catch (e) {
        if (!alive) return;
        setErr(e);
      }
    }

    fetchRows();
    const t = setInterval(fetchRows, 20_000);

    return () => {
      alive = false;
      clearInterval(t);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
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
          데이터를 불러오지 못했어요.
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
            {rows.map((r) => {
              const flash = flashMap[r.symbol];
              const rowFlashClass =
                flash === "up"
                  ? "rowFlashUp"
                  : flash === "down"
                    ? "rowFlashDown"
                    : "";

              const valueClass =
                flash === "up"
                  ? "valueUpdate valueGlowUp"
                  : flash === "down"
                    ? "valueUpdate valueGlowDown"
                    : "";

              return (
                <tr
                  key={`${market}-${r.rank}-${r.symbol}`}
                  className={rowFlashClass}
                  onClick={() => navigate(`/asset/${market}/${r.symbol}`)}
                  title="클릭해서 상세보기"
                >
                  <td className="rankCell">{r.rank}</td>

                  <td>
                    <div className="nameCell">
                      <Avatar iconUrl={r.iconUrl} name={r.name} />
                      <div className="nameText">
                        <div className="nameMain">{r.name}</div>
                        <div className="muted nameSub">
                          {r.displayNameEN && r.displayNameEN !== r.name
                            ? `${r.symbol} · ${r.displayNameEN}`
                            : r.symbol}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>{formatCapKRW(r.capKRW)}</td>

                  <td
                    className={valueClass}
                    style={{
                      color: colorByChange(r.changePct),
                      fontWeight: 900,
                    }}
                  >
                    {formatKRW(r.priceKRW)}
                  </td>

                  <td
                    className={valueClass}
                    style={{
                      color: colorByChange(r.changePct),
                      fontWeight: 900,
                    }}
                  >
                    {typeof r.changePct === "number"
                      ? `${r.changePct > 0 ? "+" : ""}${r.changePct.toFixed(2)}%`
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}