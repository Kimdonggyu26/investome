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

export default function HeaderNewsTicker() {
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

    const rotateTimer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 3200);

    return () => window.clearInterval(rotateTimer);
  }, [items]);

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, items.length]);

  const visibleItems = useMemo(() => items.slice(0, 5), [items]);

  if (visibleItems.length === 0) return null;

  return (
    <a
      className="headerNewsTicker"
      href={visibleItems[activeIndex]?.link}
      target="_blank"
      rel="noreferrer"
      title={visibleItems[activeIndex]?.title || "실시간 인기 뉴스"}
    >
      <div className="headerNewsTickerLabel">실시간 인기 뉴스</div>

      <div className="headerNewsTickerViewport">
        <div
          className="headerNewsTickerTrack"
          style={{ transform: `translateY(-${activeIndex * 40}px)` }}
        >
          {visibleItems.map((item, index) => (
            <div className="headerNewsTickerItem" key={`${item.link}-${index}`}>
              <span className="headerNewsTickerRank">{index + 1}</span>
              <span className="headerNewsTickerTitle">{item.title}</span>
            </div>
          ))}
        </div>
      </div>
    </a>
  );
}
