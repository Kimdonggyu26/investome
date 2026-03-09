export async function fetchNews({ topic = "", limit = 12 } = {}) {
  const qs = new URLSearchParams({
    topic,
    limit: String(limit),
  });

  const res = await fetch(`/api/news?${qs.toString()}`);
  if (!res.ok) throw new Error(`News API failed: ${res.status}`);

  const json = await res.json();
  return Array.isArray(json.items) ? json.items : [];
}