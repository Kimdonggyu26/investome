import { useEffect, useMemo, useState } from "react";
import { fetchNews } from "../api/newsApi";

function popularScore(item) {
  const t = (item.title || "").toLowerCase();
  let s = 0;

  [
    "breaking",
    "surge",
    "drop",
    "inflation",
    "fed",
    "oil",
    "semiconductor",
    "nasdaq",
    "kospi",
    "bitcoin",
    "ethereum",
    "tesla",
    "nvidia",
    "ai",
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

function relativeLabel(dateStr) {
  const date = new Date(dateStr).getTime();
  if (Number.isNaN(date)) return "방금";

  const minutes = Math.max(0, Math.floor((Date.now() - date) / 60000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  return `${Math.floor(hours / 24)}일 전`;
}

export default function SidebarNewsTicker() {
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const data = await fetchNews({ category: "all", limit: 20 });
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
    <section className="card sideNewsTicker">
      <div className="sideNewsTickerHeader">
        <div>
          <div className="sideNewsTickerEyebrow">실시간 인기 뉴스</div>
          <div className="sideNewsTickerTitle">지금 많이 보는 뉴스</div>
        </div>
        <div className="sideNewsTickerBadge">TOP 5</div>
      </div>

      <div className="sideNewsTickerViewport">
        <div
          className="sideNewsTickerTrack"
          style={{ transform: `translateY(-${activeIndex * 60}px)` }}
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
