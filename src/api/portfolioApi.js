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

async function readJsonOrThrow(res, label) {
  if (!res.ok) {
    throw new Error(`${label} failed: ${res.status}`);
  }

  return res.json();
}

export async function fetchAssetQuote({ market, symbol, name, coinId }) {
  const query = buildQuery({ market, symbol, name, coinId });
  const res = await fetch(`/api/asset-quote?${query}`);
  const json = await readJsonOrThrow(res, "asset quote");
  return json?.item || null;
}

export async function searchAssetCatalog({ q, market }) {
  const query = buildQuery({ q, market });
  const res = await fetch(`/api/asset-search?${query}`);
  const json = await readJsonOrThrow(res, "asset search");
  return Array.isArray(json?.items) ? json.items : [];
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