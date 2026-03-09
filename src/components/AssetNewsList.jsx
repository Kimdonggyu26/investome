import { useEffect, useMemo, useState } from "react";
import { fetchNews } from "../api/newsApi";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  return `${y}.${m}.${day} ${hh}:${mm}`;
}

export default function AssetNewsList({
  assetName,
  query,
  limit = 8,
}) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setErr(null);

    fetchNews({ q: query, limit })
      .then((data) => {
        if (!alive) return;
        setItems(data);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query, limit]);

  const view = useMemo(() => {
    return [...items].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  }, [items]);

  return (
    <div className="assetPanel">
      <div className="assetPanelHead">
        <div>
          <div className="assetPanelTitle">{assetName} 관련 뉴스</div>
          <div className="assetPanelSub">최신 기사 빠르게 보기</div>
        </div>
      </div>

      {loading && <div className="assetEmpty">뉴스를 불러오는 중이에요.</div>}
      {!loading && err && <div className="assetEmpty">뉴스를 불러오지 못했어요.</div>}

      {!loading && !err && (
        <div className="assetNewsList">
          {view.length === 0 && (
            <div className="assetEmpty">관련 뉴스가 아직 없어요.</div>
          )}

          {view.map((item, idx) => (
            <a
              key={`${item.link}-${idx}`}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="assetNewsItem"
              title="원문 기사 열기"
            >
              <div className="assetNewsTitle">{item.title}</div>
              <div className="assetNewsMeta">
                <span>{item.source || "Google News"}</span>
                <span className="assetNewsDot">•</span>
                <span>{formatDate(item.pubDate)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}