import { useEffect, useRef } from "react";

export default function TradingViewChart({ symbol, title }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !symbol) return;

    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.style.width = "100%";
    widgetContainer.style.height = "560px";

    const widgetEl = document.createElement("div");
    widgetEl.className = "tradingview-widget-container__widget";
    widgetEl.style.width = "100%";
    widgetEl.style.height = "100%";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

    script.innerHTML = JSON.stringify({
      width: "100%",
      height: 560,
      symbol,
      interval: "D",
      timezone: "Asia/Seoul",
      theme: "dark",
      style: "1",
      locale: "kr",
      enable_publishing: false,
      allow_symbol_change: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      withdateranges: true,
      calendar: false,
      studies: [],
      support_host: "https://www.tradingview.com",
    });

    widgetContainer.appendChild(widgetEl);
    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol]);

  return (
    <div className="assetPanel chartPanel">
      <div className="assetPanelHead">
        <div>
          <div className="assetPanelTitle">차트</div>
          <div className="assetPanelSub">{title}</div>
        </div>
      </div>

      <div className="tvWrap">
        <div ref={containerRef} className="tvInner" />
      </div>
    </div>
  );
}