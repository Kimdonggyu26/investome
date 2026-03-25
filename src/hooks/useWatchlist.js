import { useEffect, useMemo, useState } from "react";
import { SEARCH_ASSETS } from "../data/searchAssets";
import { getAuthUser } from "../utils/auth";

const STORAGE_KEY_PREFIX = "investome-watchlist-v2";

function getWatchlistStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}-${userId || "guest"}`;
}

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

function readWatchlist(userId) {
  try {
    const raw = localStorage.getItem(getWatchlistStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeWatchlistItem) : [];
  } catch {
    return [];
  }
}

function writeWatchlist(items, userId) {
  localStorage.setItem(getWatchlistStorageKey(userId), JSON.stringify(items));
  window.dispatchEvent(new Event("watchlist:change"));
}

export function useWatchlist() {
  const authUser = getAuthUser();
  const userId = authUser?.id || "guest";

  const [items, setItems] = useState(() => readWatchlist(userId));

  useEffect(() => {
    setItems(readWatchlist(userId));
  }, [userId]);

  useEffect(() => {
    const normalized = items.map(normalizeWatchlistItem);
    const changed = JSON.stringify(normalized) !== JSON.stringify(items);

    if (changed) {
      setItems(normalized);
      writeWatchlist(normalized, userId);
    }
  }, [items, userId]);

  useEffect(() => {
    function sync() {
      setItems(readWatchlist(userId));
    }

    window.addEventListener("storage", sync);
    window.addEventListener("watchlist:change", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("watchlist:change", sync);
    };
  }, [userId]);

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
    writeWatchlist(next, userId);
  }

  return {
    watchlist: items,
    isWatched,
    toggleWatchlist,
  };
}