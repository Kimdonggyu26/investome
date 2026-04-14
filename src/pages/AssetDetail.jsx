import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import WatchlistPanel from "../components/WatchlistPanel";
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
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";

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

    return cryptoMap[String(symbol || "").toUpperCase()] || parts.map((value) => `"${value}"`).join(" OR ");
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
  return (
    getKoreanAssetName(asset.market, symbol) ||
    asset.name ||
    asset.displayNameEN ||
    symbol
  );
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
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();
  const [asset, setAsset] = useState(getFallbackAsset(market, symbol));
  const [assetLoading, setAssetLoading] = useState(true);
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
          rows.find(
            (row) =>
              String(row.symbol).toUpperCase() === String(symbol).toUpperCase()
          ) || null;

        if (!alive) return;

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

  const tradingViewSymbol = useMemo(
    () => getTradingViewSymbol(market, symbol),
    [market, symbol]
  );

  const tradingViewPageUrl = useMemo(
    () => getTradingViewPageUrl(market, symbol),
    [market, symbol]
  );

  const preferredName = getPreferredName(asset, symbol);
  const preferredDisplayNameEN = getDisplayNameEN(asset, symbol);
  const marketLabel = getMarketLabel(market);
  const showCap = asset.capKRW != null;
  const isKoreanMarket = market === "KOSPI" || market === "KOSDAQ";
  const watched = isWatched(market, symbol);
  const changeAmount = calcChangeAmount(asset.priceKRW, asset.changePct);

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
      alert("관심종목은 로그인 후 이용할 수 있어요.");
      navigate("/login");
    }
  }

  return (
    <>
      <TopTickerBar prices={prices} changes={changes} loading={loading} error={error} />
      <Header />

      <main className="assetDetailPage">
        <div className="assetDetailShell">
          <aside className="assetDetailFloatingWatch">
            <WatchlistPanel />
          </aside>

          <div className="container">
            <section className="card assetTopCard assetHeroGlow">
              <div className="assetTopHead">
                <div className="assetIdentity">
                  <AssetLogo iconUrl={asset.iconUrl} name={preferredName} />

                  <div className="assetIdentityCopy">
                    <div className="assetMarketBadge">{marketLabel}</div>
                    <h1 className="assetName">{preferredName}</h1>
                    <div className="assetSymbolRow">
                      <span className="assetSymbolChip">{symbol}</span>
                      {preferredDisplayNameEN ? (
                        <>
                          <span className="assetSymbolDivider">·</span>
                          <span className="assetSubName">{preferredDisplayNameEN}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="assetActionRow">
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

              <div className="assetStatRow">
                <div className="assetStatCard primary">
                  <div className="assetStatLabel">현재가</div>
                  <div className="assetPrice">
                    {assetLoading ? "불러오는 중..." : formatKRW(asset.priceKRW)}
                  </div>
                  <div className="assetStatHint">
                    {assetLoading ? "-" : `${marketLabel} 실시간 시세`}
                  </div>
                </div>

                <div className={`assetStatCard ${getChangeClass(asset.changePct)}`}>
                  <div className="assetStatLabel">등락률</div>
                  <div className={`assetChange ${getChangeClass(asset.changePct)}`}>
                    {assetLoading ? "불러오는 중..." : formatChange(asset.changePct)}
                  </div>
                  <div className="assetStatHint">
                    {assetLoading ? "-" : formatSignedKRW(changeAmount)}
                  </div>
                </div>
              </div>

              <div className="assetMetaGrid">
                <div className="assetMetaCard blue">
                  <div className="assetMetaLabel">시장</div>
                  <div className="assetMetaValue">{marketLabel}</div>
                </div>

                <div className="assetMetaCard purple">
                  <div className="assetMetaLabel">심볼</div>
                  <div className="assetMetaValue">{symbol}</div>
                </div>

                <div className="assetMetaCard green">
                  <div className="assetMetaLabel">시가총액</div>
                  <div className="assetMetaValue">{showCap ? formatCapKRW(asset.capKRW) : "-"}</div>
                </div>

                <div className="assetMetaCard orange">
                  <div className="assetMetaLabel">대표 검색어</div>
                  <div className="assetMetaValue">{preferredDisplayNameEN || preferredName}</div>
                </div>
              </div>
            </section>

            <section className="assetMainGrid">
              {isKoreanMarket ? (
                <section className="assetPanel kospiChartNotice">
                  <div className="assetPanelHead">
                    <div>
                      <div className="assetPanelTitle">차트 바로가기</div>
                      <div className="assetPanelSub">
                        국내 종목 차트는 TradingView 페이지에서 더 안정적으로 확인할 수 있어요.
                      </div>
                    </div>
                  </div>

                  <div className="kospiChartNoticeBody">
                    <div className="kospiChartBadge">KOREA MARKET</div>
                    <div className="kospiChartIcon">↗</div>
                    <h3 className="kospiChartHeadline">TradingView에서 상세 차트 보기</h3>

                    <p className="kospiChartNoticeText">
                      국내 종목은 외부 차트 페이지로 연결하는 편이 더 정확하고 안정적이에요.
                      <br />
                      아래 버튼으로 현재 종목의 실시간 차트 화면을 바로 열 수 있습니다.
                    </p>

                    <a
                      href={tradingViewPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chartMoveBtn"
                    >
                      TradingView 열기
                    </a>

                    <div className="kospiChartNoticeFoot">
                      새 탭에서 종목 차트 페이지가 열립니다.
                    </div>
                  </div>
                </section>
              ) : (
                <TradingViewChart
                  key={tradingViewSymbol}
                  symbol={tradingViewSymbol}
                  title={`${preferredName} · ${symbol}`}
                />
              )}

              <div className="assetPanel">
                <div className="assetPanelHead">
                  <div>
                    <div className="assetPanelTitle">자산 요약</div>
                    <div className="assetPanelSub">핵심 수치만 빠르게 확인할 수 있도록 정리했어요.</div>
                  </div>
                </div>

                <div className="assetInfoList">
                  <div className="assetInfoItem emphasis">
                    <div className="assetInfoItemLabel">종목명</div>
                    <div className="assetInfoItemValue">{preferredName}</div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">심볼</div>
                    <div className="assetInfoItemValue">{symbol}</div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">현재가</div>
                    <div className="assetInfoItemValue">
                      {assetLoading ? "불러오는 중..." : formatKRW(asset.priceKRW)}
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">등락률</div>
                    <div className={`assetInfoItemValue ${getChangeClass(asset.changePct)}`}>
                      {assetLoading ? "불러오는 중..." : formatChange(asset.changePct)}
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">변동 금액</div>
                    <div className="assetInfoItemValue">
                      {assetLoading ? "불러오는 중..." : formatSignedKRW(changeAmount)}
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">시가총액</div>
                    <div className="assetInfoItemValue">{showCap ? formatCapKRW(asset.capKRW) : "-"}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="assetBottomGrid">
              <AssetNewsList
                assetName={preferredName}
                market={market}
                symbol={symbol}
                query={newsQuery}
                limit={8}
              />

              <AssetCommunity
                market={market}
                symbol={symbol}
                assetName={preferredName}
              />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
