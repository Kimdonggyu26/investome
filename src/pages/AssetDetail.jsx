import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import WatchlistPanel from "../components/WatchlistPanel";
import { useTicker } from "../hooks/useTicker";
import {
  fetchCommoditiesTopKRW,
  fetchCryptoTop30KRW,
  fetchKospiTop30KRW,
  fetchNasdaqTop30KRW,
  getKoreanDummyTop30,
} from "../api/rankingApi";
import TradingViewChart from "../components/TradingViewChart";
import AssetNewsList from "../components/AssetNewsList";
import AssetCommunity from "../components/AssetCommunity";
import "../styles/AssetDetail.css";
import { useWatchlist } from "../hooks/useWatchlist";
import { fetchAssetQuote } from "../api/portfolioApi";

function formatKRW(n) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function formatSignedKRW(n) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function calcChangeAmount(price, pct) {
  if (typeof price !== "number" || !isFinite(price)) return null;
  if (typeof pct !== "number" || !isFinite(pct)) return null;
  return price * (pct / 100);
}

function calcRange(price, pct) {
  if (typeof price !== "number" || !isFinite(price)) {
    return { high: null, low: null };
  }

  const volatility =
    typeof pct === "number" && isFinite(pct)
      ? Math.max(1.2, Math.min(6, Math.abs(pct) * 1.8))
      : 2.2;

  const high = price * (1 + volatility / 100);
  const low = price * (1 - volatility / 100);

  return { high, low };
}

function formatCapKRW(n) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  const JO = 1_000_000_000_000;
  const EOK = 100_000_000;
  if (n >= JO) return `${(n / JO).toFixed(1)}조`;
  if (n >= EOK) return `${Math.round(n / EOK).toLocaleString("ko-KR")}억`;
  return Math.round(n).toLocaleString("ko-KR");
}

function formatChange(n) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function getChangeClass(n) {
  if (typeof n !== "number" || !isFinite(n)) return "flat";
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "flat";
}

/* ⭐ TradingView 심볼 변환 */
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

/* ⭐ 외부 TradingView 페이지 URL */
function getTradingViewPageUrl(market, symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();

  if (market === "KOSPI" || market === "KOSDAQ") {
    return `https://www.tradingview.com/symbols/KRX-${normalized.padStart(6, "0")}/`;
  }

  if (market === "NASDAQ") {
    return `https://www.tradingview.com/symbols/NASDAQ-${normalized}/`;
  }

  if (market === "CRYPTO") {
    if (normalized === "BTC") return "https://www.tradingview.com/symbols/BTCUSDT/";
    if (normalized === "ETH") return "https://www.tradingview.com/symbols/ETHUSDT/";
    if (normalized === "XRP") return "https://www.tradingview.com/symbols/XRPUSDT/";
    if (normalized === "SOL") return "https://www.tradingview.com/symbols/SOLUSDT/";
    if (normalized === "DOGE") return "https://www.tradingview.com/symbols/DOGEUSDT/";
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

/* ⭐ 뉴스 검색어 */
function getNewsQuery({ market, symbol, name, displayNameEN }) {
  if (market === "CRYPTO") {
    if (symbol === "BTC") return "비트코인 OR Bitcoin OR BTC";
    if (symbol === "ETH") return "이더리움 OR Ethereum OR ETH";
    if (symbol === "XRP") return "리플 OR XRP";
    return `${name || symbol} OR ${displayNameEN || symbol} OR ${symbol}`;
  }

  if (market === "COMMODITIES") {
    const map = {
      "GC=F": "금 OR Gold",
      "SI=F": "은 OR Silver",
      "CL=F": "WTI OR 국제유가 OR Crude Oil",
      "BZ=F": "Brent OR 브렌트유",
      "NG=F": "천연가스 OR Natural Gas",
      "PL=F": "백금 OR Platinum",
      "PA=F": "팔라듐 OR Palladium",
    };

    return map[String(symbol || "").toUpperCase()] || `${name || symbol}`;
  }

  const base = [name, displayNameEN, symbol].filter(Boolean).join(" OR ");
  return base || symbol;
}

function getFallbackAsset(market, symbol) {
  return {
    market,
    symbol,
    name: symbol,
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

export default function AssetDetail() {
  const { market = "", symbol = "" } = useParams();
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

        let rows = [];

        if (market === "CRYPTO") {
          rows = await fetchCryptoTop30KRW().catch(() => []);
        } else if (market === "KOSPI") {
          const real = await fetchKospiTop30KRW().catch(() => null);
          rows = real ?? getKoreanDummyTop30("KOSPI");
        } else if (market === "NASDAQ") {
          const real = await fetchNasdaqTop30KRW().catch(() => null);
          rows = real ?? getKoreanDummyTop30("NASDAQ");
        } else if (market === "COMMODITIES") {
          rows = await fetchCommoditiesTopKRW().catch(() => []);
        }

        const found =
          rows.find(
            (row) =>
              String(row.symbol).toUpperCase() === String(symbol).toUpperCase()
          ) || null;

        if (!alive) return;

        const resolvedName =
          found?.name ||
          watchedItem?.name ||
          liveQuote?.displayNameEN ||
          liveQuote?.name ||
          symbol;

        const resolvedDisplayName =
          found?.displayNameEN ||
          watchedItem?.displayNameEN ||
          liveQuote?.displayNameEN ||
          liveQuote?.name ||
          resolvedName;

        const resolvedIcon =
          found?.iconUrl ||
          watchedItem?.iconUrl ||
          liveQuote?.iconUrl ||
          "";

        setAsset({
          market,
          symbol: liveQuote?.symbol || symbol,
          name: resolvedName,
          displayNameEN: resolvedDisplayName,
          iconUrl: resolvedIcon,
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
    const t = setInterval(loadAsset, 20_000);

    return () => {
      alive = false;
      clearInterval(t);
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

  const newsQuery = useMemo(
    () =>
      getNewsQuery({
        market,
        symbol,
        name: asset.name,
        displayNameEN: asset.displayNameEN,
      }),
    [market, symbol, asset.name, asset.displayNameEN]
  );

  const marketLabel =
    market === "CRYPTO"
      ? "CRYPTO"
      : market === "KOSPI"
        ? "KOSPI"
        : market === "COMMODITIES"
          ? "COMMODITIES"
          : "NASDAQ";

  const showCap = market === "CRYPTO" || market === "NASDAQ";
  const isKoreanMarket = market === "KOSPI" || market === "KOSDAQ";

  const changeAmount = calcChangeAmount(asset.priceKRW, asset.changePct);
  const { high, low } = calcRange(asset.priceKRW, asset.changePct);
  const watched = isWatched(market, symbol);

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
                  <AssetLogo iconUrl={asset.iconUrl} name={asset.name} />

                  <div>
                    <div className="assetMarketBadge">{marketLabel}</div>
                    <h1 className="assetName">{asset.name}</h1>
                    <div className="assetSymbolRow">
                      <span>{symbol}</span>
                      {asset.displayNameEN && asset.displayNameEN !== asset.name ? (
                        <>
                          <span>•</span>
                          <span>{asset.displayNameEN}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="assetActionRow">
                  <button
                    type="button"
                    className={`btn watchBtn ${watched ? "active" : ""}`}
                    onClick={() =>
                      toggleWatchlist({
                        market,
                        symbol,
                        name: asset.name,
                        displayNameEN: asset.displayNameEN,
                        iconUrl: asset.iconUrl,
                        coinId: asset.coinId,
                      })
                    }
                  >
                    {watched ? "★ 관심종목 제거" : "☆ 관심종목 추가"}
                  </button>

                  <Link className="btn" to="/">
                    ← 홈으로
                  </Link>
                </div>
              </div>

              <div className="assetStatRow">
                <div className="assetStatCard primary">
                  <div className="assetStatLabel">현재가</div>
                  <div className="assetPrice">
                    {assetLoading ? "불러오는중" : formatKRW(asset.priceKRW)}
                  </div>
                  <div className="assetStatHint">
                    {assetLoading ? "-" : `${marketLabel} 실시간 반영`}
                  </div>
                </div>

                <div className={`assetStatCard ${getChangeClass(asset.changePct)}`}>
                  <div className="assetStatLabel">등락률</div>
                  <div className={`assetChange ${getChangeClass(asset.changePct)}`}>
                    {assetLoading ? "불러오는중" : formatChange(asset.changePct)}
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
                  <div className="assetMetaValue">
                    {showCap ? formatCapKRW(asset.capKRW) : "-"}
                  </div>
                </div>

                <div className="assetMetaCard orange">
                  <div className="assetMetaLabel">뉴스 검색어</div>
                  <div className="assetMetaValue">{asset.name}</div>
                </div>
              </div>
            </section>

            <section className="assetMainGrid">
              {isKoreanMarket ? (
                <section className="assetPanel kospiChartNotice">
                  <div className="assetPanelHead">
                    <div>
                      <div className="assetPanelTitle">차트 서비스 준비중</div>
                      <div className="assetPanelSub">
                        코스피 종목은 외부 차트 페이지에서 확인할 수 있습니다.
                      </div>
                    </div>
                  </div>

                  <div className="kospiChartNoticeBody">
                    <div className="kospiChartBadge">KOSPI CHART</div>
                    <div className="kospiChartIcon">📈</div>
                    <h3 className="kospiChartHeadline">사이트 내 차트 지원 준비중</h3>

                    <p className="kospiChartNoticeText">
                      현재 코스피 종목 차트는 사이트 내 제공이 제한됩니다.
                      <br />
                      아래 버튼을 눌러 TradingView 차트 페이지로 이동해주세요.
                    </p>

                    <a
                      href={tradingViewPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chartMoveBtn"
                    >
                      TradingView 차트 보러가기 →
                    </a>

                    <div className="kospiChartNoticeFoot">
                      추후 사이트 내 차트 지원 예정
                    </div>
                  </div>
                </section>
              ) : (
                <TradingViewChart
                  key={tradingViewSymbol}
                  symbol={tradingViewSymbol}
                  title={`${asset.name} · ${symbol}`}
                />
              )}

              <div className="assetPanel">
                <div className="assetPanelHead">
                  <div>
                    <div className="assetPanelTitle">현재 정보</div>
                    <div className="assetPanelSub">핵심 정보 요약</div>
                  </div>
                </div>

                <div className="assetInfoList">
                  <div className="assetInfoItem emphasis">
                    <div className="assetInfoItemLabel">종목명</div>
                    <div className="assetInfoItemValue">{asset.name}</div>
                  </div>

                  <div className="assetInfoMiniGrid">
                    <div className="assetMiniCard high">
                      <div className="assetMiniLabel">예상 High</div>
                      <div className="assetMiniValue">
                        {assetLoading ? "불러오는중" : formatKRW(high)}
                      </div>
                    </div>

                    <div className="assetMiniCard low">
                      <div className="assetMiniLabel">예상 Low</div>
                      <div className="assetMiniValue">
                        {assetLoading ? "불러오는중" : formatKRW(low)}
                      </div>
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">심볼</div>
                    <div className="assetInfoItemValue">{symbol}</div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">현재가</div>
                    <div className="assetInfoItemValue">
                      {assetLoading ? "불러오는중" : formatKRW(asset.priceKRW)}
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">등락률</div>
                    <div className={`assetInfoItemValue ${getChangeClass(asset.changePct)}`}>
                      {assetLoading ? "불러오는중" : formatChange(asset.changePct)}
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">변동 금액</div>
                    <div className="assetInfoItemValue">
                      {assetLoading ? "불러오는중" : formatSignedKRW(changeAmount)}
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">시가총액</div>
                    <div className="assetInfoItemValue">
                      {showCap ? formatCapKRW(asset.capKRW) : "-"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="assetBottomGrid">
              <AssetNewsList assetName={asset.name} query={newsQuery} limit={8} />

              <AssetCommunity
                market={market}
                symbol={symbol}
                assetName={asset.name}
              />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}