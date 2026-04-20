import { useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";

export default function TradingViewChart({ symbol, title }) {
  const { theme } = useTheme();
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    containerRef.current.innerHTML = "";

    const widgetRoot = document.createElement("div");
    widgetRoot.className = "tvInner tradingview-widget-container__widget";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "Asia/Seoul",
      theme,
      style: "1",
      locale: "kr",
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      details: false,
      hotlist: false,
      calendar: false,
      hide_top_toolbar: false,
      support_host: "https://www.tradingview.com",
      backgroundColor: theme === "light" ? "#f8fbff" : "#0f172a",
    });

    containerRef.current.appendChild(widgetRoot);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, theme]);

  return (
    <div className="assetPanel chartPanel">
      <div className="assetPanelHead">
        <div>
          <div className="assetPanelTitle">차트</div>
          <div className="assetPanelSub">{title}</div>
        </div>
      </div>

      <div className="tvWrap">
        <div ref={containerRef} className="tradingview-widget-container" />
      </div>
    </div>
  );
}
