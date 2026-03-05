export async function fetchNews({ topic = "BUSINESS", limit = 10 } = {}) {
  const res = await fetch(`/api/news?topic=${encodeURIComponent(topic)}&limit=${limit}`);
  if (!res.ok) throw new Error(`News API failed: ${res.status}`);
  const json = await res.json();
  return json.items || [];
}