import "../styles/homeSections.css";
import "./RankingTable.css";

export default function RankingTable({
  title = "TOP30 랭킹",
  subtitle = "Top 30 Market Movers",
  market = "CRYPTO",
  tabs,
  rows = [],
  footerText = "가격은 20초마다 갱신됩니다.",
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
          {tabs}
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
              {rows}
            </tbody>
          </table>
        </div>
      </div>

      <div className="homePanelFooter">
        <span>{footerText}</span>
      </div>
    </section>
  );
}