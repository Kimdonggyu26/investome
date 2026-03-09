import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNews } from "../api/newsApi";
import "../styles/NewsList.css";

function ymdhm(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function popularScore(item) {
  const t = (item.title || "").toLowerCase();
  let s = 0;

  ["속보", "급등", "급락", "금리", "환율", "물가", "반도체", "미국", "연준", "코스피", "나스닥", "비트코인"].forEach(
    (k) => {
      if (t.includes(k)) s += 3;
    }
  );

  s += Math.min(6, Math.floor((t.length || 0) / 12));

  const d = new Date(item.pubDate).getTime();
  if (!Number.isNaN(d)) {
    const hoursAgo = (Date.now() - d) / 36e5;
    s += Math.max(0, 8 - Math.floor(hoursAgo / 4));
  }

  return s;
}

export default function NewsList({
  title = "글로벌 경제 주요 소식",
  limit = 12,
  pageMode = false,
}) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [mode, setMode] = useState("latest");

  useEffect(() => {
    fetchNews({ topic: "경제 증시 환율 코인", limit })
      .then(setItems)
      .catch(setErr);
  }, [limit]);

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
    <div className={`card ${pageMode ? "newsPageCard" : ""}`} id="news" style={{ padding: 18 }}>
      <div className="newsHeader">
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {pageMode && (
            <div className="newsDesc">
              경제 / 증시 / 환율 / 코인 관련 뉴스를 한 번에 모아봅니다.
            </div>
          )}
        </div>

        <div className="newsHeaderRight">
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

          {!pageMode && (
            <Link className="newsMoreBtn" to="/news">
              전체보기
            </Link>
          )}
        </div>
      </div>

      <hr className="hr" />

      {err && <div className="muted">뉴스를 불러오지 못했어요.</div>}

      <div className="newsGrid">
        {view.map((n, idx) => (
          <a
            key={`${n.link}-${idx}`}
            href={n.link}
            target="_blank"
            rel="noreferrer"
            className="newsItem"
            title="클릭해서 기사로 이동"
          >
            <div className="newsMain">
              <span className="newsTitle">{n.title}</span>
              <div className="newsMeta">
                <span className="newsSource">{n.source || "Google News"}</span>
                <span className="newsDot">•</span>
                <span className="newsDate">{ymdhm(n.pubDate)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}