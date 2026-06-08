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
  /<noscript>\s*<div style="padding:2rem;[\s\S]*?<\/div>\s*<\/noscript>/;

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

function routeFallbackHtml(route: StaticRoute) {
  const qualityText =
    `<h2>카테인 정보 활용 가이드</h2>` +
    `<p>자동차 구매와 유지비 판단은 차량 가격만으로 끝나지 않습니다. 카테인은 월 납입금, 보험료, 자동차세, 유류비 또는 충전비, 정비비, 감가상각, 보조금 조건을 함께 확인하는 방식을 권장합니다. 같은 예산이라도 출퇴근 거리, 가족 탑승 빈도, 주차 환경, 운전 경력, 연간 주행거리에 따라 적합한 차량과 금융 방식이 달라질 수 있습니다.</p>` +
    `<h2>구매 전 확인해야 할 비용 항목</h2>` +
    `<ul><li>차량 가격, 선수금, 할부 기간, 금리, 월 납입금</li><li>보험료, 자동차세, 취득세, 정기 검사와 소모품 비용</li><li>유류비 또는 충전비, 월 주행거리, 실제 연비와 계절별 효율</li><li>중고차 사고 이력, 보증 기간, 정비 기록, 감가상각 리스크</li><li>전기차 보조금, 충전 환경, 배터리 보증, 겨울 주행거리 감소</li></ul>` +
    `<p>매거진 글을 읽을 때는 본인의 예산과 주행 패턴을 먼저 정리한 뒤 관련 글과 자동차 유지비 계산기를 함께 확인하세요. 계산 결과는 확정 견적이 아니라 비교를 돕는 참고값이므로 실제 계약 전에는 제조사 견적서, 보험사 산출 결과, 지자체 보조금 공고, 공공기관 고시 자료를 함께 대조하는 것이 좋습니다.</p>` +
    `<h2>콘텐츠 검토와 신뢰 기준</h2>` +
    `<p>카테인은 특정 차종을 무조건 추천하기보다 장점, 단점, 비용 부담, 확인해야 할 조건을 나누어 설명합니다. 정책과 가격은 시점에 따라 달라질 수 있으므로 글의 작성일과 업데이트 기준을 확인하고, 중요한 구매 결정을 앞둔 경우 공식 자료와 실제 견적을 함께 확인하도록 안내합니다.</p>` +
    `<h2>상황별 추천 확인 순서</h2>` +
    `<p>첫차를 준비하는 운전자는 보험료와 주차 환경을 먼저 확인하고, 가족용 차량을 찾는 사용자는 실내 공간, 안전 사양, 카시트 설치 편의성, 장거리 연비를 함께 보는 것이 좋습니다. 출퇴근용 차량은 월 주행거리와 정체 구간 비율이 중요하며, 장거리 운행이 많다면 정비 주기와 타이어 비용도 예산에 포함해야 합니다.</p>` +
    `<p>리스, 장기렌트, 할부를 비교할 때는 월 납입금만 보지 말고 계약 기간, 주행거리 제한, 중도 해지 조건, 보험 포함 여부, 만기 인수 비용을 함께 확인해야 합니다. 전기차와 하이브리드는 충전 장소, 보조금 신청 가능성, 배터리 보증, 겨울철 효율, 중고차 잔존가치까지 비교해야 실제 비용 차이를 더 정확히 볼 수 있습니다.</p>` +
    `<p>카테인은 이런 기준을 매거진 글과 계산 도구에 나누어 정리합니다. 글 목록에서 관심 주제를 고른 뒤 계산기로 후보 차량의 월 비용을 다시 확인하면, 단순한 인기 순위보다 본인의 생활 조건에 맞는 결정을 내리는 데 도움이 됩니다.</p>`;
  const commonLinks =
    qualityText +
    `<nav aria-label="카테인 주요 링크"><a href="/">홈</a> | ` +
    `<a href="/magazine">자동차 매거진</a> | ` +
    `<a href="/calculator">자동차 유지비 계산기</a> | ` +
    `<a href="/about">카테인 소개</a> | ` +
    `<a href="/contact">문의하기</a></nav>`;

  if (route.path === "/magazine") {
    return `<noscript><div style="padding:2rem;font-family:sans-serif;max-width:960px;margin:0 auto;line-height:1.75;color:#1f2937"><h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p><p>카테인 매거진은 자동차 구매를 준비하는 사람, 이미 차량을 운행하는 사람, 전기차와 하이브리드 전환을 고민하는 사람을 위한 실용 자동차 정보 모음입니다. 단순한 차종 소개보다 실제 지출에 영향을 주는 유지비, 보험료, 세금, 정비비, 감가상각, 보조금 조건을 중심으로 설명합니다.</p><h2>자동차 매거진 주요 주제</h2><ul><li>신차와 중고차 구매 전 확인해야 할 계약, 견적, 감가 기준</li><li>자동차세, 보험료, 유류비, 정비비를 포함한 월 유지비 절약 방법</li><li>전기차 보조금, 충전비, 겨울 주행거리, 배터리 관리 기준</li><li>초보 운전자와 가족용 차량을 위한 차종 선택 체크리스트</li><li>리스, 장기렌트, 할부 구매를 비교할 때 놓치기 쉬운 총비용 항목</li></ul><h2>글을 읽는 순서</h2><p>처음 방문했다면 유지비 계산과 구매 전 점검 글부터 읽고, 관심 차종이 정해졌다면 차종별 월 비용 비교 글로 이동하세요. 각 글은 실제 소비자 관점에서 비용 항목과 주의할 점을 분리해 설명합니다. 자동차 제도와 세금은 시점에 따라 달라질 수 있으므로 글의 작성일과 업데이트 기준을 함께 확인하는 것이 좋습니다.</p><h2>카테인 콘텐츠 기준</h2><p>카테인은 광고 문구처럼 장점만 나열하지 않고 구매 전 확인해야 할 단점과 비용 리스크를 함께 적습니다. 보험료와 세금처럼 개인 조건에 따라 달라지는 항목은 확정 금액으로 단정하지 않고 비교 기준과 확인 방법을 안내합니다. 중요한 결정 전에는 제조사, 보험사, 공공기관의 최신 자료를 함께 확인하도록 권장합니다.</p><p>매거진 글을 읽은 뒤 실제 월 비용이 궁금하다면 자동차 유지비 계산기로 이동해 차량 가격, 할부 조건, 주행거리, 보험료를 직접 입력해 보세요. 이렇게 하면 단순 차량 가격이 아니라 매달 부담할 총비용 기준으로 더 현실적인 결정을 할 수 있습니다.</p>${commonLinks}</div></noscript>`;
  }

  if (route.path === "/calculator") {
    return `<noscript><div style="padding:2rem;font-family:sans-serif;max-width:960px;margin:0 auto;line-height:1.75;color:#1f2937"><h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p><h2>계산에 포함되는 항목</h2><ul><li>차량 가격과 할부 조건에 따른 월 납입금</li><li>연료비 또는 충전비, 월 주행거리, 공인·실주행 연비</li><li>자동차세, 보험료, 정비비, 소모품 비용</li></ul><p>계산기는 JavaScript 환경에서 동작합니다. 자동차 유지비 기준을 먼저 확인하려면 매거진의 구매 가이드와 비용 비교 글을 참고하세요.</p>${commonLinks}</div></noscript>`;
  }

  return `<noscript><div style="padding:2rem;font-family:sans-serif;max-width:960px;margin:0 auto;line-height:1.75;color:#1f2937"><h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p><p>카테인은 자동차 구매, 유지비, 보험, 세금, 전기차 정보를 소비자 관점에서 정리하는 자동차 정보 플랫폼입니다. 자세한 글은 매거진에서 확인할 수 있습니다.</p>${commonLinks}</div></noscript>`;
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
    .replace(/\s*<link rel="canonical" href="[^"]+" \/>\n?/, "\n")
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
      routeFallbackHtml(route),
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
            .replace(/\s*<link rel="canonical" href="[^"]+" \/>\n?/, "\n")
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
