import { useMemo } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";

export default function TradingViewChart({ symbol, title }) {
  const { theme } = useTheme();

  const src = useMemo(() => {
    const params = new URLSearchParams({
      frameElementId: `tradingview_widget_${String(symbol || "chart").replace(/[^A-Z0-9_:-]/gi, "_")}`,
      symbol,
      interval: "D",
      hidesidetoolbar: "1",
      symboledit: "0",
      saveimage: "0",
      toolbarbg: theme === "light" ? "#f8fbff" : "#0f172a",
      studies: "[]",
      theme,
      style: "1",
      timezone: "Asia/Seoul",
      withdateranges: "1",
      hide_top_toolbar: "0",
      hide_legend: "0",
      allow_symbol_change: "0",
      save_image: "0",
      details: "0",
      hotlist: "0",
      calendar: "0",
      hide_side_toolbar: "1",
      locale: "kr",
      autosize: "1",
      tvwidgetsymbol: symbol,
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
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
        <iframe
          key={symbol}
          title={title || symbol}
          src={src}
          className="tvInner"
          style={{ width: "100%", height: "560px", border: 0 }}
          allowTransparency
          loading="lazy"
        />
      </div>
    </div>
  );
}
