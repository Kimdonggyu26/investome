import { useEffect, useMemo, useState } from "react";
import { fetchNews } from "../api/newsApi";
import "../styles/NewsList.css";

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "crypto", label: "코인(암호화폐)" },
  { key: "domestic", label: "국내증시" },
  { key: "global", label: "해외증시" },
];

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

  [
    "속보",
    "급등",
    "급락",
    "금리",
    "환율",
    "물가",
    "반도체",
    "미국",
    "연준",
    "코스피",
    "나스닥",
    "비트코인",
    "이더리움",
    "테슬라",
    "엔비디아",
  ].forEach((k) => {
    if (t.includes(k)) s += 3;
  });

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
  const [category, setCategory] = useState("all");

  useEffect(() => {
    let alive = true;

    fetchNews({ category, limit })
      .then((data) => {
        if (!alive) return;
        setItems(data);
        setErr(null);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e);
      });

    return () => {
      alive = false;
    };
  }, [category, limit]);

  const view = useMemo(() => {
    const arr = [...items];

    if (mode === "latest") {
      arr.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    } else {
      arr.sort((a, b) => popularScore(b) - popularScore(a));
    }

    return arr;
  }, [items, mode]);

  const featured = pageMode ? view[0] : null;
  const rest = pageMode ? view.slice(1) : view;

  return (
    <div className={`card newsWrap ${pageMode ? "newsWrapPage" : ""}`} id="news">
      <div className="newsHeader">
        <div>
          <h3 className="newsHeading">{title}</h3>
          <div className="newsDesc">
            실시간으로 모아본 경제 · 증시 · 암호화폐 뉴스
          </div>
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
        </div>
      </div>

      <div className="newsCategoryRow">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`newsCategoryChip ${category === c.key ? "active" : ""}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {err && <div className="muted">뉴스를 불러오지 못했어요.</div>}

      {!err && pageMode && featured && (
        <a
          href={featured.link}
          target="_blank"
          rel="noreferrer"
          className="newsFeatured"
          title="클릭해서 기사로 이동"
        >
          <div className="newsFeaturedBadge">FEATURED</div>
          <div className="newsFeaturedTitle">{featured.title}</div>
          <div className="newsFeaturedMeta">
            <span>{featured.source || "Google News"}</span>
            <span className="newsDot">•</span>
            <span>{ymdhm(featured.pubDate)}</span>
          </div>
        </a>
      )}

      <div className={`newsGrid ${pageMode ? "newsGridPage" : ""}`}>
        {rest.map((n, idx) => (
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