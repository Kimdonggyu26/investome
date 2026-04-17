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
                <div className="newsPageBadge">NEWS ROOM</div>
                <h1>실시간 뉴스룸</h1>
                <p className="newsPageHeroDesc">
                  카테고리별로 실시간 뉴스를 한 눈에 확인하세요 !
                </p>
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
