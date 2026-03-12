import "./TopTickerBar.css";

function formatPrice(value, symbol) {
  if (typeof value !== "number" || !isFinite(value)) return "불러오는중";

  if (symbol === "KOSPI" || symbol === "NASDAQ") {
    return value.toLocaleString("ko-KR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatChange(value) {
  if (typeof value !== "number" || !isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function TickerItem({ symbol, price, change }) {
  const dir =
    typeof change === "number" ? (change >= 0 ? "up" : "down") : "";

  return (
    <div className="tickerItem">
      <span className="tickerSymbol">{symbol}</span>
      <span className="tickerPrice">{formatPrice(price, symbol)}</span>
      <span className={`tickerChange ${dir}`}>{formatChange(change)}</span>
    </div>
  );
}

export default function TopTickerBar({
  prices = {},
  changes = {},
  loading,
  error,
}) {
  const items = [
    { symbol: "BTC", price: prices?.BTC, change: changes?.BTC },
    { symbol: "ETH", price: prices?.ETH, change: changes?.ETH },
    { symbol: "XRP", price: prices?.XRP, change: changes?.XRP },
    { symbol: "KOSPI", price: prices?.KOSPI, change: changes?.KOSPI },
    { symbol: "NASDAQ", price: prices?.NASDAQ, change: changes?.NASDAQ },
  ];

  const tickerItems = (
    <>
      {items.map((item) => (
        <TickerItem
          key={item.symbol}
          symbol={item.symbol}
          price={item.price}
          change={item.change}
        />
      ))}
    </>
  );

  return (
    <div className="tickerBar">
      <div className="container tickerInner">
        <div className="tickerLeft">
          <div className={`tickerLiveBadge ${loading ? "syncing" : "live"}`}>
            <span className="tickerLiveDot" />
            <span>{loading ? "SYNCING" : "LIVE"}</span>
          </div>

          <span className="tickerBriefingText">
            {error ? "실시간 마켓 브리핑" : "실시간 마켓 브리핑"}
          </span>
        </div>

        <div className="tickerItems">
          <div className="tickerTrack">
            {tickerItems}
            {tickerItems}
          </div>
        </div>
      </div>
    </div>
  );
}