import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNews } from "../api/newsApi";
import "../styles/NewsList.css";

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "crypto", label: "가상자산" },
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

function NewsSkeleton() {
  return (
    <div className="newsSkeletonWrap">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div className="newsSkeletonItem" key={idx}>
          <div className="newsSkeleton title" />
          <div className="newsSkeleton meta" />
        </div>
      ))}
    </div>
  );
}

export default function NewsList({
  title = "시장 뉴스",
  limit = 12,
  pageMode = false,
  moreLink,
}) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [mode, setMode] = useState("latest");
  const [category, setCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadNews() {
      const startAt = Date.now();

      try {
        if (items.length === 0) {
          setIsLoading(true);
        } else {
          setIsSwitching(true);
        }

        const data = await fetchNews({ category, limit });
        const elapsed = Date.now() - startAt;
        const minimumOverlay = 220;

        if (elapsed < minimumOverlay) {
          await new Promise((resolve) => setTimeout(resolve, minimumOverlay - elapsed));
        }

        if (!alive) return;

        setItems(data);
        setErr(null);
        setIsLoading(false);
        setIsSwitching(false);
      } catch (e) {
        if (!alive) return;
        setErr(e);
        setIsLoading(false);
        setIsSwitching(false);
      }
    }

    loadNews();

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
    <div className={`card newsWrap ${pageMode ? "newsWrapPage" : ""}`}>
      <div className="newsHeader">
        <div>
          <div className="tickerLiveBadge live sectionTickerBadge">
            <span className="tickerLiveDot" />
            <span>LIVE</span>
          </div>

          <h2 className="newsHeading">{title}</h2>
          <div className="newsSub">실시간 시장 주요 뉴스를 모아봤어요</div>
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
              className={mode === "popular" ? "active" : ""}
              onClick={() => setMode("popular")}
            >
              인기순
            </button>
          </div>
        </div>
      </div>

      <div className="newsCategoryRow">
        <div className="newsCategoryGroup">
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

        {!pageMode && moreLink && (
          <div className="newsCategoryRowRight">
            <Link to={moreLink} className="newsMoreBtn">
              전체 뉴스 보기
            </Link>
          </div>
        )}
      </div>

      {err && <div className="muted">시장 뉴스를 불러오지 못했어요.</div>}

      {isLoading && items.length === 0 ? (
        <NewsSkeleton />
      ) : (
        <div className={`newsContentShell ${isSwitching ? "isSwitching" : ""}`}>
          {!err && pageMode && featured && (
            <a
              href={featured.link}
              target="_blank"
              rel="noreferrer"
              className="newsFeatured"
              title="새 탭에서 기사 열기"
            >
              <div className="newsFeaturedBody">
                <div className="newsFeaturedBadge">주요 뉴스</div>
                <div className="newsFeaturedTitle">{featured.title}</div>
                <div className="newsFeaturedMeta">
                  <span>{ymdhm(featured.pubDate)}</span>
                  {featured.source ? <span> · {featured.source}</span> : null}
                </div>
              </div>
            </a>
          )}

          <div className="newsList">
            {!err &&
              rest.map((item, idx) => (
                <a
                  key={`${item.link}-${idx}`}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="newsItem"
                >
                  <div className="newsItemMain">
                    <div className="newsItemTitle">{item.title}</div>
                    <div className="newsItemMeta">
                      <span>{ymdhm(item.pubDate)}</span>
                      {item.source ? <span> · {item.source}</span> : null}
                    </div>
                  </div>
                </a>
              ))}
          </div>

          {isSwitching && (
            <div className="newsLoadingOverlay" aria-hidden="true">
              <div className="newsLoadingSweep" />
            </div>
          )}
        </div>
      )}

      <br />

      <div className="newsDesc newsDescBottom">
        카테고리와 정렬 기준을 바꿔가며 원하는 뉴스를 빠르게 찾아보세요.
      </div>
    </div>
  );
}
