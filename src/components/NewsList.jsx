import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  title = "글로벌 경제 주요 소식",
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
          <div className="newsSub">Real-Time Market Headlines</div>
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
              실시간 뉴스 더보기
            </Link>
          </div>
        )}
      </div>


      {err && <div className="muted">뉴스를 불러오지 못했어요.</div>}

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
              title="클릭해서 기사로 이동"
            >
              <div className="newsFeaturedBody">
                <div className="newsFeaturedBadge">FEATURED</div>
                <div className="newsFeaturedTitle">{featured.title}</div>
                <div className="newsFeaturedMeta">
                  <span>{ymdhm(featured.pubDate)}</span>
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
        카테고리별 최신 뉴스와 많이 보는 이슈를 빠르게 확인해보세요.
      </div>

    </div>
  );
}