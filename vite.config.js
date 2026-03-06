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

// ✅ CoinGecko 캐시
let tickerCache = { at: 0, data: null };
let cryptoTopCache = { at: 0, data: null };

export default defineConfig({
  plugins: [
    react(),
    {
      name: "investome-dev-middleware",
      configureServer(server) {
        // -------------------------
        // NEWS API
        // -------------------------
        server.middlewares.use("/api/news", async (req, res) => {
          try {
            const url = new URL(req.url, "http://localhost");
            const topic = url.searchParams.get("topic") || "한국 경제";
            const limit = Number(url.searchParams.get("limit") || "10");

            const rssUrl =
              `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}` +
              `&hl=ko&gl=KR&ceid=KR:ko`;

            const r = await fetch(rssUrl, {
              headers: {
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

        // -------------------------
        // COIN TICKER CACHE (10초)
        // -------------------------
        server.middlewares.use("/api/ticker", async (_req, res) => {
          try {
            const now = Date.now();

            if (tickerCache.data && now - tickerCache.at < 10_000) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify(tickerCache.data));
              return;
            }

            const url =
              "https://api.coingecko.com/api/v3/simple/price" +
              "?ids=bitcoin,ethereum,ripple" +
              "&vs_currencies=krw" +
              "&include_24hr_change=true";

            const r = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Investome Dev)",
              },
            });

            if (r.status === 429 && tickerCache.data) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify(tickerCache.data));
              return;
            }

            if (!r.ok) {
              res.statusCode = r.status;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ error: `Ticker fetch failed: ${r.status}` }));
              return;
            }

            const data = await r.json();
            tickerCache = { at: now, data };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(data));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: String(e) }));
          }
        });

        // -------------------------
        // CRYPTO TOP30 CACHE (30초)
        // -------------------------
        server.middlewares.use("/api/crypto-top30", async (_req, res) => {
          try {
            const now = Date.now();

            if (cryptoTopCache.data && now - cryptoTopCache.at < 30_000) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify(cryptoTopCache.data));
              return;
            }

            const url =
              "https://api.coingecko.com/api/v3/coins/markets" +
              "?vs_currency=krw" +
              "&order=market_cap_desc" +
              "&per_page=30" +
              "&page=1" +
              "&sparkline=false" +
              "&price_change_percentage=24h";

            const r = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Investome Dev)",
              },
            });

            if (r.status === 429 && cryptoTopCache.data) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify(cryptoTopCache.data));
              return;
            }

            if (!r.ok) {
              res.statusCode = r.status;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ error: `Crypto top30 fetch failed: ${r.status}` }));
              return;
            }

            const data = await r.json();
            cryptoTopCache = { at: now, data };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(data));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: String(e) }));
          }
        });

        // -------------------------
        // KOSPI TOP30 (임시 데이터)
        // -------------------------
        server.middlewares.use("/api/krx-top30", async (_req, res) => {
          const items = [
            {
              rank: 1,
              symbol: "005930",
              name: "삼성전자",
              capKRW: 520000000000000,
              priceKRW: 74500,
              changePct: 1.21,
              iconUrl: "https://logo.clearbit.com/samsung.com"
            },
            {
              rank: 2,
              symbol: "000660",
              name: "SK하이닉스",
              capKRW: 140000000000000,
              priceKRW: 183000,
              changePct: -0.84,
              iconUrl: "https://logo.clearbit.com/sk.com"
            },
            {
              rank: 3,
              symbol: "035420",
              name: "NAVER",
              capKRW: 34000000000000,
              priceKRW: 212000,
              changePct: 0.52,
              iconUrl: "https://logo.clearbit.com/naver.com"
            }
          ];

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ items }));
        });

        // -------------------------
        // NASDAQ TOP30 (임시 데이터)
        // -------------------------
        server.middlewares.use("/api/us-top30", async (_req, res) => {
          const items = [
            {
              rank: 1,
              symbol: "AAPL",
              name: "Apple",
              capKRW: 4200000000000000,
              priceKRW: 261000,
              changePct: 0.64,
              iconUrl: "https://logo.clearbit.com/apple.com"
            },
            {
              rank: 2,
              symbol: "MSFT",
              name: "Microsoft",
              capKRW: 3800000000000000,
              priceKRW: 540000,
              changePct: 1.12,
              iconUrl: "https://logo.clearbit.com/microsoft.com"
            },
            {
              rank: 3,
              symbol: "NVDA",
              name: "NVIDIA",
              capKRW: 3500000000000000,
              priceKRW: 1210000,
              changePct: 2.35,
              iconUrl: "https://logo.clearbit.com/nvidia.com"
            }
          ];

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ items }));
        });
      },
    },
  ],

  server: {
    proxy: {
      "/fx": {
        target: "https://open.er-api.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fx/, ""),
      },
    },
  },
});