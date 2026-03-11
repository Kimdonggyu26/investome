function buildQuery(params) {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const v = String(value).trim();
    if (!v) return;
    sp.set(key, v);
  });

  return sp.toString();
}

export async function fetchAssetQuote({ market, symbol, name, coinId }) {
  const query = buildQuery({
    market,
    symbol,
    name,
    coinId,
  });

  const res = await fetch(`/api/asset-quote?${query}`);

  if (!res.ok) {
    throw new Error(`asset quote failed: ${res.status}`);
  }

  const json = await res.json();
  return json?.item || null;
}

export async function fetchPortfolioQuotes(items) {
  const settled = await Promise.allSettled(
    items.map((item) =>
      fetchAssetQuote({
        market: item.market,
        symbol: item.symbol,
        name: item.name,
        coinId: item.coinId,
      })
    )
  );

  const map = {};

  settled.forEach((result, idx) => {
    const key = items[idx].id || `${items[idx].market}-${items[idx].symbol}`;

    if (result.status === "fulfilled" && result.value) {
      map[key] = result.value;
    } else {
      map[key] = null;
    }
  });

  return map;
}