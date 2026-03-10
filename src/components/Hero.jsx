import MyPortfolio from "./MyPortfolio";
import FxRates from "./FxRates";
import WatchlistPanel from "./WatchlistPanel";

export default function Hero({ prices }) {
  return (
    <section style={{ padding: "14px 0 10px" }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <WatchlistPanel />
            <MyPortfolio prices={prices} />
          </div>

          <FxRates />
        </div>
      </div>
    </section>
  );
}