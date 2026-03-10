import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "investome-watchlist-v1";

function readWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWatchlist(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("watchlist:change"));
}

export function useWatchlist() {
  const [items, setItems] = useState(() => readWatchlist());

  useEffect(() => {
    function sync() {
      setItems(readWatchlist());
    }

    window.addEventListener("storage", sync);
    window.addEventListener("watchlist:change", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("watchlist:change", sync);
    };
  }, []);

  const keySet = useMemo(
    () => new Set(items.map((item) => `${item.market}:${item.symbol}`)),
    [items]
  );

  function isWatched(market, symbol) {
    return keySet.has(`${market}:${symbol}`);
  }

  function toggleWatchlist(asset) {
    const key = `${asset.market}:${asset.symbol}`;
    const exists = keySet.has(key);

    const next = exists
      ? items.filter((item) => `${item.market}:${item.symbol}` !== key)
      : [
          {
            market: asset.market,
            symbol: asset.symbol,
            name: asset.name,
            displayNameEN: asset.displayNameEN || asset.name,
            iconUrl: asset.iconUrl || "",
            addedAt: new Date().toISOString(),
          },
          ...items,
        ];

    setItems(next);
    writeWatchlist(next);
  }

  return {
    watchlist: items,
    isWatched,
    toggleWatchlist,
  };
}