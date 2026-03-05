import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RankingTable.css";

const MARKETS = ["KOSPI", "NASDAQ", "CRYPTO"];

function krw(v) {
  if (typeof v !== "number") return "-";
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

// 더미 TOP30 생성 (나중에 API 붙일 때 이 부분만 교체하면 됨)
function makeTop30(market) {
  const rows = [];
  for (let i = 1; i <= 30; i++) {
    if (market === "KOSPI") {
      rows.push({
        rank: i,
        symbol: String(100000 + i),
        name: `KOSPI 종목 ${i}`,
        cap: 520_000_000_000_000 - i * 7_500_000_000_000, // 예시
        price: 80_000 - i * 650,
      });
    } else if (market === "NASDAQ") {
      rows.push({
        rank: i,
        symbol: `US${i}`,
        name: `NASDAQ 종목 ${i}`,
        cap: 3_400_000_000_000_000 - i * 45_000_000_000_000,
        price: 320_000 - i * 3_200,
      });
    } else {
      rows.push({
        rank: i,
        symbol: `C${i}`,
        name: `Crypto ${i}`,
        cap: 1_800_000_000_000_000 - i * 18_000_000_000_000,
        price: 12_000_000 - i * 110_000,
      });
    }
  }
  return rows;
}

export default function RankingTable() {
  const navigate = useNavigate();
  const [market, setMarket] = useState("KOSPI");

  const rows = useMemo(() => makeTop30(market), [market]);

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

      <div className="rankingScroll">
        <table className="rankingTable">
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th>종목</th>
              <th style={{ width: 170 }}>시가총액</th>
              <th style={{ width: 150 }}>현재가</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={`${market}-${r.rank}`}
                onClick={() => navigate(`/asset/${market}/${r.symbol}`)}
                title="클릭해서 상세보기"
              >
                <td>{r.rank}</td>
                <td>
                  <div style={{ fontWeight: 850 }}>{r.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {r.symbol}
                  </div>
                </td>
                <td>{krw(r.cap)}</td>
                <td>{krw(r.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        * 현재는 더미 TOP30이며, 추후 KOSPI/NASDAQ/CRYPTO 실데이터 API로 교체 예정
      </div>
    </div>
  );
}