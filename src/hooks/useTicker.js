import { useEffect, useMemo, useState } from "react";
import { fetchMarketTicker } from "../api/marketApi";

export function useTicker() {
  const [prices, setPrices] = useState({});
  const [changes, setChanges] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setError(null);
      const data = await fetchMarketTicker();

      setPrices(data.prices || {});
      setChanges(data.changes || {});
      setLoading(false);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []);

  return useMemo(
    () => ({ prices, changes, loading, error }),
    [prices, changes, loading, error]
  );
}