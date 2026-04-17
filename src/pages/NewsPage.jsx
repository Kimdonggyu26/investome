import { Link } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import NewsList from "../components/NewsList";
import { useTicker } from "../hooks/useTicker";
import "../styles/NewsPage.css";

export default function NewsPage() {
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

      <main className="newsPageMain">
        <div className="container newsPageContainer">
          <section className="newsPageHero card">
            <div className="newsPageHeroTop">
              <div className="newsPageHeroCopy">
                <div className="newsPageBadge">INVESTOME NEWS ROOM</div>
                <h1>지금 시장에서 봐야 할 뉴스만 빠르게</h1>
              </div>

              <div className="newsPageHeroActions">
                <Link className="btn" to="/">
                  홈으로 가기
                </Link>
              </div>
            </div>
          </section>

          <NewsList title="실시간 뉴스룸" limit={60} pageMode />
        </div>
      </main>
    </>
  );
}
