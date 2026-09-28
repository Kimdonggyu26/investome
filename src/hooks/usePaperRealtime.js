import { useEffect, useState } from "react";
import { consumePaperRealtime } from "../api/paperApi";

export default function usePaperRealtime(enabled) {
  const [feed, setFeed] = useState({ state: "CONNECTING", trades: {}, subscribed: [] });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    let disposed = false, controller, retry;
    let attempts = 0, generation = 0;
    async function connect() {
      if (disposed || document.hidden) return;
      const run = ++generation;
      const connection = new AbortController();
      controller = connection;
      let lastMessage = Date.now(), unauthorized = false;
      setFeed(old => ({ ...old, state: "CONNECTING" }));
      const watchdog = window.setInterval(() => {
        if (Date.now() - lastMessage > 25000) connection.abort();
      }, 5000);
      try {
        await consumePaperRealtime(connection.signal, next => {
          if (disposed || run !== generation) return;
          lastMessage = Date.now(); attempts = 0;
          setFeed(old => ({ ...next, trades: { ...old.trades, ...next.trades } }));
        });
      } catch (e) { unauthorized = e.status === 401; }
      finally {
        window.clearInterval(watchdog);
        if (!disposed && run === generation) {
          setFeed(old => ({ ...old, state: "DISCONNECTED" }));
          if (!unauthorized && !document.hidden) retry = window.setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)));
        }
      }
    }
    function visibility() {
      ++generation;
      window.clearTimeout(retry); controller?.abort();
      if (!document.hidden) connect();
    }
    connect();
    document.addEventListener("visibilitychange", visibility);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      disposed = true; controller?.abort(); window.clearTimeout(retry); window.clearInterval(clock);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled]);
  return { ...feed, now };
}
