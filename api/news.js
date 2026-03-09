function decodeHtml(text = "") {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function pick(tag, text) {
  const m = text.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? decodeHtml(m[1].trim()) : "";
}

function parseRss(xml) {
  const items = xml.split(/<item>/i).slice(1);

  return items.map((chunk) => {
    const itemXml = chunk.split(/<\/item>/i)[0] || "";

    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    return {
      title: pick("title", itemXml),
      link: pick("link", itemXml),
      pubDate: pick("pubDate", itemXml),
      source: sourceMatch ? decodeHtml(sourceMatch[1].trim()) : "",
    };
  });
}

async function fetchRss(query) {
  const rssUrl =
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=ko&gl=KR&ceid=KR:ko`;

  const r = await fetch(rssUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Investome Vercel)",
    },
    redirect: "follow",
  });

  if (!r.ok) {
    throw new Error(`News fetch failed: ${r.status}`);
  }

  return r.text();
}

function uniqueBy(items, getKey) {
  const map = new Map();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, item);
  }

  return [...map.values()];
}

export default async function handler(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit || "30")));
    const topic = String(req.query?.topic || "").trim();

    const defaultQueries = [
      "한국 경제",
      "미국 증시",
      "코스피",
      "나스닥",
      "환율",
      "금리",
      "연준",
      "비트코인",
      "이더리움",
      "AI 반도체",
    ];

    const queries = topic
      ? uniqueBy([topic, ...defaultQueries], (x) => x.toLowerCase())
      : defaultQueries;

    const xmlList = await Promise.allSettled(queries.map(fetchRss));

    const allItems = xmlList.flatMap((result) => {
      if (result.status !== "fulfilled") return [];
      return parseRss(result.value);
    });

    const deduped = uniqueBy(allItems, (item) => {
      const link = (item.link || "").trim().toLowerCase();
      const title = (item.title || "").trim().toLowerCase();
      return link || title;
    });

    const sorted = deduped
      .filter((item) => item.title && item.link)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, limit);

    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
    res.status(200).json({ items: sorted });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}