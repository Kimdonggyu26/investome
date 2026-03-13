import { useNavigate } from "react-router-dom";
import { useWatchlist } from "../hooks/useWatchlist";
import { resolveAssetMeta } from "../utils/resolveAssetMeta";

function AssetLogo({ iconUrl, name }) {
  const initial = (name || "?").trim().slice(0, 1);

  if (iconUrl) {
    return <img src={iconUrl} alt={name} className="watchlistPanelLogo" />;
  }

  return <div className="watchlistPanelLogo watchlistPanelLogoFallback">{initial}</div>;
}

export default function WatchlistPanel() {
  const { watchlist } = useWatchlist();
  const location = useLocation();

  return (
    <div className="watchlistPanelCard">
      <div className="watchlistPanelHead">
        <div>
          <div className="watchlistPanelEyebrow">MY WATCHLIST</div>
          <h3 className="watchlistPanelTitle">나의 관심종목</h3>
        </div>
      </div>

      <div className="watchlistPanelList luxuryScroll">
        {watchlist.length === 0 ? (
          <div className="watchlistPanelEmpty">
            관심종목을 추가하면 여기에 보여줘요.
          </div>
        ) : (
          watchlist.map((item) => {
            const href = `/asset/${item.market}/${item.symbol}`;
            const active = location.pathname === href;

            return (
              <Link
                key={`${item.market}-${item.symbol}`}
                to={href}
                className={`watchlistPanelItem ${active ? "active" : ""}`}
              >
                <div className="watchlistPanelIdentity">
                  <AssetLogo iconUrl={item.iconUrl} name={item.name} />

                  <div className="watchlistPanelText">
                    <div className="watchlistPanelName">{item.name}</div>
                    <div className="watchlistPanelMeta">
                      {item.symbol} · {item.market}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}