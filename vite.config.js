import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const springProxy = {
  target: "http://localhost:8080",
  changeOrigin: true,
  secure: false,
};

const vercelApiProxy = {
  target: "http://localhost:3000",
  changeOrigin: true,
  secure: false,
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/crypto-top30": vercelApiProxy,
      "/api/stock-top30": vercelApiProxy,
      "/api/commodity-top": vercelApiProxy,
      "/api/asset-quote": vercelApiProxy,
      "/api/asset-search": vercelApiProxy,
      "/api/ticker": vercelApiProxy,

      "/api/auth": springProxy,
      "/api/board": springProxy,
      "/api/news": springProxy,
    },
  },
});