import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs/promises";
import { componentTagger } from "lovable-tagger";

function generateSeoFilesPlugin(siteUrl: string): Plugin {
  return {
    name: "generate-seo-files",
    apply: "build",
    async buildStart() {
      const today = new Date().toISOString().split("T")[0];

      const routes: Array<{ path: string; changefreq: string; priority: string }> = [
        { path: "/", changefreq: "daily", priority: "1.0" },
        { path: "/magazine", changefreq: "daily", priority: "0.9" },
        { path: "/calculator", changefreq: "weekly", priority: "0.8" },
        { path: "/about", changefreq: "monthly", priority: "0.6" },
        { path: "/contact", changefreq: "monthly", priority: "0.5" },
        { path: "/privacy", changefreq: "yearly", priority: "0.3" },
        { path: "/terms", changefreq: "yearly", priority: "0.3" },
      ];

      const sitemapXml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        routes
          .map(
            (r) =>
              `  <url>\n` +
              `    <loc>${siteUrl}${r.path}</loc>\n` +
              `    <lastmod>${today}</lastmod>\n` +
              `    <changefreq>${r.changefreq}</changefreq>\n` +
              `    <priority>${r.priority}</priority>\n` +
              `  </url>\n`,
          )
          .join("") +
        `</urlset>\n`;

      const robotsTxt =
        `# robots.txt\n` +
        `# ${siteUrl}\n\n` +
        `User-agent: *\n` +
        `Allow: /\n` +
        `Disallow: /admin\n\n` +
        `Sitemap: ${siteUrl}/sitemap.xml\n`;

      const publicDir = path.resolve(__dirname, "public");
      await fs.mkdir(publicDir, { recursive: true });
      await Promise.all([
        fs.writeFile(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8"),
        fs.writeFile(path.join(publicDir, "robots.txt"), robotsTxt, "utf8"),
      ]);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_SUPABASE_URL;
  const siteUrl = env.VITE_SITE_URL || env.SITE_URL || "https://cartain.kr";

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: backendUrl
        ? {
            "/rss.xml": {
              target: backendUrl,
              changeOrigin: true,
              rewrite: () => "/functions/v1/rss",
            },
          }
        : undefined,
    },
    plugins: [generateSeoFilesPlugin(siteUrl), react(), mode === "development" && componentTagger()].filter(
      Boolean,
    ),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

