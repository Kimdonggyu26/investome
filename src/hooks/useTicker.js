import { useEffect, useMemo, useState } from "react";
import { fetchMarketTicker } from "../api/marketApi";

const emptyTicker = () => ({ prices: {}, changes: {} });

export function useTicker() {
  const [tickerState, setTickerState] = useState(emptyTicker);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let timer;
    try {
      localStorage.removeItem("investome:ticker:last");
    } catch {
      // Storage may be unavailable; quotes do not depend on it.
    }

    async function load() {
      try {
        const data = await fetchMarketTicker();
        if (!mounted) return;
        // Replace the snapshot so missing quotes never inherit old prices.
        setTickerState({ prices: data.prices || {}, changes: data.changes || {} });
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setTickerState(emptyTicker());
        setError(e);
      } finally {
        if (mounted) {
          setLoading(false);
          timer = setTimeout(load, 20_000);
        }
      }
    }

    load();
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  return useMemo(
    () => ({ ...tickerState, loading, error }),
    [tickerState, loading, error]
  );
}
