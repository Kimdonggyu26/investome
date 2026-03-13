import { Link, useLocation } from "react-router-dom";
import { useWatchlist } from "../hooks/useWatchlist";
import "./WatchlistPanel.css";

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
            const resolved = resolveAssetMeta({
              market: item.market,
              symbol: item.symbol,
              watchItem: item,
              baseItem: item,
            });
            const href = `/asset/${resolved.market}/${resolved.symbol}`;
            const active = location.pathname === href;

            return (
              <Link
                key={`${resolved.market}-${resolved.symbol}`}
                to={href}
                className={`watchlistPanelItem ${active ? "active" : ""}`}
              >
                <div className="watchlistPanelIdentity">
                  <AssetLogo iconUrl={resolved.iconUrl} name={resolved.name} />

                  <div className="watchlistPanelText">
                    <div className="watchlistPanelName">{resolved.name}</div>
                    <div className="watchlistPanelMeta">
                      {resolved.symbol} · {resolved.market}
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