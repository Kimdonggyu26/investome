let tickerCache = { at: 0, data: null };

export default async function handler(_req, res) {
  try {
    const now = Date.now();

    if (tickerCache.data && now - tickerCache.at < 10_000) {
      res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
      res.status(200).json(tickerCache.data);
      return;
    }

    const url =
      "https://api.coingecko.com/api/v3/simple/price" +
      "?ids=bitcoin,ethereum,ripple" +
      "&vs_currencies=krw" +
      "&include_24hr_change=true";

    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      },
    });

    if (r.status === 429 && tickerCache.data) {
      res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
      res.status(200).json(tickerCache.data);
      return;
    }

    if (!r.ok) {
      res.status(r.status).json({ error: `Ticker fetch failed: ${r.status}` });
      return;
    }

    const data = await r.json();
    tickerCache = { at: now, data };

    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}