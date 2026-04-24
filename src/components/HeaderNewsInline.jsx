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

export default function HeaderNewsInline() {
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

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [items]);

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(0);
  }, [activeIndex, items.length]);

  const visibleItems = useMemo(() => items.slice(0, 5), [items]);
  if (visibleItems.length === 0) return null;

  return (
    <div className="headerNewsInline" aria-label="실시간 인기 뉴스">
      <div className="headerNewsInlineLabel">실시간 인기 뉴스</div>
      <div className="headerNewsInlineViewport">
        <div
          className="headerNewsInlineTrack"
          style={{ transform: `translateY(-${activeIndex * 42}px)` }}
        >
          {visibleItems.map((item, index) => (
            <a
              key={`${item.link}-${index}`}
              className="headerNewsInlineItem"
              href={item.link}
              target="_blank"
              rel="noreferrer"
            >
              <span className="headerNewsInlineRank">{index + 1}</span>
              <div className="headerNewsInlineCopy">
                <div className="headerNewsInlineHeadline">{item.title}</div>
                <div className="headerNewsInlineMeta">{relativeLabel(item.pubDate)}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
