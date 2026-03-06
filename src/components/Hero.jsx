import MyPortfolio from "./MyPortfolio";
import FxRates from "./FxRates";

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
          <MyPortfolio prices={prices} />
          <FxRates />
        </div>
      </div>
    </section>
  );
}