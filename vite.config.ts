import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_SUPABASE_URL;

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: backendUrl
        ? {
            "/sitemap.xml": {
              target: backendUrl,
              changeOrigin: true,
              rewrite: () => "/functions/v1/sitemap",
            },
            "/rss.xml": {
              target: backendUrl,
              changeOrigin: true,
              rewrite: () => "/functions/v1/rss",
            },
          }
        : undefined,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

