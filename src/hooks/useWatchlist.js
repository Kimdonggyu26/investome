import { useEffect, useMemo, useState } from "react";
import { SEARCH_ASSETS } from "../data/searchAssets";
import { getAuthHeaders, getAuthUser } from "../utils/auth";
import { apiUrl } from "../lib/apiClient";

const STORAGE_KEY_PREFIX = "investome-watchlist-v3";

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
    market: String(item.market || "").toUpperCase(),
    symbol: String(item.symbol || "").toUpperCase(),
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
    iconUrl: item.iconUrl || resolved?.iconUrl || "",
    coinId: item.coinId || resolved?.coinId || "",
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

function clearWatchlist(userId) {
  localStorage.removeItem(getWatchlistStorageKey(userId));
  window.dispatchEvent(new Event("watchlist:change"));
}

async function fetchWatchlistFromApi() {
  const res = await fetch(apiUrl("/api/watchlist"), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("관심종목 조회 실패");
  return res.json();
}

async function addWatchlistToApi(asset) {
  const res = await fetch(apiUrl("/api/watchlist"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(asset),
  });
  if (!res.ok) throw new Error("관심종목 추가 실패");
  return res.json();
}

async function removeWatchlistFromApi(asset) {
  const res = await fetch(apiUrl("/api/watchlist"), {
    method: "DELETE",
    headers: getAuthHeaders(),
    body: JSON.stringify(asset),
  });
  if (!res.ok) throw new Error("관심종목 삭제 실패");
  return res.json();
}

export function useWatchlist() {
  const authUser = getAuthUser();
  const userId = authUser?.id || "guest";
  const isLoggedIn = !!authUser;

  const [items, setItems] = useState(() => (isLoggedIn ? readWatchlist(userId) : []));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isLoggedIn) {
        clearWatchlist("guest");
        setItems([]);
        return;
      }

      try {
        const serverItems = await fetchWatchlistFromApi();
        const normalized = Array.isArray(serverItems)
          ? serverItems.map(normalizeWatchlistItem)
          : [];
        if (!cancelled) {
          setItems(normalized);
          writeWatchlist(normalized, userId);
        }
      } catch {
        if (!cancelled) {
          setItems(readWatchlist(userId));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userId]);

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
    return keySet.has(`${String(market).toUpperCase()}:${String(symbol).toUpperCase()}`);
  }

  async function toggleWatchlist(asset) {
    const normalizedAsset = normalizeWatchlistItem(asset);
    const key = `${normalizedAsset.market}:${normalizedAsset.symbol}`;
    const exists = keySet.has(key);

    if (!isLoggedIn) {
      return {
        ok: false,
        requiresLogin: true,
      };
    }

    try {
      const serverItems = exists
        ? await removeWatchlistFromApi(normalizedAsset)
        : await addWatchlistToApi(normalizedAsset);

      const normalized = Array.isArray(serverItems)
        ? serverItems.map(normalizeWatchlistItem)
        : [];

      setItems(normalized);
      writeWatchlist(normalized, userId);
      return {
        ok: true,
        requiresLogin: false,
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        requiresLogin: false,
      };
    }
  }

  return {
    watchlist: items,
    isWatched,
    toggleWatchlist,
  };
}
