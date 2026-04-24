import { useEffect, useMemo, useState } from "react";
import { fetchNews } from "../api/newsApi";

function popularScore(item) {
  const title = String(item?.title || "").toLowerCase();
  let score = 0;

  [
    "코스피",
    "나스닥",
    "비트코인",
    "금리",
    "환율",
    "반도체",
    "애플",
    "엔비디아",
    "테슬라",
    "삼성전자",
    "미국 증시",
    "국내증시",
    "가상자산",
  ].forEach((keyword) => {
    if (title.includes(keyword)) score += 3;
  });

  score += Math.min(6, Math.floor(title.length / 14));

  const published = new Date(item?.pubDate).getTime();
  if (!Number.isNaN(published)) {
    const hoursAgo = (Date.now() - published) / 36e5;
    score += Math.max(0, 8 - Math.floor(hoursAgo / 4));
  }

  return score;
}

function relativeLabel(dateStr) {
  const timestamp = new Date(dateStr).getTime();
  if (Number.isNaN(timestamp)) return "방금";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  return `${Math.floor(hours / 24)}일 전`;
}

export default function SidebarNewsTicker({ compact = false }) {
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const data = await fetchNews({ category: "all", sort: "popular", limit: 20 });
        if (!alive) return;
        setItems(
          [...data]
            .sort((a, b) => popularScore(b) - popularScore(a))
            .slice(0, 5)
        );
      } catch {
        if (!alive) return;
        setItems([]);
      }
    }

    load();
    const refreshTimer = window.setInterval(load, 120000);

    return () => {
      alive = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (items.length <= 1) return undefined;

    const slideTimer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 3200);

    return () => window.clearInterval(slideTimer);
  }, [items]);

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, items.length]);

  const visibleItems = useMemo(() => items.slice(0, 5), [items]);

  if (visibleItems.length === 0) return null;

  return (
    <section className={`card sideNewsTicker${compact ? " compact" : ""}`}>
      <div className="sideNewsTickerHeader">
        <div>
          <div className="sideNewsTickerEyebrow">실시간 인기 뉴스</div>
          {!compact && <div className="sideNewsTickerTitle">지금 많이 보는 뉴스</div>}
        </div>
        <div className="sideNewsTickerBadge">TOP 5</div>
      </div>

      <div className="sideNewsTickerViewport">
        <div
          className="sideNewsTickerTrack"
          style={{ transform: `translateY(-${activeIndex * (compact ? 42 : 60)}px)` }}
        >
          {visibleItems.map((item, index) => (
            <a
              key={`${item.link}-${index}`}
              className="sideNewsTickerItem"
              href={item.link}
              target="_blank"
              rel="noreferrer"
            >
              <span className="sideNewsTickerRank">{index + 1}</span>
              <div className="sideNewsTickerCopy">
                <div className="sideNewsTickerHeadline">{item.title}</div>
                <div className="sideNewsTickerMeta">{relativeLabel(item.pubDate)}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
