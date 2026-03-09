export async function fetchNews({ category = "all", limit = 12, q = "" } = {}) {
  const qs = new URLSearchParams({
    category,
    limit: String(limit),
  });

  if (q && q.trim()) {
    qs.set("q", q.trim());
  }

  const res = await fetch(`/api/news?${qs.toString()}`);
  if (!res.ok) throw new Error(`News API failed: ${res.status}`);

  const json = await res.json();
  return Array.isArray(json.items) ? json.items : [];
}