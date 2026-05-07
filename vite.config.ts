import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs/promises";
import { componentTagger } from "lovable-tagger";

interface SeoPluginOptions {
  siteUrl: string;
  tursoUrl?: string;
  tursoToken?: string;
}

function generateSeoFilesPlugin(opts: SeoPluginOptions): Plugin {
  return {
    name: "generate-seo-files",
    apply: "build",
    async buildStart() {
      // sitemap.xml and rss.xml are served at runtime by Vercel API functions
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

      const publicDir = path.resolve(__dirname, "public");
      await fs.mkdir(publicDir, { recursive: true });
      await fs.writeFile(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
      console.log("[generate-seo-files] robots.txt generated");
    },

    async closeBundle() {
      // Pre-render article pages with correct OG tags for social media crawlers.
      // Vercel serves static files before applying rewrites, so these pre-rendered
      // pages will be served directly (with article-specific OG tags) instead of
      // the generic index.html.
      const rawUrl = opts.tursoUrl ?? '';
      const tursoUrl = rawUrl.replace(/^﻿/, '').replace('libsql://', 'https://');
      const tursoToken = (opts.tursoToken ?? '').replace(/^﻿/, '');
      if (!tursoUrl || !tursoToken) {
        console.log('[seo-plugin] Skipping article pre-render: TURSO_URL/TURSO_TOKEN not set');
        return;
      }

      const distDir = path.resolve(__dirname, 'dist');
      let indexHtml: string;
      try {
        indexHtml = await fs.readFile(path.join(distDir, 'index.html'), 'utf-8');
      } catch {
        console.log('[seo-plugin] Skipping pre-render: dist/index.html not found');
        return;
      }

      try {
        const { createClient } = await import('@libsql/client/web');
        const db = createClient({ url: tursoUrl, authToken: tursoToken });
        const result = await db.execute(
          'SELECT slug, title, excerpt, thumbnail_url, published_at FROM posts ORDER BY published_at DESC'
        );

        let count = 0;
        for (const row of result.rows as any[]) {
          const { slug, title, excerpt, thumbnail_url } = row;
          if (!slug || !title) continue;

          const pageUrl = `${opts.siteUrl}/magazine/${slug}`;
          const rawExcerpt = (excerpt ?? title) as string;
          const desc = rawExcerpt.replace(/<[^>]+>/g, '').slice(0, 160).trim();
          const img = (thumbnail_url as string | null) ?? `${opts.siteUrl}/og-image.png`;
          const safeTitle = title.replace(/"/g, '&quot;');
          const safeDesc = desc.replace(/"/g, '&quot;');

          const articleHtml = indexHtml
            .replace(/(<title>)[^<]*/,                         `$1${safeTitle} | 카테인`)
            .replace(/(<meta name="description" content=")[^"]*/,  `$1${safeDesc}`)
            .replace(/(<meta property="og:title" content=")[^"]*/,       `$1${safeTitle} | 카테인`)
            .replace(/(<meta property="og:description" content=")[^"]*/,  `$1${safeDesc}`)
            .replace(/(<meta property="og:type" content=")[^"]*/,         '$1article')
            .replace(/(<meta property="og:url" content=")[^"]*/,          `$1${pageUrl}`)
            .replace(/(<meta property="og:image" content=")[^"]*/,        `$1${img}`)
            .replace(/(<meta name="twitter:title" content=")[^"]*/,       `$1${safeTitle} | 카테인`)
            .replace(/(<meta name="twitter:description" content=")[^"]*/,  `$1${safeDesc}`)
            .replace(/(<meta name="twitter:image" content=")[^"]*/,       `$1${img}`);

          const articleDir = path.join(distDir, 'magazine', slug);
          await fs.mkdir(articleDir, { recursive: true });
          await fs.writeFile(path.join(articleDir, 'index.html'), articleHtml, 'utf-8');
          count++;
        }
        console.log(`[seo-plugin] Pre-rendered ${count} article pages`);
      } catch (err) {
        console.warn('[seo-plugin] Article pre-render failed:', err);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = env.VITE_SITE_URL || env.SITE_URL || "https://cartain.kr";
  const tursoUrl = env.TURSO_URL ?? '';
  const tursoToken = env.TURSO_TOKEN ?? '';

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      generateSeoFilesPlugin({ siteUrl, tursoUrl, tursoToken }),
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
