import { useEffect, useState } from "react";
import { fetchNews } from "../api/newsApi";

function ymd(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}/${m}/${day}`;
}

export default function NewsList() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchNews({ topic: "global economy", limit: 10 })
      .then(setItems)
      .catch(setErr);
  }, []);

  return (
    <div className="card" id="news" style={{ padding: 18 }}>
      <h3 style={{ margin: 0 }}>글로벌 경제 주요 소식</h3>
      <hr className="hr" />

      {err && <div className="muted">뉴스를 불러오지 못했어요.</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((n) => (
          <a
            key={n.link}
            href={n.link}
            target="_blank"
            rel="noreferrer"
            className="card"
            style={{
              padding: 12,
              textDecoration: "none",
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              alignItems: "baseline",
              background: "rgba(255,255,255,0.02)",
            }}
            title="클릭해서 기사로 이동"
          >
            <span style={{ fontWeight: 800, lineHeight: 1.35 }}>
              {n.title}
            </span>

            <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              {ymd(n.pubDate)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}