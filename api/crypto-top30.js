let cryptoTopCache = { at: 0, data: null };

export default async function handler(_req, res) {
  try {
    const now = Date.now();

    if (cryptoTopCache.data && now - cryptoTopCache.at < 30_000) {
      res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
      res.status(200).json(cryptoTopCache.data);
      return;
    }

    const url =
      "https://api.coingecko.com/api/v3/coins/markets" +
      "?vs_currency=krw" +
      "&order=market_cap_desc" +
      "&per_page=30" +
      "&page=1" +
      "&sparkline=false" +
      "&price_change_percentage=24h";

    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      },
    });

    if (r.status === 429 && cryptoTopCache.data) {
      res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
      res.status(200).json(cryptoTopCache.data);
      return;
    }

    if (!r.ok) {
      res
        .status(r.status)
        .json({ error: `Crypto top30 fetch failed: ${r.status}` });
      return;
    }

    const data = await r.json();
    cryptoTopCache = { at: now, data };

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}