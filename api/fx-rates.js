export default async function handler(req, res) {
  try {
    const from = String(req.query.from || "USD").trim().toUpperCase();
    const to = String(req.query.to || "KRW,JPY,CNY,EUR,AUD").trim().toUpperCase();
    const start = String(req.query.start || "").trim();
    const end = String(req.query.end || "").trim();

    const endpoint =
      start && end
        ? `https://api.frankfurter.app/${encodeURIComponent(start)}..${encodeURIComponent(end)}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        : `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Investome FX Proxy)",
        Accept: "application/json",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "fx_upstream_failed",
        message: text.slice(0, 300),
      });
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(text);
  } catch (error) {
    return res.status(502).json({
      error: "fx_proxy_failed",
      message: String(error?.message || error),
    });
  }
}