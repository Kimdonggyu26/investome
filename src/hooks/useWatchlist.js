import { useEffect, useMemo, useState } from "react";
import { SEARCH_ASSETS } from "../data/searchAssets";

const STORAGE_KEY = "investome-watchlist-v1";

function resolveWatchlistAsset(market, symbol) {
  const found = SEARCH_ASSETS.find(
    (item) =>
      String(item.market).toUpperCase() === String(market).toUpperCase() &&
      String(item.symbol).toUpperCase() === String(symbol).toUpperCase()
  );

  return found || null;
}

function normalizeWatchlistItem(item) {
  const resolved = resolveWatchlistAsset(item.market, item.symbol);

  return {
    ...item,
    name:
      item.name && item.name !== item.symbol
        ? item.name
        : resolved?.name || item.name || item.symbol,
    displayNameEN:
      item.displayNameEN &&
      item.displayNameEN !== item.symbol &&
      item.displayNameEN !== item.name
        ? item.displayNameEN
        : resolved?.displayNameEN || item.displayNameEN || item.name || item.symbol,
  };
}

function readWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeWatchlistItem) : [];
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
    const normalized = items.map(normalizeWatchlistItem);

    const changed = JSON.stringify(normalized) !== JSON.stringify(items);

    if (changed) {
      setItems(normalized);
      writeWatchlist(normalized);
    }
  }, []);

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
          normalizeWatchlistItem({
            market: asset.market,
            symbol: asset.symbol,
            name: asset.name || asset.symbol,
            displayNameEN: asset.displayNameEN || asset.name || asset.symbol,
            iconUrl: asset.iconUrl || "",
            coinId: asset.coinId || "",
            addedAt: new Date().toISOString(),
          }),
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