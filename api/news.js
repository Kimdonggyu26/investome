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
    const desc = pick("description", itemXml);

    return {
      title: pick("title", itemXml),
      link: pick("link", itemXml),
      pubDate: pick("pubDate", itemXml),
      source: sourceMatch ? decodeHtml(sourceMatch[1].trim()) : "",
      description: desc,
      thumbnail: extractImageFromHtml(desc) || "",
    };
  });
}

function extractImageFromHtml(html = "") {
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) return imgMatch[1];

  const mediaMatch = html.match(/https?:\/\/[^"' ]+\.(?:jpg|jpeg|png|webp)/i);
  if (mediaMatch?.[0]) return mediaMatch[0];

  return "";
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Investome Vercel)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`);
  }

  return res.text();
}

async function fetchRss(query) {
  const rssUrl =
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=ko&gl=KR&ceid=KR:ko`;

  return fetchText(rssUrl);
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

function getQueriesByCategory(category) {
  switch (category) {
    case "crypto":
      return [
        "비트코인 OR 이더리움 OR 리플 OR 알트코인",
        "암호화폐 시장",
        "코인 규제",
        "ETF 비트코인",
        "가상자산 거래소",
      ];
    case "domestic":
      return [
        "코스피 OR 코스닥 OR 국내증시",
        "삼성전자 SK하이닉스 현대차 NAVER",
        "한국 증시 수급",
        "원달러 환율 국내증시",
        "한국 금리 증시",
      ];
    case "global":
      return [
        "나스닥 OR S&P500 OR 다우지수 OR 미국증시",
        "미국 증시 기술주",
        "연준 금리 미국주식",
        "엔비디아 애플 테슬라 아마존 메타",
        "월가 미국 시장",
      ];
    default:
      return [
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
  }
}

function absoluteUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function pickMetaContent(html, property) {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1] ? decodeHtml(match[1].trim()) : "";
}

async function enrichThumbnail(item) {
  if (item.thumbnail) {
    return {
      ...item,
      thumbnail: absoluteUrl(item.thumbnail),
    };
  }

  try {
    const html = await fetchText(item.link);
    const ogImage =
      pickMetaContent(html, "og:image") ||
      pickMetaContent(html, "twitter:image") ||
      extractImageFromHtml(html);

    return {
      ...item,
      thumbnail: absoluteUrl(ogImage),
    };
  } catch {
    return item;
  }
}

export default async function handler(req, res) {
  try {
    const limit = Math.min(60, Math.max(1, Number(req.query?.limit || "24")));
    const category = String(req.query?.category || "all").trim().toLowerCase();
    const q = String(req.query?.q || "").trim();

    const queries = q ? [q] : getQueriesByCategory(category);
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

    const enriched = await Promise.all(
      sorted.map((item, index) =>
        index < 12 ? enrichThumbnail(item) : Promise.resolve(item)
      )
    );

    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
    res.status(200).json({
      items: enriched,
      category,
      query: q || null,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}