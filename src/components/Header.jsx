import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SEARCH_ASSETS } from "../data/searchAssets";
import "../styles/Header.css";

function normalize(text = "") {
  return String(text).trim().toLowerCase();
}

function scoreAsset(asset, keyword) {
  const q = normalize(keyword);
  if (!q) return 0;

  const symbol = normalize(asset.symbol);
  const name = normalize(asset.name);
  const en = normalize(asset.displayNameEN);
  const aliases = (asset.aliases || []).map(normalize);

  let score = 0;

  if (symbol === q) score += 100;
  if (name === q) score += 95;
  if (en === q) score += 90;
  if (aliases.includes(q)) score += 85;

  if (symbol.startsWith(q)) score += 40;
  if (name.startsWith(q)) score += 35;
  if (en.startsWith(q)) score += 30;

  if (symbol.includes(q)) score += 20;
  if (name.includes(q)) score += 18;
  if (en.includes(q)) score += 16;

  aliases.forEach((alias) => {
    if (alias.includes(q)) score += 12;
  });

  return score;
}

function marketLabel(market) {
  if (market === "CRYPTO") return "CRYPTO";
  if (market === "KOSPI") return "KOSPI";
  return "NASDAQ";
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const wrapRef = useRef(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];

    return [...SEARCH_ASSETS]
      .map((asset) => ({
        ...asset,
        _score: scoreAsset(asset, q),
      }))
      .filter((asset) => asset._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 8);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!wrapRef.current?.contains(e.target)) {
        setOpen(false);
        setFocusIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpen(false);
    setFocusIndex(-1);
  }, [location.pathname]);

  function moveToAsset(asset) {
    setQuery("");
    setOpen(false);
    setFocusIndex(-1);
    navigate(`/asset/${asset.market}/${asset.symbol}`);
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (results.length > 0) {
      const picked = results[focusIndex >= 0 ? focusIndex : 0];
      moveToAsset(picked);
    }
  }

  function handleKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((prev) => {
        const next = prev + 1;
        return next >= results.length ? 0 : next;
      });
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? results.length - 1 : next;
      });
    }

    if (e.key === "Escape") {
      setOpen(false);
      setFocusIndex(-1);
    }
  }

  return (
    <header className="header">
      <div className="container headerInner">
        <Link to="/" className="brand">
          <div className="brandLogo">📈</div>
          <div className="brandText">
            <div className="brandTitle">Investome</div>
            <div className="brandSub">Market Intelligence</div>
          </div>
        </Link>

        <nav className="nav">
          <Link to="/" className={location.pathname === "/" ? "active" : ""}>
            홈
          </Link>
          <Link
            to="/news"
            className={location.pathname === "/news" ? "active" : ""}
          >
            뉴스
          </Link>
        </nav>

        <div className="headerSearchWrap" ref={wrapRef}>
          <form className="headerSearch" onSubmit={handleSubmit}>
            <span className="headerSearchIcon">⌕</span>

            <input
              type="text"
              value={query}
              placeholder="종목 검색 (예: BTC, 비트코인, 삼성전자, AAPL)"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setFocusIndex(-1);
              }}
              onFocus={() => {
                if (results.length > 0 || query.trim()) setOpen(true);
              }}
              onKeyDown={handleKeyDown}
            />

            {query && (
              <button
                type="button"
                className="headerSearchClear"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                  setFocusIndex(-1);
                }}
                aria-label="검색어 지우기"
              >
                ×
              </button>
            )}
          </form>

          {open && query.trim() && (
            <div className="searchDropdown">
              {results.length === 0 ? (
                <div className="searchEmpty">검색 결과가 없어요.</div>
              ) : (
                results.map((asset, index) => (
                  <button
                    key={`${asset.market}-${asset.symbol}`}
                    type="button"
                    className={`searchItem ${focusIndex === index ? "active" : ""}`}
                    onMouseEnter={() => setFocusIndex(index)}
                    onClick={() => moveToAsset(asset)}
                  >
                    <div className="searchItemMain">
                      <div className="searchItemName">{asset.name}</div>
                      <div className="searchItemMeta">
                        {asset.symbol}
                        {asset.displayNameEN ? ` · ${asset.displayNameEN}` : ""}
                      </div>
                    </div>

                    <div className={`searchItemBadge ${asset.market.toLowerCase()}`}>
                      {marketLabel(asset.market)}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}