import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import WatchlistPanel from "../components/WatchlistPanel";
import MyPortfolio from "../components/MyPortfolio";
import { useTicker } from "../hooks/useTicker";
import "../styles/MyPage.css";

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

      <main className="myPage">
        <div className="container myPageContainer">
          <section className="myDashboardGrid">
            <WatchlistPanel />
            <MyPortfolio prices={prices} />
          </section>
        </div>
      </main>
    </>
  );
}