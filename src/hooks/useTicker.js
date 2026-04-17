import { useEffect, useMemo, useState } from "react";
import { fetchMarketTicker } from "../api/marketApi";

const STORAGE_KEY = "investome:ticker:last";

function readCachedTicker() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      prices: parsed.prices || {},
      changes: parsed.changes || {},
    };
  } catch {
    return null;
  }
}

function mergeTickerState(prev, next) {
  const mergedPrices = { ...(prev?.prices || {}) };
  const mergedChanges = { ...(prev?.changes || {}) };

  Object.entries(next?.prices || {}).forEach(([key, value]) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      mergedPrices[key] = value;
    }
  });

  Object.entries(next?.changes || {}).forEach(([key, value]) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      mergedChanges[key] = value;
    }
  });

  return {
    prices: mergedPrices,
    changes: mergedChanges,
  };
}

export function useTicker() {
  const initialCache = readCachedTicker();
  const [tickerState, setTickerState] = useState(
    initialCache || { prices: {}, changes: {} }
  );
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setError(null);
        const data = await fetchMarketTicker();
        if (!mounted) return;

        setTickerState((prev) => {
          const merged = mergeTickerState(prev, {
            prices: data.prices || {},
            changes: data.changes || {},
          });

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {
            // ignore storage write failures
          }

          return merged;
        });
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setError(e);
        setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 20000);

    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return useMemo(
    () => ({
      prices: tickerState.prices,
      changes: tickerState.changes,
      loading,
      error,
    }),
    [tickerState, loading, error]
  );
}
