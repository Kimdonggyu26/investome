import "../styles/homeSections.css";
import "./RankingTable.css";

export default function RankingTable({
  title = "TOP30 랭킹",
  subtitle = "Top 30 Market Movers",
  market = "CRYPTO",
  categories = [],
  activeCategory,
  onChangeCategory,
  items = [],
}) {
  return (
    <section className="homePanel rankingCard">
      <div className="homePanelHeader rankingHeader">
        <div className="homePanelHeading">
          <div className="homePanelEyebrow">
            <span className="homePanelBadge">
              <span className="homePanelBadgeDot" />
              LIVE MARKET
            </span>
          </div>
          <div className="homePanelTitle">{title}</div>
          <div className="homePanelSub">{subtitle}</div>
        </div>

        <div className="rankingTabs">
          {categories.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeCategory === tab ? "active" : ""}
              onClick={() => onChangeCategory?.(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="homePanelBody">
        <div className="rankingTableWrap">
          <table className="rankingTable">
            <thead>
              <tr>
                <th>순위</th>
                <th>종목</th>
                <th>차트</th>
                <th>현재가</th>
                <th>등락률</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.symbol || item.name || index}>
                  <td>
                    <span className="rankingRank">{index + 1}</span>
                  </td>

                  <td>
                    <div className="rankingCoin">
                      <div className="rankingCoinIcon">
                        <img src={item.image} alt={item.name} />
                      </div>
                      <div className="rankingCoinText">
                        <div className="rankingCoinName">{item.name}</div>
                        <div className="rankingCoinSymbol">{item.symbol}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="rankingSpark">
                      {item.sparkline ? (
                        <img src={item.sparkline} alt={`${item.name} chart`} />
                      ) : null}
                    </div>
                  </td>

                  <td>
                    <div className="rankingPrice">{item.price}</div>
                  </td>

                  <td>
                    <div
                      className={`rankingChange ${
                        String(item.change).startsWith("-") ? "down" : "up"
                      }`}
                    >
                      {item.change}
                    </div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan="5" className="rankingEmpty">
                    데이터를 불러오는 중입니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="homePanelFooter">
        <span>가격은 20초마다 갱신됩니다.</span>
      </div>
    </section>
  );
}