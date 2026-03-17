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

function getAssetFilters(market, symbol, assetName) {
  const upper = String(symbol || "").toUpperCase();

  if (market === "COMMODITIES") {
    const map = {
      "GC=F": {
        include: ["금", "금값", "금 선물", "gold", "xau"],
        exclude: ["금성", "지금은", "이번엔", "현금", "입금", "송금"],
      },
      "SI=F": {
        include: ["은", "은값", "은 선물", "silver", "xag"],
        exclude: ["지금은", "은평", "은하", "은지원", "은퇴"],
      },
      "CL=F": {
        include: ["wti", "국제유가", "원유", "crude oil"],
        exclude: [],
      },
      "BZ=F": {
        include: ["브렌트", "brent"],
        exclude: [],
      },
      "NG=F": {
        include: ["천연가스", "natural gas", "henry hub"],
        exclude: [],
      },
      "PL=F": {
        include: ["백금", "platinum"],
        exclude: [],
      },
      "PA=F": {
        include: ["팔라듐", "palladium"],
        exclude: [],
      },
    };

    return map[upper] || {
      include: [String(assetName || "").toLowerCase()],
      exclude: [],
    };
  }

  if (market === "CRYPTO") {
    const map = {
      BTC: { include: ["비트코인", "bitcoin", "btc"], exclude: [] },
      ETH: { include: ["이더리움", "ethereum", "eth"], exclude: [] },
      XRP: { include: ["리플", "xrp"], exclude: [] },
      SOL: { include: ["솔라나", "solana", "sol"], exclude: [] },
      DOGE: { include: ["도지", "dogecoin", "doge"], exclude: [] },
    };

    return map[upper] || {
      include: [String(assetName || "").toLowerCase(), upper.toLowerCase()],
      exclude: [],
    };
  }

  return {
    include: [
      String(assetName || "").toLowerCase(),
      upper.toLowerCase(),
    ].filter(Boolean),
    exclude: [],
  };
}

function isRelevantNews(item, filters) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();

  const hasInclude = filters.include.some((keyword) =>
    text.includes(String(keyword).toLowerCase())
  );

  const hasExclude = filters.exclude.some((keyword) =>
    text.includes(String(keyword).toLowerCase())
  );

  return hasInclude && !hasExclude;
}

export default function AssetNewsList({
  assetName,
  market,
  symbol,
  query,
  limit = 8,
}) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const filters = useMemo(
    () => getAssetFilters(market, symbol, assetName),
    [market, symbol, assetName]
  );

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setErr(null);

    fetchNews({ q: query, limit: Math.max(limit * 3, 18) })
      .then((data) => {
        if (!alive) return;

        const filtered = data
          .filter((item) => isRelevantNews(item, filters))
          .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
          .slice(0, limit);

        setItems(filtered);
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
  }, [query, limit, filters]);

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