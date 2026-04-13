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
} from "../api/rankingApi";
import TradingViewChart from "../components/TradingViewChart";
import AssetNewsList from "../components/AssetNewsList";
import AssetCommunity from "../components/AssetCommunity";
import "../styles/AssetDetail.css";
import { useWatchlist } from "../hooks/useWatchlist";
import { fetchAssetQuote } from "../api/portfolioApi";

function formatKRW(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  return `KRW ${Math.round(n).toLocaleString("ko-KR")}`;
}

function formatSignedKRW(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}KRW ${Math.abs(Math.round(n)).toLocaleString("ko-KR")}`;
}

function calcChangeAmount(price, pct) {
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  if (typeof pct !== "number" || !Number.isFinite(pct)) return null;
  return price * (pct / 100);
}

function calcRange(price, pct) {
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return { high: null, low: null };
  }

  const volatility =
    typeof pct === "number" && Number.isFinite(pct)
      ? Math.max(1.2, Math.min(6, Math.abs(pct) * 1.8))
      : 2.2;

  const high = price * (1 + volatility / 100);
  const low = price * (1 - volatility / 100);

  return { high, low };
}

function formatCapKRW(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  return `KRW ${new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(n)}`;
}

function formatChange(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function getChangeClass(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "flat";
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "flat";
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

function getNewsQuery({ market, symbol, name, displayNameEN }) {
  const upper = String(symbol || "").toUpperCase();

  if (market === "CRYPTO") {
    if (upper === "BTC") return '"Bitcoin" OR "BTC"';
    if (upper === "ETH") return '"Ethereum" OR "ETH"';
    if (upper === "XRP") return '"XRP" OR "Ripple"';
    return `"${displayNameEN || name || symbol}" OR "${symbol}"`;
  }

  if (market === "COMMODITIES") {
    const map = {
      "GC=F": '"gold futures" OR "gold price" OR XAUUSD',
      "SI=F": '"silver futures" OR "silver price" OR XAGUSD',
      "CL=F": '"WTI crude oil" OR "crude oil futures" OR oil',
      "BZ=F": '"Brent crude" OR "Brent oil"',
      "NG=F": '"natural gas" OR "Henry Hub gas"',
      "PL=F": '"platinum futures" OR "platinum price"',
      "PA=F": '"palladium futures" OR "palladium price"',
    };

    return map[upper] || `"${displayNameEN || name || symbol}"`;
  }

  return [displayNameEN, name, symbol]
    .filter(Boolean)
    .map((value) => `"${value}"`)
    .join(" OR ");
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

function getPreferredName(asset, symbol) {
  return asset.displayNameEN || asset.name || symbol;
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
          rows = await fetchKospiTop30KRW().catch(() => []);
        } else if (market === "NASDAQ") {
          rows = await fetchNasdaqTop30KRW().catch(() => []);
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
          liveQuote?.displayNameEN ||
          found?.displayNameEN ||
          watchedItem?.displayNameEN ||
          found?.name ||
          watchedItem?.name ||
          liveQuote?.name ||
          symbol;

        const resolvedDisplayName =
          liveQuote?.displayNameEN ||
          found?.displayNameEN ||
          watchedItem?.displayNameEN ||
          liveQuote?.name ||
          found?.name ||
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
  const preferredName = getPreferredName(asset, symbol);

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

                  <div>
                    <div className="assetMarketBadge">{marketLabel}</div>
                    <h1 className="assetName">{preferredName}</h1>
                    <div className="assetSymbolRow">
                      <span>{symbol}</span>
                      {asset.displayNameEN && asset.displayNameEN !== symbol ? (
                        <>
                          <span>·</span>
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
                        name: preferredName,
                        displayNameEN: asset.displayNameEN,
                        iconUrl: asset.iconUrl,
                        coinId: asset.coinId,
                      })
                    }
                  >
                    {watched ? "Remove from watchlist" : "Add to watchlist"}
                  </button>

                  <Link className="btn" to="/">
                    Back to home
                  </Link>
                </div>
              </div>

              <div className="assetStatRow">
                <div className="assetStatCard primary">
                  <div className="assetStatLabel">Price</div>
                  <div className="assetPrice">
                    {assetLoading ? "Loading..." : formatKRW(asset.priceKRW)}
                  </div>
                  <div className="assetStatHint">
                    {assetLoading ? "-" : `${marketLabel} live quote`}
                  </div>
                </div>

                <div className={`assetStatCard ${getChangeClass(asset.changePct)}`}>
                  <div className="assetStatLabel">Change</div>
                  <div className={`assetChange ${getChangeClass(asset.changePct)}`}>
                    {assetLoading ? "Loading..." : formatChange(asset.changePct)}
                  </div>
                  <div className="assetStatHint">
                    {assetLoading ? "-" : formatSignedKRW(changeAmount)}
                  </div>
                </div>
              </div>

              <div className="assetMetaGrid">
                <div className="assetMetaCard blue">
                  <div className="assetMetaLabel">Market</div>
                  <div className="assetMetaValue">{marketLabel}</div>
                </div>

                <div className="assetMetaCard purple">
                  <div className="assetMetaLabel">Symbol</div>
                  <div className="assetMetaValue">{symbol}</div>
                </div>

                <div className="assetMetaCard green">
                  <div className="assetMetaLabel">Market Cap</div>
                  <div className="assetMetaValue">
                    {showCap ? formatCapKRW(asset.capKRW) : "-"}
                  </div>
                </div>

                <div className="assetMetaCard orange">
                  <div className="assetMetaLabel">News Query</div>
                  <div className="assetMetaValue">{preferredName}</div>
                </div>
              </div>
            </section>

            <section className="assetMainGrid">
              {isKoreanMarket ? (
                <section className="assetPanel kospiChartNotice">
                  <div className="assetPanelHead">
                    <div>
                      <div className="assetPanelTitle">Chart notice</div>
                      <div className="assetPanelSub">
                        Korean market charts open through the TradingView symbol page.
                      </div>
                    </div>
                  </div>

                  <div className="kospiChartNoticeBody">
                    <div className="kospiChartBadge">KOSPI CHART</div>
                    <div className="kospiChartIcon">↗</div>
                    <h3 className="kospiChartHeadline">Open the external TradingView chart</h3>

                    <p className="kospiChartNoticeText">
                      An embedded chart is not enabled for this market yet.
                      <br />
                      Use the button below to view the full TradingView page.
                    </p>

                    <a
                      href={tradingViewPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chartMoveBtn"
                    >
                      Open TradingView
                    </a>

                    <div className="kospiChartNoticeFoot">
                      More integrated chart support can be added later.
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
                    <div className="assetPanelTitle">Snapshot</div>
                    <div className="assetPanelSub">Quick summary for this asset</div>
                  </div>
                </div>

                <div className="assetInfoList">
                  <div className="assetInfoItem emphasis">
                    <div className="assetInfoItemLabel">Name</div>
                    <div className="assetInfoItemValue">{preferredName}</div>
                  </div>

                  <div className="assetInfoMiniGrid">
                    <div className="assetMiniCard high">
                      <div className="assetMiniLabel">Estimated High</div>
                      <div className="assetMiniValue">
                        {assetLoading ? "Loading..." : formatKRW(high)}
                      </div>
                    </div>

                    <div className="assetMiniCard low">
                      <div className="assetMiniLabel">Estimated Low</div>
                      <div className="assetMiniValue">
                        {assetLoading ? "Loading..." : formatKRW(low)}
                      </div>
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">Symbol</div>
                    <div className="assetInfoItemValue">{symbol}</div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">Price</div>
                    <div className="assetInfoItemValue">
                      {assetLoading ? "Loading..." : formatKRW(asset.priceKRW)}
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">Change</div>
                    <div className={`assetInfoItemValue ${getChangeClass(asset.changePct)}`}>
                      {assetLoading ? "Loading..." : formatChange(asset.changePct)}
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">Change Amount</div>
                    <div className="assetInfoItemValue">
                      {assetLoading ? "Loading..." : formatSignedKRW(changeAmount)}
                    </div>
                  </div>

                  <div className="assetInfoItem">
                    <div className="assetInfoItemLabel">Market Cap</div>
                    <div className="assetInfoItemValue">
                      {showCap ? formatCapKRW(asset.capKRW) : "-"}
                    </div>
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
