function decodeEntities(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function cleanText(value = "") {
  return decodeEntities(value).replace(/<[^>]*>/g, "").trim();
}

function extractTag(text, tag) {
  const match = String(text).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1] : "";
}

function cleanTitle(title, source) {
  const suffix = source ? ` - ${source}` : "";
  return suffix && title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

function decodeGoogleNewsLink(link) {
  try {
    const decoded = decodeURIComponent(link);
    const marker = decoded.indexOf("url=");
    if (marker < 0) return decoded;
    return decoded.slice(marker + 4).split("&")[0];
  } catch {
    return link;
  }
}

function parseRss(xml) {
  return String(xml)
    .split("<item>")
    .slice(1)
    .map((item) => {
      const source = cleanText(extractTag(item, "source"));
      const title = cleanTitle(cleanText(extractTag(item, "title")), source);
      return {
        title,
        link: decodeGoogleNewsLink(cleanText(extractTag(item, "link"))),
        pubDate: cleanText(extractTag(item, "pubDate")),
        description: cleanText(extractTag(item, "description")),
        source,
      };
    });
}

function resolveKeyword(category, topic, query) {
  if (query) return query;
  if (topic) return topic;

  switch (String(category || "all").toLowerCase()) {
    case "crypto":
      return '"비트코인" OR "이더리움" OR "가상자산" OR "암호화폐"';
    case "domestic":
    case "korea":
    case "kr":
    case "stocks":
      return '"코스피" OR "코스닥" OR "국내증시" OR "한국 증시" -Taiwan -Pakistan -UAE';
    case "global":
    case "overseas":
    case "us":
    case "world":
      return '"미국 증시" OR 나스닥 OR "S&P 500" OR 다우존스';
    default:
      return '"경제" OR "증시" OR "비트코인" OR "환율"';
  }
}

export default async function handler(req, res) {
  const category = String(req.query?.category || "all").trim();
  const topic = String(req.query?.topic || "").trim();
  const query = String(req.query?.q || "").trim();
  const requestedLimit = Number(req.query?.limit || 12);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 12;

  try {
    const keyword = resolveKeyword(category, topic, query);
    const endpoint = new URL("https://news.google.com/rss/search");
    endpoint.searchParams.set("q", keyword);
    endpoint.searchParams.set("hl", "ko");
    endpoint.searchParams.set("gl", "KR");
    endpoint.searchParams.set("ceid", "KR:ko");

    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Investome Vercel)",
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Google News RSS failed: ${response.status}`);
    }

    const items = parseRss(await response.text()).slice(0, limit);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ items, count: items.length });
  } catch (error) {
    res.status(200).json({
      items: [],
      count: 0,
      error: "news_fetch_failed",
      message: String(error?.message || error),
    });
  }
}
