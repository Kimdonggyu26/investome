import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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

export default defineConfig({
  plugins: [
    react(),
    {
      name: "investome-news-middleware",
      configureServer(server) {
        server.middlewares.use("/api/news", async (req, res) => {
          try {
            const url = new URL(req.url, "http://localhost");
            const topic = url.searchParams.get("topic") || "BUSINESS";
            const limit = Number(url.searchParams.get("limit") || "10");

            // ✅ redirect 문제를 피하기 위해 search RSS 사용(redirect 덜 타는 편)
            // 필요하면 q=를 바꿔서 키워드형도 가능
            const rssUrl =
              `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}` +
              `&hl=ko&gl=KR&ceid=KR:ko`;

            const r = await fetch(rssUrl, {
              headers: {
                // Google이 가끔 UA 없으면 막는 경우가 있어 안전하게 추가
                "User-Agent": "Mozilla/5.0 (Investome Dev)",
              },
              redirect: "follow",
            });

            if (!r.ok) {
              res.statusCode = r.status;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ error: `News fetch failed: ${r.status}` }));
              return;
            }

            const xml = await r.text();
            const items = parseRss(xml, Math.min(30, Math.max(1, limit)));

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ items }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
      },
    },
  ],
  server: {
    proxy: {
      "/cg": {
        target: "https://api.coingecko.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cg/, ""),
      },
      "/fx": {
        target: "https://open.er-api.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fx/, ""),
      },
    },
  },
});