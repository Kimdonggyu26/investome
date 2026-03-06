function pick(tag, text) {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return "";
  return m[1]
    .replace("<![CDATA[", "")
    .replace("]]>", "")
    .trim();
}

function parseRss(xml, limit = 10) {
  const items = xml.split(/<item>/i).slice(1);
  return items.slice(0, limit).map((chunk) => {
    const itemXml = chunk.split(/<\/item>/i)[0] || "";
    return {
      title: pick("title", itemXml),
      link: pick("link", itemXml),
      pubDate: pick("pubDate", itemXml),
    };
  });
}

export default async function handler(req, res) {
  try {
    const topic = req.query?.topic || "한국 경제";
    const limit = Number(req.query?.limit || "10");

    const rssUrl =
      `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}` +
      `&hl=ko&gl=KR&ceid=KR:ko`;

    const r = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      },
      redirect: "follow",
    });

    if (!r.ok) {
      res.status(r.status).json({ error: `News fetch failed: ${r.status}` });
      return;
    }

    const xml = await r.text();
    const items = parseRss(xml, Math.min(30, Math.max(1, limit)));

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}