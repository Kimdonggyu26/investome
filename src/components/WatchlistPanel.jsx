import { useNavigate } from "react-router-dom";
import { useWatchlist } from "../hooks/useWatchlist";

function marketColor(market) {
  if (market === "CRYPTO") return "rgba(124,77,255,0.95)";
  if (market === "KOSPI") return "rgba(14,165,255,0.95)";
  return "rgba(80,255,170,0.95)";
}

function Avatar({ iconUrl, name }) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name}
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          objectFit: "cover",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        color: "white",
        background:
          "radial-gradient(circle at 30% 30%, rgba(14,165,255,0.38), rgba(255,255,255,0.04))",
        flexShrink: 0,
      }}
    >
      {(name || "?").trim().slice(0, 1)}
    </div>
  );
}

export default function WatchlistPanel() {
  const navigate = useNavigate();
  const { watchlist } = useWatchlist();

  return (
    <div className="card" style={{ padding: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
        }}
      >
        <h3 style={{ margin: 0 }}>관심종목</h3>
        <span className="muted" style={{ fontSize: 12 }}>
          local storage
        </span>
      </div>

      <hr className="hr" />

      {watchlist.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 16,
            background: "rgba(255,255,255,0.02)",
            color: "rgba(255,255,255,0.62)",
            lineHeight: 1.7,
          }}
        >
          아직 관심종목이 없어요.<br />
          상세페이지에서 ⭐ 버튼으로 추가해보세요.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {watchlist.map((item) => (
            <button
              key={`${item.market}-${item.symbol}`}
              type="button"
              onClick={() => navigate(`/asset/${item.market}/${item.symbol}`)}
              className="card"
              style={{
                padding: 12,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Avatar iconUrl={item.iconUrl} name={item.name} />

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 900 }}>{item.name}</div>
                <div
                  className="muted"
                  style={{
                    fontSize: 12,
                    marginTop: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.symbol}
                  {item.displayNameEN ? ` · ${item.displayNameEN}` : ""}
                </div>
              </div>

              <div
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 900,
                  color: "white",
                  background: marketColor(item.market),
                  flexShrink: 0,
                }}
              >
                {item.market}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}