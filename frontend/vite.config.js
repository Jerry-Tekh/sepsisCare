import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Optional dev-only proxy. Set API_PROXY_TARGET (e.g. the shared
      // backend URL) and VITE_API_BASE_URL=/api in .env to send API calls
      // through the Vite server. The browser then sees same-origin requests,
      // so the backend's CORS allow-list doesn't need to include localhost.
      proxy: env.API_PROXY_TARGET
        ? { "/api": { target: env.API_PROXY_TARGET, changeOrigin: true, secure: true } }
        : undefined,
    },
  };
});
