import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import {
  fetchCommoditiesTopKRW,
  fetchCryptoTop30KRW,
  fetchKospiTop30KRW,
  fetchNasdaqTop30KRW,
} from "../api/rankingApi";
import TradingViewChart from "../components/TradingViewChart";
import AssetNewsList from "../components/AssetNewsList";
import AssetCommunity from "../components/AssetCommunity";
import "../styles/AssetDetail.css";
import { useWatchlist } from "../hooks/useWatchlist";
import { fetchAssetQuote } from "../api/portfolioApi";
import { getKoreanAssetName } from "../data/assetNameMap";

function formatKRW(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatSignedKRW(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(value)).toLocaleString("ko-KR")}원`;
}

function formatCapKRW(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "-";

  const jo = 1_000_000_000_000;
  const eok = 100_000_000;

  if (value >= jo) return `${(value / jo).toFixed(1)}조원`;
  if (value >= eok) return `${Math.round(value / eok).toLocaleString("ko-KR")}억원`;
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatChange(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function calcChangeAmount(price, changePct) {
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  if (typeof changePct !== "number" || !Number.isFinite(changePct)) return null;
  return price * (changePct / 100);
}

function getChangeClass(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "flat";
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function getMarketLabel(market) {
  if (market === "CRYPTO") return "가상자산";
  if (market === "KOSPI") return "KOSPI";
  if (market === "KOSDAQ") return "KOSDAQ";
  if (market === "COMMODITIES") return "원자재";
  return "NASDAQ";
}

function getTradingViewSymbol(market, symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();

  if (market === "CRYPTO") {
    if (normalized === "BTC") return "BINANCE:BTCUSDT";
    if (normalized === "ETH") return "BINANCE:ETHUSDT";
    if (normalized === "XRP") return "BINANCE:XRPUSDT";
    if (normalized === "SOL") return "BINANCE:SOLUSDT";
    if (normalized === "DOGE") return "BINANCE:DOGEUSDT";
    return `BINANCE:${normalized}USDT`;
  }

  if (market === "COMMODITIES") {
    const map = {
      "GC=F": "TVC:GOLD",
      "SI=F": "TVC:SILVER",
      "CL=F": "TVC:USOIL",
      "BZ=F": "TVC:UKOIL",
      "NG=F": "NYMEX:NG1!",
      "PL=F": "TVC:PLATINUM",
      "PA=F": "TVC:PALLADIUM",
    };

    return map[normalized] || "TVC:GOLD";
  }

  if (market === "KOSPI" || market === "KOSDAQ") {
    return `KRX:${normalized.padStart(6, "0")}`;
  }

  if (market === "NASDAQ") {
    return `NASDAQ:${normalized}`;
  }

  return normalized;
}

function getTradingViewPageUrl(market, symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();

  if (market === "KOSPI" || market === "KOSDAQ") {
    return `https://www.tradingview.com/symbols/KRX-${normalized.padStart(6, "0")}/`;
  }

  if (market === "NASDAQ") {
    return `https://www.tradingview.com/symbols/NASDAQ-${normalized}/`;
  }

  if (market === "CRYPTO") {
    return `https://www.tradingview.com/symbols/${normalized}USDT/`;
  }

  if (market === "COMMODITIES") {
    const map = {
      "GC=F": "https://www.tradingview.com/symbols/TVC-GOLD/",
      "SI=F": "https://www.tradingview.com/symbols/TVC-SILVER/",
      "CL=F": "https://www.tradingview.com/symbols/TVC-USOIL/",
      "BZ=F": "https://www.tradingview.com/symbols/TVC-UKOIL/",
      "NG=F": "https://www.tradingview.com/symbols/NYMEX-NG1!/",
      "PL=F": "https://www.tradingview.com/symbols/TVC-PLATINUM/",
      "PA=F": "https://www.tradingview.com/symbols/TVC-PALLADIUM/",
    };

    return map[normalized] || "https://www.tradingview.com/symbols/TVC-GOLD/";
  }

  return "";
}

function getNewsQuery({ market, symbol, koreanName, englishName }) {
  const parts = [koreanName, englishName, symbol].filter(Boolean);

  if (market === "CRYPTO") {
    const cryptoMap = {
      BTC: '"Bitcoin" OR "비트코인" OR "BTC"',
      ETH: '"Ethereum" OR "이더리움" OR "ETH"',
      XRP: '"XRP" OR "리플" OR "Ripple"',
    };

    return koreanName
      ? `"${koreanName}"`
      : cryptoMap[String(symbol || "").toUpperCase()] || (englishName ? `"${englishName}"` : `"${symbol}"`);
  }

  if (market === "COMMODITIES") {
    const commodityMap = {
      "GC=F": '"gold futures" OR "금 선물" OR "gold price"',
      "SI=F": '"silver futures" OR "은 선물" OR "silver price"',
      "CL=F": '"WTI crude oil" OR "서부텍사스원유" OR oil',
      "BZ=F": '"Brent crude" OR "브렌트유"',
      "NG=F": '"natural gas" OR "천연가스"',
      "PL=F": '"platinum futures" OR "백금"',
      "PA=F": '"palladium futures" OR "팔라듐"',
    };

    return commodityMap[String(symbol || "").toUpperCase()] || parts.map((value) => `"${value}"`).join(" OR ");
  }

  return parts.map((value) => `"${value}"`).join(" OR ");
}

function getFallbackAsset(market, symbol) {
  const koreanName = getKoreanAssetName(market, symbol);

  return {
    market,
    symbol,
    name: koreanName || symbol,
    displayNameEN: symbol,
    iconUrl: "",
    coinId: "",
    capKRW: null,
    priceKRW: null,
    changePct: null,
  };
}

function AssetLogo({ iconUrl, name }) {
  const [imgError, setImgError] = useState(false);

  if (iconUrl && !imgError) {
    return (
      <img
        src={iconUrl}
        alt={name}
        className="assetLogo"
        onError={() => setImgError(true)}
      />
    );
  }

  const initial = (name || "?").trim().slice(0, 1);
  return <div className="assetLogo assetLogoFallback">{initial}</div>;
}

function getPreferredName(asset, symbol) {
  return getKoreanAssetName(asset.market, symbol) || asset.name || asset.displayNameEN || symbol;
}

function getDisplayNameEN(asset, symbol) {
  const preferredKorean = getKoreanAssetName(asset.market, symbol);

  if (
    asset.displayNameEN &&
    asset.displayNameEN !== symbol &&
    asset.displayNameEN !== preferredKorean
  ) {
    return asset.displayNameEN;
  }

  return "";
}

async function fetchRankingRows(market) {
  if (market === "CRYPTO") return fetchCryptoTop30KRW().catch(() => []);
  if (market === "KOSPI") return fetchKospiTop30KRW().catch(() => []);
  if (market === "NASDAQ") return fetchNasdaqTop30KRW().catch(() => []);
  if (market === "COMMODITIES") return fetchCommoditiesTopKRW().catch(() => []);
  return [];
}

export default function AssetDetail() {
  const { market = "", symbol = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();
  const [asset, setAsset] = useState(getFallbackAsset(market, symbol));
  const [marketRows, setMarketRows] = useState([]);
  const [assetLoading, setAssetLoading] = useState(true);
  const [watchPromptOpen, setWatchPromptOpen] = useState(false);
  const { watchlist, isWatched, toggleWatchlist } = useWatchlist();

  useEffect(() => {
    let alive = true;

    async function loadAsset() {
      try {
        setAssetLoading(true);

        const watchedItem =
          watchlist.find(
            (item) =>
              String(item.market).toUpperCase() === String(market).toUpperCase() &&
              String(item.symbol).toUpperCase() === String(symbol).toUpperCase()
          ) || null;

        const liveQuote = await fetchAssetQuote({
          market,
          symbol,
          name: watchedItem?.name || symbol,
          coinId: watchedItem?.coinId || "",
        }).catch(() => null);

        const rows = await fetchRankingRows(market);
        const found =
          rows.find((row) => String(row.symbol).toUpperCase() === String(symbol).toUpperCase()) || null;

        if (!alive) return;

        setMarketRows(Array.isArray(rows) ? rows.slice(0, 10) : []);

        const mappedKoreanName = getKoreanAssetName(market, symbol);
        const resolvedName =
          mappedKoreanName ||
          liveQuote?.name ||
          found?.name ||
          watchedItem?.name ||
          liveQuote?.displayNameEN ||
          found?.displayNameEN ||
          watchedItem?.displayNameEN ||
          symbol;

        const resolvedDisplayName =
          liveQuote?.displayNameEN ||
          found?.displayNameEN ||
          watchedItem?.displayNameEN ||
          (resolvedName !== symbol ? resolvedName : symbol);

        setAsset({
          market,
          symbol: liveQuote?.symbol || symbol,
          name: resolvedName,
          displayNameEN: resolvedDisplayName,
          iconUrl: found?.iconUrl || watchedItem?.iconUrl || liveQuote?.iconUrl || "",
          coinId: liveQuote?.coinId || found?.coinId || watchedItem?.coinId || "",
          capKRW: liveQuote?.capKRW ?? found?.capKRW ?? null,
          priceKRW: liveQuote?.priceKRW ?? found?.priceKRW ?? null,
          changePct: liveQuote?.changePct ?? found?.changePct ?? null,
        });
      } catch {
        if (!alive) return;
        setAsset(getFallbackAsset(market, symbol));
      } finally {
        if (alive) setAssetLoading(false);
      }
    }

    loadAsset();
    const timer = setInterval(loadAsset, 20_000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [market, symbol, watchlist]);

  const tradingViewSymbol = useMemo(() => getTradingViewSymbol(market, symbol), [market, symbol]);
  const tradingViewPageUrl = useMemo(() => getTradingViewPageUrl(market, symbol), [market, symbol]);
  const preferredName = getPreferredName(asset, symbol);
  const preferredDisplayNameEN = getDisplayNameEN(asset, symbol);
  const marketLabel = getMarketLabel(market);
  const showCap =
    typeof asset.capKRW === "number" && Number.isFinite(asset.capKRW) && asset.capKRW > 0;
  const isKoreanMarket = market === "KOSPI" || market === "KOSDAQ";
  const watched = isWatched(market, symbol);
  const changeAmount = calcChangeAmount(asset.priceKRW, asset.changePct);
  const sideMarketRows = useMemo(
    () =>
      marketRows.filter(
        (item) => String(item.symbol).toUpperCase() !== String(symbol).toUpperCase()
      ),
    [marketRows, symbol]
  );

  const watchlistPreview = useMemo(() => watchlist.slice(0, 5), [watchlist]);

  const newsQuery = useMemo(
    () =>
      getNewsQuery({
        market,
        symbol,
        koreanName: preferredName,
        englishName: preferredDisplayNameEN,
      }),
    [market, symbol, preferredName, preferredDisplayNameEN]
  );

  async function handleWatchlistToggle() {
    const result = await toggleWatchlist({
      market,
      symbol,
      name: preferredName,
      displayNameEN: preferredDisplayNameEN,
      iconUrl: asset.iconUrl,
      coinId: asset.coinId,
    });

    if (result?.requiresLogin) {
      setWatchPromptOpen(true);
    }
  }

  return (
    <>
      <TopTickerBar prices={prices} changes={changes} loading={loading} error={error} />
      <Header />

      <main className="assetDetailPage">
        <div className="container assetDetailContainer">
          <section className="assetHero card">
            <div className="assetHeroTop">
              <div className="assetHeroIdentity">
                <AssetLogo iconUrl={asset.iconUrl} name={preferredName} />

                <div className="assetHeroCopy">
                  <div className="assetHeroBadge">{marketLabel}</div>
                  <h1 className="assetHeroName">{preferredName}</h1>
                  <div className="assetHeroSub">
                    <span className="assetHeroSymbol">{symbol}</span>
                    {preferredDisplayNameEN ? <span>{preferredDisplayNameEN}</span> : null}
                  </div>
                </div>
              </div>

              <div className="assetHeroActions">
                <button
                  type="button"
                  className={`btn watchBtn ${watched ? "active" : ""}`}
                  onClick={handleWatchlistToggle}
                >
                  {watched ? "관심종목에서 제거" : "관심종목에 추가"}
                </button>

                <Link className="btn" to="/">
                  홈으로 가기
                </Link>
              </div>
            </div>

            <div className="assetHeroQuoteRow">
              <div className="assetHeroPriceWrap">
                <div className="assetHeroLabel">{marketLabel} 실시간 시세</div>
                <div className="assetHeroPrice">
                  {assetLoading ? "불러오는 중.." : formatKRW(asset.priceKRW)}
                </div>
              </div>

              <div className="assetHeroChangeWrap">
                <div className="assetHeroLabel">등락률</div>
                <div className={`assetHeroChange ${getChangeClass(asset.changePct)}`}>
                  {assetLoading ? "불러오는 중.." : formatChange(asset.changePct)}
                </div>
                <div className="assetHeroAmount">
                  {assetLoading ? "-" : formatSignedKRW(changeAmount)}
                </div>
              </div>
            </div>

            <div className="assetHeroMicroGrid">
              <div className="assetHeroMicroCard">
                <span className="assetHeroMicroLabel">시장</span>
                <strong className="assetHeroMicroValue">{marketLabel}</strong>
              </div>
              <div className="assetHeroMicroCard">
                <span className="assetHeroMicroLabel">심볼</span>
                <strong className="assetHeroMicroValue">{symbol}</strong>
              </div>
              <div className="assetHeroMicroCard">
                <span className="assetHeroMicroLabel">시가총액</span>
                <strong className="assetHeroMicroValue">{showCap ? formatCapKRW(asset.capKRW) : "-"}</strong>
              </div>
              <div className="assetHeroMicroCard">
                <span className="assetHeroMicroLabel">대표 검색어</span>
                <strong className="assetHeroMicroValue">{preferredDisplayNameEN || preferredName}</strong>
              </div>
            </div>
          </section>

          <section className="assetContentGrid">
            <div className="assetPrimaryColumn">
              {isKoreanMarket ? (
                <section className="assetPanel assetExternalChart">
                  <div className="assetSectionHead">
                    <div className="assetSectionEyebrow">CHART</div>
                    <h2 className="assetSectionTitle">차트 바로가기</h2>
                    <p className="assetSectionDesc">
                      국내 종목은 외부 차트 페이지로 연결해 더 안정적으로 확인할 수 있어요.
                    </p>
                  </div>

                  <div className="assetExternalChartBody">
                    <div className="assetHeroBadge">KOREA MARKET</div>
                    <h3 className="assetExternalChartTitle">TradingView에서 상세 차트 보기</h3>
                    <p className="assetExternalChartText">
                      국내 종목은 TradingView 종목 페이지로 이동해 일봉과 거래량, 상세 흐름을
                      더 편하게 볼 수 있도록 구성했어요.
                    </p>
                    <a
                      href={tradingViewPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn primary assetExternalChartBtn"
                    >
                      TradingView 열기
                    </a>
                  </div>
                </section>
              ) : (
                <TradingViewChart
                  key={tradingViewSymbol}
                  symbol={tradingViewSymbol}
                  title={`${preferredName} · ${symbol}`}
                />
              )}

              <AssetNewsList
                assetName={preferredName}
                market={market}
                symbol={symbol}
                query={newsQuery}
                limit={8}
              />
            </div>

            <aside className="assetSideColumn">
              <section className="assetRailCard assetSideListCard">
                <div className="assetSectionHead compact">
                  <div>
                    <div className="assetSectionEyebrow">MARKET LIST</div>
                    <h2 className="assetSectionTitle">같은 시장 종목</h2>
                  </div>
                  <span className="assetRailCount">{marketRows.length || 0}</span>
                </div>

                {sideMarketRows.length === 0 ? (
                  <div className="assetWatchMiniEmpty">같은 시장 종목을 불러오는 중이에요.</div>
                ) : (
                  <div className="assetMarketSwitchList">
                    {sideMarketRows.map((item, index) => {
                      const nextName =
                        getKoreanAssetName(item.market, item.symbol) || item.name || item.symbol;
                      const nextHref = `/asset/${item.market}/${item.symbol}`;
                      const isActive = location.pathname === nextHref;

                      return (
                        <Link
                          key={`${item.market}-${item.symbol}-${index}`}
                          to={nextHref}
                          className={`assetMarketSwitchItem ${isActive ? "active" : ""}`}
                        >
                          <div className="assetMarketSwitchLeft">
                            <div className="assetMarketSwitchRank">{index + 1}</div>
                            <div className="assetMarketSwitchCopy">
                              <strong className="assetMarketSwitchName">{nextName}</strong>
                              <span className="assetMarketSwitchMeta">{item.symbol}</span>
                            </div>
                          </div>
                          <div className="assetMarketSwitchRight">
                            <span className="assetMarketSwitchPrice">{formatKRW(item.priceKRW)}</span>
                            <span className={`assetMarketSwitchChange ${getChangeClass(item.changePct)}`}>
                              {formatChange(item.changePct)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="assetRailCard">
                <div className="assetSectionHead compact">
                  <div>
                    <div className="assetSectionEyebrow">MY WATCHLIST</div>
                    <h2 className="assetSectionTitle">나의 관심종목</h2>
                  </div>
                  <span className="assetRailCount">{watchlist.length}개</span>
                </div>

                {watchlistPreview.length === 0 ? (
                  <div className="assetWatchMiniEmpty">
                    관심종목을 추가하면 여기에서 빠르게 이동할 수 있어요.
                  </div>
                ) : (
                  <div className="assetWatchMiniList">
                    {watchlistPreview.map((item) => (
                      <Link
                        key={`${item.market}-${item.symbol}`}
                        to={`/asset/${item.market}/${item.symbol}`}
                        className={`assetWatchMiniItem ${
                          item.market === market && item.symbol === symbol ? "active" : ""
                        }`}
                      >
                        <span className="assetWatchMiniName">{item.name}</span>
                        <span className="assetWatchMiniMeta">
                          {item.symbol} · {getMarketLabel(item.market)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <AssetCommunity market={market} symbol={symbol} assetName={preferredName} />
            </aside>
          </section>
        </div>
      </main>

      {watchPromptOpen ? (
        <div className="assetWatchPromptBackdrop" onClick={() => setWatchPromptOpen(false)}>
          <div className="assetWatchPrompt" onClick={(event) => event.stopPropagation()}>
            <div className="assetWatchPromptTitle">로그인이 필요해요</div>
            <div className="assetWatchPromptText">
              관심종목 추가는 로그인 후 이용할 수 있어요.
            </div>
            <div className="assetWatchPromptActions">
              <button
                type="button"
                className="btn assetWatchPromptGhost"
                onClick={() => setWatchPromptOpen(false)}
              >
                닫기
              </button>
              <button
                type="button"
                className="btn assetWatchPromptPrimary"
                onClick={() => {
                  setWatchPromptOpen(false);
                  navigate("/login");
                }}
              >
                로그인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
