export default async function handler(_req, res) {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      },
    });

    if (!r.ok) {
      res.status(r.status).json({ error: `FX fetch failed: ${r.status}` });
      return;
    }

    const data = await r.json();

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}