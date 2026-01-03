import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs/promises";
import { componentTagger } from "lovable-tagger";

function generateSeoFilesPlugin(opts: { siteUrl: string; backendUrl?: string }): Plugin {
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
              `    <loc>${opts.siteUrl}${r.path}</loc>\n` +
              `    <lastmod>${today}</lastmod>\n` +
              `    <changefreq>${r.changefreq}</changefreq>\n` +
              `    <priority>${r.priority}</priority>\n` +
              `  </url>\n`,
          )
          .join("") +
        `</urlset>\n`;

      const robotsTxt =
        `# robots.txt\n` +
        `# ${opts.siteUrl}\n\n` +
        `User-agent: *\n` +
        `Allow: /\n` +
        `Disallow: /admin\n\n` +
        `Sitemap: ${opts.siteUrl}/sitemap.xml\n`;

      // Generate rss.xml at build time so it exists as a real file in production.
      // (Some hosts don't apply _redirects, which can cause /rss.xml to fall back to the SPA 404.)
      const defaultRssXml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
        `  <channel>\n` +
        `    <title>카테인 - 자동차 정보 매거진</title>\n` +
        `    <link>${opts.siteUrl}</link>\n` +
        `    <description>자동차 유지비 계산, 차량 관리 팁, 최신 자동차 뉴스를 제공하는 카테인 매거진</description>\n` +
        `    <language>ko</language>\n` +
        `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n` +
        `    <atom:link href="${opts.siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>\n` +
        `  </channel>\n` +
        `</rss>\n`;

      let rssXml = defaultRssXml;
      if (opts.backendUrl) {
        try {
          const res = await fetch(`${opts.backendUrl}/functions/v1/rss`, {
            headers: {
              Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
            },
          });

          if (res.ok) {
            rssXml = await res.text();
          } else {
            console.warn(`[generate-seo-files] RSS fetch failed: ${res.status} ${res.statusText}`);
          }
        } catch (err) {
          console.warn("[generate-seo-files] RSS fetch error:", err);
        }
      }

      const publicDir = path.resolve(__dirname, "public");
      await fs.mkdir(publicDir, { recursive: true });
      await Promise.all([
        fs.writeFile(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8"),
        fs.writeFile(path.join(publicDir, "robots.txt"), robotsTxt, "utf8"),
        fs.writeFile(path.join(publicDir, "rss.xml"), rssXml, "utf8"),
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
    plugins: [
      generateSeoFilesPlugin({ siteUrl, backendUrl }),
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

