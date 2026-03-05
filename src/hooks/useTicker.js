import { useEffect, useMemo, useState } from "react";
import { fetchCryptoTickerKRW, fetchIndexPlaceholders } from "../api/marketApi";

export function useTicker() {
  const [prices, setPrices] = useState({});
  const [changes, setChanges] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setError(null);
      const [crypto, idx] = await Promise.all([
        fetchCryptoTickerKRW(),
        fetchIndexPlaceholders(),
      ]);

      setPrices((prev) => ({
        ...prev,
        ...crypto.prices,
        ...idx.prices,
      }));

      setChanges((prev) => ({
        ...prev,
        ...crypto.changes,
        ...idx.changes,
      }));

      setLoading(false);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000); // 20초마다 갱신
    return () => clearInterval(t);
  }, []);

  const value = useMemo(
    () => ({ prices, changes, loading, error }),
    [prices, changes, loading, error]
  );

  return value;
}