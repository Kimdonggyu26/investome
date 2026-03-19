import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const vercelApiProxy = {
  target: "http://localhost:3000",
  changeOrigin: true,
  secure: false,
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/stock-top30": vercelApiProxy,
      "/api/crypto-top30": vercelApiProxy,
      "/api/commodity-top": vercelApiProxy,
      "/api/asset-quote": vercelApiProxy,
      "/api/asset-search": vercelApiProxy,
      "/api/ticker": vercelApiProxy,
    },
  },
});