import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import MyPortfolio from "../components/MyPortfolio";
import { useTicker } from "../hooks/useTicker";

export default function MyPage() {
  const { prices, changes, loading, error } = useTicker();

  return (
    <>
      <TopTickerBar
        prices={prices}
        changes={changes}
        loading={loading}
        error={error}
      />
      <Header />

      <main style={{ padding: "18px 0 40px", background: "var(--bg)" }}>
        <div className="container">
          <MyPortfolio prices={prices} />
        </div>
      </main>
    </>
  );
}