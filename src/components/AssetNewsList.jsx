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
        exclude: ["황금성", "지금은", "이번 금", "예금", "적금", "송금"],
        context: [],
      },
      "SI=F": {
        include: ["은", "은값", "은 선물", "silver", "xag"],
        exclude: ["지금은", "은행", "은혜", "은지", "은상"],
        context: [],
      },
      "CL=F": {
        include: ["wti", "국제유가", "원유", "crude oil"],
        exclude: [],
        context: [],
      },
      "BZ=F": {
        include: ["브렌트", "brent"],
        exclude: [],
        context: [],
      },
      "NG=F": {
        include: ["천연가스", "natural gas", "henry hub"],
        exclude: [],
        context: [],
      },
      "PL=F": {
        include: ["백금", "platinum"],
        exclude: [],
        context: [],
      },
      "PA=F": {
        include: ["팔라듐", "palladium"],
        exclude: [],
        context: [],
      },
    };

    return map[upper] || {
      include: [String(assetName || "").toLowerCase()],
      exclude: [],
      context: [],
    };
  }

  if (market === "CRYPTO") {
    const cryptoContext = ["가상자산", "암호화폐", "코인", "토큰", "블록체인", "거래소", "메인넷", "알트코인"];
    const map = {
      BTC: { include: ["비트코인", "bitcoin", "btc"], exclude: [], context: cryptoContext },
      ETH: { include: ["이더리움", "ethereum", "eth"], exclude: [], context: cryptoContext },
      XRP: { include: ["리플", "xrp", "ripple"], exclude: [], context: cryptoContext },
      SOL: { include: ["솔라나", "solana", "sol"], exclude: ["신한", "은행"], context: cryptoContext },
      DOGE: { include: ["도지코인", "dogecoin", "doge"], exclude: [], context: cryptoContext },
      TRX: { include: ["트론", "tron", "trx"], exclude: ["비아트론"], context: cryptoContext },
      TON: { include: ["톤코인", "toncoin", "ton"], exclude: [], context: cryptoContext },
    };

    return map[upper] || {
      include: [String(assetName || "").toLowerCase(), upper.toLowerCase()],
      exclude: [],
      context: cryptoContext,
    };
  }

  return {
    include: [String(assetName || "").toLowerCase(), upper.toLowerCase()].filter(Boolean),
    exclude: [],
    context: [],
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

  const hasContext =
    !Array.isArray(filters.context) ||
    filters.context.length === 0 ||
    filters.context.some((keyword) =>
      text.includes(String(keyword).toLowerCase())
    );

  return hasInclude && hasContext && !hasExclude;
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
                <span>{formatDate(item.pubDate)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
