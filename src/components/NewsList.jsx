import { useEffect, useMemo, useState } from "react";
import { fetchNews } from "../api/newsApi";
import "../styles/NewsList.css";

function ymd(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}/${m}/${day}`;
}

function popularScore(item) {
  const t = (item.title || "").toLowerCase();
  let s = 0;
  // 국내 뉴스에서 핫할 법한 키워드 가중치(임시)
  ["속보", "급등", "급락", "금리", "환율", "물가", "반도체", "미국", "연준", "코스피"].forEach((k) => {
    if (t.includes(k)) s += 3;
  });
  // 제목 길이가 너무 짧으면 점수 낮게
  s += Math.min(6, Math.floor((t.length || 0) / 12));
  // 최근성 약간 반영
  const d = new Date(item.pubDate).getTime();
  if (!Number.isNaN(d)) {
    const hoursAgo = (Date.now() - d) / 36e5;
    s += Math.max(0, 6 - Math.floor(hoursAgo / 6));
  }
  return s;
}

export default function NewsList() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [mode, setMode] = useState("latest"); // latest | hot

  useEffect(() => {
    fetchNews({ topic: "KR economy", limit: 12 })
      .then(setItems)
      .catch(setErr);
  }, []);

  const view = useMemo(() => {
    const arr = [...items];
    if (mode === "latest") {
      arr.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    } else {
      arr.sort((a, b) => popularScore(b) - popularScore(a));
    }
    return arr;
  }, [items, mode]);

  return (
    <div className="card" id="news" style={{ padding: 18 }}>
      <div className="newsHeader">
        <h3 style={{ margin: 0 }}>글로벌 경제 주요 소식</h3>

        <div className="newsTabs">
          <button
            type="button"
            className={mode === "latest" ? "active" : ""}
            onClick={() => setMode("latest")}
          >
            최신순
          </button>
          <button
            type="button"
            className={mode === "hot" ? "active" : ""}
            onClick={() => setMode("hot")}
          >
            인기순
          </button>
        </div>
      </div>

      <hr className="hr" />

      {err && <div className="muted">뉴스를 불러오지 못했어요.</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {view.map((n) => (
          <a
            key={n.link}
            href={n.link}
            target="_blank"
            rel="noreferrer"
            className="newsItem"
            title="클릭해서 기사로 이동"
          >
            <span className="newsTitle">{n.title}</span>
            <span className="newsDate">{ymd(n.pubDate)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}