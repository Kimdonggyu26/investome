import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNews } from "../api/newsApi";
import "../styles/NewsList.css";

const CATEGORIES = [
  { key: "all", label: "전체", accent: "ALL" },
  { key: "crypto", label: "가상자산", accent: "CRYPTO" },
  { key: "domestic", label: "국내증시", accent: "KOREA" },
  { key: "global", label: "해외증시", accent: "GLOBAL" },
];

const PAGE_SIZE = 10;

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

function categoryLabel(category) {
  return CATEGORIES.find((item) => item.key === category)?.label || "전체";
}

function categoryAccent(category) {
  return CATEGORIES.find((item) => item.key === category)?.accent || "ALL";
}

function domainFromLink(link) {
  try {
    if (!link) return "";
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [category, mode]);

  const view = useMemo(() => {
    const arr = [...items];

    if (mode === "latest") {
      arr.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    } else {
      arr.sort((a, b) => popularScore(b) - popularScore(a));
    }

    return arr;
  }, [items, mode]);

  const totalPages = pageMode ? Math.max(1, Math.ceil(view.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedItems = useMemo(() => {
    if (!pageMode) return view;
    const start = (safePage - 1) * PAGE_SIZE;
    return view.slice(start, start + PAGE_SIZE);
  }, [pageMode, safePage, view]);

  const featured = pageMode ? pagedItems[0] : null;
  const rest = pageMode ? pagedItems.slice(1) : pagedItems;

  return (
    <div className={`card newsWrap ${pageMode ? "newsWrapPage" : ""}`}>
      <div className="newsHeader">
        <div className="newsHeaderCopy">
          <div className="tickerLiveBadge live sectionTickerBadge">
            <span className="tickerLiveDot" />
            <span>LIVE</span>
          </div>

          <h2 className="newsHeading">{title}</h2>
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
              <span className="newsCategoryChipAccent">{c.accent}</span>
              <span>{c.label}</span>
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

      {!err && pageMode && (
        <div className="newsQuickMeta">
          <div className="newsQuickMetaItem">
            <span>현재 카테고리</span>
            <strong>{categoryLabel(category)}</strong>
          </div>
          <div className="newsQuickMetaItem">
            <span>페이지</span>
            <strong>
              {safePage} / {totalPages}
            </strong>
          </div>
          <div className="newsQuickMetaItem">
            <span>표시 기사</span>
            <strong>{view.length}건</strong>
          </div>
        </div>
      )}

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
              title="새 창에서 기사 열기"
            >
              <div className="newsFeaturedVisual">
                <div className="newsFeaturedRank">TOP 1</div>
                <div className="newsFeaturedCategory">{categoryAccent(category)}</div>
              </div>

              <div className="newsFeaturedBody">
                <div className="newsFeaturedBadge">대표 기사</div>
                <div className="newsFeaturedTitle">{featured.title}</div>
                <div className="newsFeaturedMeta">
                  {featured.source ? <span>{featured.source}</span> : null}
                  <span>{relativeLabel(featured.pubDate)}</span>
                </div>
              </div>
            </a>
          )}

          <div className={`newsList ${pageMode ? "newsListPage" : ""}`}>
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
                    <div className="newsItemTopline">
                      <span className="newsItemCategory">{categoryLabel(category)}</span>
                      <span className="newsItemFreshness">{relativeLabel(item.pubDate)}</span>
                    </div>
                    <div className="newsItemTitle">{item.title}</div>
                    <div className="newsItemMeta">
                      {item.source ? <span>{item.source}</span> : null}
                      {domainFromLink(item.link) ? <span>{domainFromLink(item.link)}</span> : null}
                    </div>
                  </div>
                </a>
              ))}
          </div>

          {pageMode && totalPages > 1 && (
            <div className="newsPager">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const page = idx + 1;
                return (
                  <button
                    key={page}
                    type="button"
                    className={page === safePage ? "active" : ""}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          )}

          {isSwitching && (
            <div className="newsLoadingOverlay" aria-hidden="true">
              <div className="newsLoadingSweep" />
            </div>
          )}
        </div>
      )}

      <div className="newsDesc newsDescBottom">
        카테고리와 정렬 기준을 바꾸면 원하는 흐름의 뉴스를 더 빠르게 찾을 수 있어요.
      </div>
    </div>
  );
}
