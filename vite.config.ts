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

type PrerenderPostRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
  updated_at: string | null;
  content_html: string | null;
};

type StaticRoute = {
  path: string;
  title: string;
  description: string;
  ogType: "website";
};

const STATIC_ROUTES: StaticRoute[] = [
  {
    path: "/magazine",
    title: "자동차 매거진 | 카테인",
    description:
      "자동차 구매, 유지비, 보험, 세금, 전기차 정보를 한곳에서 확인하세요.",
    ogType: "website",
  },
  {
    path: "/calculator",
    title: "자동차 유지비 계산기 | 월 비용·할부·보험료 무료 계산",
    description:
      "자동차 유지비 계산기로 월 비용을 바로 확인하세요. 할부금, 보험료, 자동차세, 유류비와 연간 비용을 무료로 비교합니다.",
    ogType: "website",
  },
  {
    path: "/about",
    title: "카테인 소개 | 자동차 정보 플랫폼",
    description:
      "카테인은 자동차 구매, 유지비, 보험, 세금 정보를 쉽게 비교할 수 있는 자동차 정보 플랫폼입니다.",
    ogType: "website",
  },
  {
    path: "/contact",
    title: "문의하기 | 카테인",
    description:
      "카테인 제휴, 오류 제보, 콘텐츠 문의를 위한 연락처와 운영 정보를 확인하세요.",
    ogType: "website",
  },
  {
    path: "/privacy",
    title: "개인정보처리방침 | 카테인",
    description:
      "카테인의 개인정보 수집, 이용, 광고 쿠키, 분석 도구 사용 기준을 안내합니다.",
    ogType: "website",
  },
  {
    path: "/terms",
    title: "이용약관 | 카테인",
    description:
      "카테인 서비스 이용 조건, 콘텐츠 이용 범위, 책임 제한 기준을 안내합니다.",
    ogType: "website",
  },
];

const APP_NOSCRIPT_REGEX =
  /<noscript>\s*<div style="padding:2rem;text-align:center;font-family:sans-serif;max-width:800px;margin:0 auto;">[\s\S]*?<\/div>\s*<\/noscript>/;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function createJsonLdScript(data: object | object[]) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(
    /<\/script/gi,
    "<\\/script",
  )}</script>`;
}

function extractFaqs(html: string) {
  const faqs: { question: string; answer: string }[] = [];
  const detailsRegex =
    /<details[^>]*>\s*<summary[^>]*>(.*?)<\/summary>\s*(?:<div[^>]*>)?([\s\S]*?)(?:<\/div>)?\s*<\/details>/gi;
  let match: RegExpExecArray | null;

  while ((match = detailsRegex.exec(html)) !== null) {
    const question = stripHtml(match[1]);
    const answer = stripHtml(match[2]);
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }

  return faqs;
}

function buildArticleStructuredData(
  row: PrerenderPostRow,
  siteUrl: string,
  description: string,
) {
  const articleUrl = `${siteUrl}/magazine/${row.slug}`;
  const imageUrl = row.thumbnail_url || `${siteUrl}/og-image.png`;
  const text = row.content_html ? stripHtml(row.content_html) : "";
  const wordCount = text ? text.split(/\s+/).length : undefined;
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": articleUrl,
    headline: row.title,
    description,
    articleSection: "자동차",
    ...(wordCount ? { wordCount } : {}),
    image: {
      "@type": "ImageObject",
      url: imageUrl,
      width: 1200,
      height: 630,
    },
    url: articleUrl,
    datePublished: row.published_at,
    dateModified: row.updated_at || row.published_at,
    inLanguage: "ko-KR",
    author: {
      "@type": "Person",
      name: "카테인 에디터",
      url: `${siteUrl}/about`,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "카테인",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "카테인",
      url: siteUrl,
    },
    about: {
      "@type": "Thing",
      name: "자동차",
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", "article > p:first-of-type"],
    },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "매거진",
        item: `${siteUrl}/magazine`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: row.title,
        item: articleUrl,
      },
    ],
  };
  const faqs = row.content_html ? extractFaqs(row.content_html) : [];
  const faqSchema = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }
    : null;

  return faqSchema ? [article, faqSchema, breadcrumb] : [article, breadcrumb];
}

function injectRouteMeta(
  indexHtml: string,
  route: StaticRoute,
  siteUrl: string,
) {
  const pageUrl = `${siteUrl}${route.path}`;
  const safeTitle = escapeAttribute(route.title);
  const safeDescription = escapeAttribute(route.description);

  return indexHtml
    .replace(/(<title>)[^<]*/, `$1${safeTitle}`)
    .replace(
      /(<meta name="description" content=")[^"]*/,
      `$1${safeDescription}`,
    )
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${safeTitle}`)
    .replace(
      /(<meta property="og:description" content=")[^"]*/,
      `$1${safeDescription}`,
    )
    .replace(/(<meta property="og:type" content=")[^"]*/, `$1${route.ogType}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${pageUrl}`)
    .replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${safeTitle}`)
    .replace(
      /(<meta name="twitter:description" content=")[^"]*/,
      `$1${safeDescription}`,
    )
    .replace(
      "</head>",
      `  <link rel="canonical" href="${pageUrl}" />\n  </head>`,
    )
    .replace(
      APP_NOSCRIPT_REGEX,
      `<noscript><div style="padding:2rem;max-width:800px;margin:0 auto;font-family:sans-serif"><h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p><p>이 페이지를 보려면 JavaScript를 활성화해 주세요.</p><p><a href="/">홈</a> | <a href="/magazine">매거진</a></p></div></noscript>`,
    );
}

async function writeStaticRouteFiles(
  distDir: string,
  indexHtml: string,
  siteUrl: string,
) {
  for (const route of STATIC_ROUTES) {
    const routeDir = path.join(distDir, route.path.replace(/^\//, ""));
    await fs.mkdir(routeDir, { recursive: true });
    await fs.writeFile(
      path.join(routeDir, "index.html"),
      injectRouteMeta(indexHtml, route, siteUrl),
      "utf-8",
    );
  }
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
        `User-agent: Yeti\n` +
        `Allow: /\n\n` +
        `User-agent: Daumoa\n` +
        `Allow: /\n\n` +
        `User-agent: OAI-SearchBot\n` +
        `Allow: /\n\n` +
        `User-agent: anthropic-ai\n` +
        `Allow: /\n\n` +
        `# Disallow scraper bots\n` +
        `User-agent: Bytespider\n` +
        `Disallow: /\n\n` +
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
      const distDir = path.resolve(__dirname, "dist");
      let indexHtml: string;
      try {
        indexHtml = await fs.readFile(
          path.join(distDir, "index.html"),
          "utf-8",
        );
      } catch {
        console.log(
          "[seo-plugin] Skipping pre-render: dist/index.html not found",
        );
        return;
      }

      await writeStaticRouteFiles(distDir, indexHtml, opts.siteUrl);
      console.log(
        `[seo-plugin] Generated ${STATIC_ROUTES.length} static route pages`,
      );

      const rawUrl = opts.tursoUrl ?? "";
      const tursoUrl = rawUrl
        .replace(/^\uFEFF/, "")
        .replace("libsql://", "https://");
      const tursoToken = (opts.tursoToken ?? "").replace(/^\uFEFF/, "");
      if (!tursoUrl || !tursoToken) {
        console.log(
          "[seo-plugin] Skipping article pre-render: TURSO_URL/TURSO_TOKEN not set",
        );
        return;
      }

      try {
        const { createClient } = await import("@libsql/client/web");
        const db = createClient({ url: tursoUrl, authToken: tursoToken });
        const result = await db.execute(
          "SELECT slug, title, excerpt, thumbnail_url, published_at, updated_at, content_html FROM posts WHERE datetime(published_at) <= datetime('now') ORDER BY published_at DESC",
        );

        let count = 0;
        for (const row of result.rows as PrerenderPostRow[]) {
          const { slug, title, excerpt, thumbnail_url } = row;
          if (!slug || !title) continue;

          const pageUrl = `${opts.siteUrl}/magazine/${slug}`;
          const rawExcerpt = (excerpt ?? title) as string;
          const desc = rawExcerpt
            .replace(/<[^>]+>/g, "")
            .slice(0, 160)
            .trim();
          const img =
            (thumbnail_url as string | null) ?? `${opts.siteUrl}/og-image.png`;
          const safeTitle = title.replace(/"/g, "&quot;");
          const safeDesc = desc.replace(/"/g, "&quot;");
          const structuredData = createJsonLdScript(
            buildArticleStructuredData(row, opts.siteUrl, desc),
          );

          const articleHtml = indexHtml
            .replace(/(<title>)[^<]*/, `$1${safeTitle} - 자동차 정보 | 카테인`)
            .replace(
              /(<meta name="description" content=")[^"]*/,
              `$1${safeDesc}`,
            )
            .replace(
              /(<meta property="og:title" content=")[^"]*/,
              `$1${safeTitle} - 자동차 정보 | 카테인`,
            )
            .replace(
              /(<meta property="og:description" content=")[^"]*/,
              `$1${safeDesc}`,
            )
            .replace(/(<meta property="og:type" content=")[^"]*/, "$1article")
            .replace(/(<meta property="og:url" content=")[^"]*/, `$1${pageUrl}`)
            .replace(/(<meta property="og:image" content=")[^"]*/, `$1${img}`)
            .replace(
              /(<meta name="twitter:title" content=")[^"]*/,
              `$1${safeTitle} - 자동차 정보 | 카테인`,
            )
            .replace(
              /(<meta name="twitter:description" content=")[^"]*/,
              `$1${safeDesc}`,
            )
            .replace(/(<meta name="twitter:image" content=")[^"]*/, `$1${img}`)
            .replace(
              "</head>",
              `  <link rel="canonical" href="${pageUrl}" />\n  ${structuredData}\n  </head>`,
            )
            .replace(
              APP_NOSCRIPT_REGEX,
              `<noscript><div style="padding:2rem;max-width:800px;margin:0 auto;font-family:sans-serif"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(desc)}</p><p>이 페이지를 보려면 JavaScript를 활성화해 주세요.</p><p><a href="/">홈</a> | <a href="/magazine">매거진</a></p></div></noscript>`,
            );

          const articleDir = path.join(distDir, "magazine", slug);
          await fs.mkdir(articleDir, { recursive: true });
          await fs.writeFile(
            path.join(articleDir, "index.html"),
            articleHtml,
            "utf-8",
          );
          count++;
        }
        console.log(`[seo-plugin] Pre-rendered ${count} article pages`);
      } catch (err) {
        console.warn("[seo-plugin] Article pre-render failed:", err);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = (env.VITE_SITE_URL || env.SITE_URL || "https://cartain.kr")
    .replace(/\/$/, "")
    .replace("https://www.cartain.kr", "https://cartain.kr");
  const tursoUrl = env.TURSO_URL ?? "";
  const tursoToken = env.TURSO_TOKEN ?? "";

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
    optimizeDeps: {
      include: ["lucide-react", "date-fns", "clsx", "tailwind-merge"],
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-charts": ["recharts"],
            "vendor-ui": ["lucide-react", "date-fns", "clsx", "tailwind-merge"],
            "vendor-radix": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-tooltip",
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
