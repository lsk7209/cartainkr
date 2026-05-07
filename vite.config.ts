import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs/promises";
import { componentTagger } from "lovable-tagger";

interface SeoPluginOptions {
  siteUrl: string;
  backendUrl?: string;
  supabaseAnonKey?: string;
}

function generateSeoFilesPlugin(opts: SeoPluginOptions): Plugin {
  return {
    name: "generate-seo-files",
    apply: "build",
    async buildStart() {
      const today = new Date().toISOString().split("T")[0];

      // Static routes
      const staticRoutes: Array<{ path: string; changefreq: string; priority: string }> = [
        { path: "/", changefreq: "daily", priority: "1.0" },
        { path: "/magazine", changefreq: "daily", priority: "0.9" },
        { path: "/calculator", changefreq: "weekly", priority: "0.8" },
        { path: "/about", changefreq: "monthly", priority: "0.6" },
        { path: "/contact", changefreq: "monthly", priority: "0.5" },
        { path: "/privacy", changefreq: "yearly", priority: "0.3" },
        { path: "/terms", changefreq: "yearly", priority: "0.3" },
      ];

      // Fetch dynamic posts from Supabase
      let dynamicPosts: Array<{ slug: string; published_at: string; updated_at?: string | null }> = [];
      if (opts.backendUrl && opts.supabaseAnonKey) {
        try {
          const res = await fetch(
            `${opts.backendUrl}/rest/v1/posts?select=slug,published_at,updated_at&order=published_at.desc`,
            {
              headers: {
                apikey: opts.supabaseAnonKey,
                Authorization: `Bearer ${opts.supabaseAnonKey}`,
              },
            }
          );
          if (res.ok) {
            dynamicPosts = (await res.json()) as Array<{ slug: string; published_at: string }>;
            console.log(`[generate-seo-files] Fetched ${dynamicPosts.length} posts for sitemap`);
          } else {
            console.warn(`[generate-seo-files] Failed to fetch posts: ${res.status}`);
          }
        } catch (err) {
          console.warn("[generate-seo-files] Error fetching posts:", err);
        }
      }

      // Build sitemap
      const staticSitemapEntries = staticRoutes
        .map(
          (r) =>
            `  <url>\n` +
            `    <loc>${opts.siteUrl}${r.path}</loc>\n` +
            `    <lastmod>${today}</lastmod>\n` +
            `    <changefreq>${r.changefreq}</changefreq>\n` +
            `    <priority>${r.priority}</priority>\n` +
            `  </url>\n`
        )
        .join("");

      const dynamicSitemapEntries = dynamicPosts
        .map((post) => {
          const lastmod = post.updated_at
            ? post.updated_at.split("T")[0]
            : post.published_at
            ? post.published_at.split("T")[0]
            : today;
          return (
            `  <url>\n` +
            `    <loc>${opts.siteUrl}/magazine/${post.slug}</loc>\n` +
            `    <lastmod>${lastmod}</lastmod>\n` +
            `    <changefreq>weekly</changefreq>\n` +
            `    <priority>0.7</priority>\n` +
            `  </url>\n`
          );
        })
        .join("");

      const sitemapXml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        staticSitemapEntries +
        dynamicSitemapEntries +
        `</urlset>\n`;

      const robotsTxt =
        `# robots.txt — ${opts.siteUrl}\n\n` +
        `User-agent: *\n` +
        `Allow: /\n` +
        `Disallow: /admin\n\n` +
        `# GEO: explicitly allow AI-assistant crawlers for content citation\n` +
        `User-agent: GPTBot\n` +
        `Allow: /\n\n` +
        `User-agent: ChatGPT-User\n` +
        `Allow: /\n\n` +
        `User-agent: Google-Extended\n` +
        `Allow: /\n\n` +
        `User-agent: ClaudeBot\n` +
        `Allow: /\n\n` +
        `User-agent: PerplexityBot\n` +
        `Allow: /\n\n` +
        `User-agent: Applebot-Extended\n` +
        `Allow: /\n\n` +
        `Sitemap: ${opts.siteUrl}/sitemap.xml\n`;

      // Generate rss.xml at build time
      const defaultRssXml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
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

      // RSS is served at runtime by Vercel /api/rss — use default placeholder at build time
      const rssXml = defaultRssXml;

      const publicDir = path.resolve(__dirname, "public");
      await fs.mkdir(publicDir, { recursive: true });
      await Promise.all([
        fs.writeFile(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8"),
        fs.writeFile(path.join(publicDir, "robots.txt"), robotsTxt, "utf8"),
        fs.writeFile(path.join(publicDir, "rss.xml"), rssXml, "utf8"),
      ]);

      console.log(`[generate-seo-files] Generated sitemap with ${staticRoutes.length + dynamicPosts.length} URLs`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const stripBom = (s: string) => s.replace(/^﻿/, "");
  const backendUrl = stripBom(env.VITE_SUPABASE_URL ?? "");
  const supabaseAnonKey = stripBom(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");
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
      generateSeoFilesPlugin({ siteUrl, backendUrl, supabaseAnonKey }),
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-charts': ['recharts'],
            'vendor-radix': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
