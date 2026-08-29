import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, POSTS_PER_PAGE } from "./_lib/turso.js";
import { CACHE_CONTROL, setPublicCache } from "./_lib/cache.js";
import {
  escapeAttribute as escapeAttr,
  escapeHtml,
  hasEncodingCorruption,
  parseArticleSlug,
  PUBLIC_POST_INTEGRITY_SQL,
  sanitizeArticleHtml,
  toSafeAbsoluteHttpUrl,
} from "./_lib/contentSafety.js";
import {
  DEFAULT_ROBOTS_DIRECTIVE,
  getMagazineSeoPolicy,
  normalizeMagazinePage,
  normalizeMagazineSearchQuery,
} from "../src/lib/seoPolicy.js";

/**
 * 봇/크롤러 전용 서버사이드 렌더링(SSR).
 *
 * cartain.kr은 Vite SPA라 본문이 클라이언트 JS에 의존한다. AdSense·검색 크롤러는
 * JS 렌더링을 신뢰하지 않아 "콘텐츠 없음"으로 판정한다(가치 없는 콘텐츠 거부 원인).
 * vercel.json이 봇 User-Agent 요청만 이 함수로 rewrite하고, 사람은 기존 SPA를 받는다.
 * 봇과 사람이 보는 콘텐츠는 동일하므로 클로킹이 아니다(Google 권장 방식).
 */

const BASE = "https://cartain.kr";
const SITE_NAME = "카테인";

type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_html: string;
  thumbnail_url: string | null;
  published_at: string;
  updated_at: string | null;
};

type SummaryRow = {
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
};

const serializeJsonLd = (value: object): string =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

// 본문 마크다운 굵게/기울임 → HTML (클라이언트 markdownToHtml과 동일 규칙)
const markdownToHtml = (html: string): string =>
  html
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

const stripMarkdown = (text: string): string =>
  text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .trim();

// 봇이 raw 한글 URL(사이트맵·외부 링크)로 들어오면 decodeURIComponent가
// 잘못된 시퀀스에서 throw → 500. 디코딩 실패 시 원본을 그대로 사용한다.
const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// 제목에서 내부 링크(관련 글) 매칭에 쓸 핵심 키워드 1~2개를 뽑는다.
const KEYWORD_STOPWORDS = new Set([
  "2026",
  "2025",
  "비용",
  "가이드",
  "방법",
  "정리",
  "비교",
  "계산",
  "총정리",
  "완벽",
  "체크리스트",
]);
const pickTitleKeywords = (title: string): string[] => {
  const tokens = title
    .split(/[\s·,:/()[\]"'’”“|~-]+/)
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length >= 2 &&
        !/^\d+$/.test(t) &&
        !KEYWORD_STOPWORDS.has(t),
    );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length === 2) break;
  }
  return out;
};

interface HeadOptions {
  title: string;
  description: string;
  canonical: string;
  ogType?: "website" | "article";
  ogImage?: string | null;
  publishedAt?: string;
  modifiedAt?: string;
  jsonLd?: object[];
  robots?: string;
  linkTags?: string;
}

function renderHead(o: HeadOptions): string {
  const desc = o.description.slice(0, 160);
  const ogImage = o.ogImage || `${BASE}/og-image.png`;
  const jsonLdTags = (o.jsonLd ?? [])
    .map(
      (d) => `<script type="application/ld+json">${serializeJsonLd(d)}</script>`,
    )
    .join("\n    ");
  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(o.title)}</title>
    <meta name="description" content="${escapeAttr(desc)}" />
    <meta name="author" content="${SITE_NAME}" />
    <meta name="robots" content="${escapeAttr(o.robots ?? DEFAULT_ROBOTS_DIRECTIVE)}" />
    <link rel="canonical" href="${escapeAttr(o.canonical)}" />
    <meta name="google-site-verification" content="ekGswLIaR5UyG_klPv0QvN8hsWGdZUp4QO0-Lq6jUj0" />
    <meta name="naver-site-verification" content="cf24492e3e46c01418236115b39f38be940ba349" />
    <meta property="og:title" content="${escapeAttr(o.title)}" />
    <meta property="og:description" content="${escapeAttr(desc)}" />
    <meta property="og:type" content="${o.ogType ?? "website"}" />
    <meta property="og:url" content="${escapeAttr(o.canonical)}" />
    <meta property="og:image" content="${escapeAttr(ogImage)}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="ko_KR" />
    ${o.publishedAt ? `<meta property="article:published_time" content="${escapeAttr(o.publishedAt)}" />` : ""}
    ${o.modifiedAt ? `<meta property="article:modified_time" content="${escapeAttr(o.modifiedAt)}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(o.title)}" />
    <meta name="twitter:description" content="${escapeAttr(desc)}" />
    <meta name="twitter:image" content="${escapeAttr(ogImage)}" />
    <link rel="alternate" hreflang="ko" href="${escapeAttr(o.canonical)}" />
    <link rel="alternate" hreflang="x-default" href="${escapeAttr(o.canonical)}" />
    <link rel="alternate" type="application/rss+xml" title="카테인 RSS" href="${BASE}/rss.xml" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    ${o.linkTags ?? ""}
    ${jsonLdTags}
  </head>`;
}

const SITE_NAV = `<nav aria-label="주요 메뉴" style="border-bottom:1px solid #e5e7eb;padding:12px 0;margin-bottom:24px;">
  <a href="/" style="font-weight:700;margin-right:16px;">카테인</a>
  <a href="/magazine" style="margin-right:12px;">매거진</a>
  <a href="/calculator" style="margin-right:12px;">유지비 계산기</a>
  <a href="/about" style="margin-right:12px;">소개</a>
  <a href="/contact">문의</a>
</nav>`;

const SITE_FOOTER = `<footer style="border-top:1px solid #e5e7eb;margin-top:48px;padding:24px 0;font-size:14px;color:#6b7280;">
  <nav aria-label="푸터 메뉴">
    <a href="/about" style="margin-right:12px;">소개</a>
    <a href="/contact" style="margin-right:12px;">문의</a>
    <a href="/privacy" style="margin-right:12px;">개인정보처리방침</a>
    <a href="/terms">이용약관</a>
  </nav>
  <p style="margin-top:12px;">© ${new Date().getFullYear()} 카테인(cartain.kr) — 자동차 정보 플랫폼</p>
</footer>`;

function htmlDocument(head: string, bodyMain: string): string {
  return `<!doctype html>
<html lang="ko">
  ${head}
  <body>
    <div id="root">
      <div style="max-width:880px;margin:0 auto;padding:16px;font-family:'Pretendard',-apple-system,sans-serif;line-height:1.7;color:#1f2937;">
        ${SITE_NAV}
        <main id="main-content">
${bodyMain}
        </main>
        ${SITE_FOOTER}
      </div>
    </div>
  </body>
</html>`;
}

// ---------- 페이지 렌더러 ----------

async function renderArticle(slug: string): Promise<string | null> {
  const db = getDb();
  const requestedSlug = parseArticleSlug(slug);
  if (!requestedSlug) return null;

  // DB는 raw 한글 slug와 과거 percent-encoded slug가 섞여 있어 두 형태를 함께 조회한다.
  const rows = await db.execute({
    sql: `SELECT * FROM posts WHERE ${PUBLIC_POST_INTEGRITY_SQL} AND slug IN (?, ?) AND datetime(published_at) <= datetime('now') LIMIT 1`,
    args: [requestedSlug.decoded, requestedSlug.urlSegment],
  });
  const post = rows.rows[0] as unknown as PostRow | undefined;
  if (
    !post ||
    hasEncodingCorruption(post.title, post.excerpt, post.content_html)
  ) {
    return null;
  }

  const postSlug = parseArticleSlug(post.slug);
  if (!postSlug) return null;
  const canonical = `${BASE}/magazine/${postSlug.urlSegment}`;
  const description = post.excerpt
    ? stripMarkdown(post.excerpt)
    : stripMarkdown(post.title);
  const bodyHtml = sanitizeArticleHtml(markdownToHtml(post.content_html || ""));
  const thumbnailUrl = toSafeAbsoluteHttpUrl(post.thumbnail_url, BASE);

  // 관련 글: 제목 키워드로 매칭, 부족하면 최신 글로 채운다.
  // 크롤러가 볼 수 있는 문맥 내부 링크로 크롤 깊이와 주제 연관도를 높인다.
  const related: SummaryRow[] = [];
  const seenSlugs = new Set([requestedSlug.decoded, requestedSlug.urlSegment, post.slug]);
  const pushRelated = (rows: unknown[]) => {
    for (const raw of rows as SummaryRow[]) {
      if (related.length >= 5 || !raw?.slug || seenSlugs.has(raw.slug)) continue;
      seenSlugs.add(raw.slug);
      related.push(raw);
    }
  };
  const keywords = pickTitleKeywords(post.title);
  try {
    if (keywords.length) {
      const kwRows = await db.execute({
        sql: `SELECT title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE ${PUBLIC_POST_INTEGRITY_SQL} AND datetime(published_at) <= datetime('now') AND slug NOT IN (?, ?) AND (${keywords
          .map(() => "title LIKE ?")
          .join(" OR ")}) ORDER BY published_at DESC LIMIT 6`,
        args: [
          requestedSlug.decoded,
          requestedSlug.urlSegment,
          ...keywords.map((k) => `%${k}%`),
        ],
      });
      pushRelated(kwRows.rows);
    }
    if (related.length < 4) {
      const recentRows = await db.execute({
        sql: `SELECT title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE ${PUBLIC_POST_INTEGRITY_SQL} AND datetime(published_at) <= datetime('now') AND slug NOT IN (?, ?) ORDER BY published_at DESC LIMIT 8`,
        args: [requestedSlug.decoded, requestedSlug.urlSegment],
      });
      pushRelated(recentRows.rows);
    }
  } catch {
    // 관련 글 조회 실패는 본문 렌더링을 막지 않는다.
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    image: thumbnailUrl || `${BASE}/og-image.png`,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: { "@type": "Organization", name: SITE_NAME, url: `${BASE}/about` },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${BASE}/icon-512x512.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: BASE },
      {
        "@type": "ListItem",
        position: 2,
        name: "매거진",
        item: `${BASE}/magazine`,
      },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  const head = renderHead({
    title: `${post.title} | 카테인`,
    description,
    canonical,
    ogType: "article",
    ogImage: thumbnailUrl,
    publishedAt: post.published_at,
    modifiedAt: post.updated_at || post.published_at,
    jsonLd: [articleSchema, breadcrumbSchema],
  });

  const thumb = thumbnailUrl
    ? `<img src="${escapeAttr(thumbnailUrl)}" alt="${escapeAttr(post.title)}" style="width:100%;border-radius:12px;margin-bottom:24px;" />`
    : "";

  const body = `<article>
  <nav aria-label="브레드크럼" style="font-size:13px;color:#6b7280;margin-bottom:12px;">
    <a href="/">홈</a> › <a href="/magazine">매거진</a>
  </nav>
  <h1 style="font-size:2rem;font-weight:800;margin-bottom:12px;">${escapeHtml(post.title)}</h1>
  <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
    <span>글쓴이 <a href="/about">카테인 편집팀</a></span> ·
    <time datetime="${escapeAttr(post.published_at)}">${formatDate(post.published_at)}</time>
  </p>
  ${thumb}
  <div class="magazine-body">${bodyHtml}</div>
  ${
    related.length
      ? `<nav aria-label="관련 글" style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;">
    <h2 style="font-size:1.1rem;">관련 자동차 정보 더 보기</h2>
    <ul>
${related
  .map((p) => {
    const s = parseArticleSlug(p.slug);
    if (!s) return "";
    return `      <li><a href="/magazine/${escapeAttr(s.urlSegment)}">${escapeHtml(p.title)}</a></li>`;
  })
  .filter(Boolean)
  .join("\n")}
    </ul>
  </nav>`
      : ""
  }
  <nav aria-label="추천 콘텐츠" style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
    <h2 style="font-size:1.1rem;">함께 읽으면 좋은 콘텐츠</h2>
    <ul>
      <li><a href="/calculator">자동차 유지비 계산기로 월 비용 확인하기</a></li>
      <li><a href="/magazine">최신 자동차 구매 가이드 &amp; 유지비 정보 보기</a></li>
      <li><a href="/about">카테인 소개 및 서비스 알아보기</a></li>
    </ul>
  </nav>
</article>`;

  return htmlDocument(head, body);
}

function renderPostListItems(posts: SummaryRow[]): string {
  if (!posts.length) return "<p>등록된 글이 없습니다.</p>";
  return `<ul style="list-style:none;padding:0;">
${posts
  .map((p) => {
    const slug = parseArticleSlug(p.slug);
    if (!slug) return "";
    const url = `/magazine/${slug.urlSegment}`;
    const excerpt = p.excerpt
      ? escapeHtml(stripMarkdown(p.excerpt).slice(0, 120))
      : "";
    return `      <li style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f3f4f6;">
        <a href="${escapeAttr(url)}" style="font-size:1.15rem;font-weight:700;">${escapeHtml(p.title)}</a>
        <p style="font-size:13px;color:#6b7280;margin:4px 0;">${formatDate(p.published_at)}</p>
        ${excerpt ? `<p style="color:#374151;">${excerpt}</p>` : ""}
      </li>`;
  })
  .join("\n")}
</ul>`;
}

async function renderHome(): Promise<string> {
  const db = getDb();
  const rows = await db.execute(
    `SELECT title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE ${PUBLIC_POST_INTEGRITY_SQL} AND datetime(published_at) <= datetime('now') ORDER BY published_at DESC LIMIT 12`,
  );
  const posts = rows.rows as unknown as SummaryRow[];
  const head = renderHead({
    title: "카테인 - 자동차 정보 플랫폼",
    description:
      "카테인은 자동차 구매, 유지비, 보험, 세금 정보를 쉽게 비교할 수 있는 자동차 정보 플랫폼입니다. 실용적인 자동차 가이드와 유지비 계산기를 제공합니다.",
    canonical: BASE,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: BASE,
        potentialAction: {
          "@type": "SearchAction",
          target: `${BASE}/magazine?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  });
  const body = `<section>
  <h1 style="font-size:2rem;font-weight:800;">카테인 — 자동차 정보 플랫폼</h1>
  <p style="font-size:1.05rem;color:#374151;margin:12px 0 24px;">
    자동차 구매 가이드, 유지비 계산, 보험·세금 정보까지. 카테인은 자동차에 관한 실용적인 정보를
    한곳에서 제공합니다. 매거진에서 최신 자동차 정보를 확인하고, 유지비 계산기로 내 차의 월 비용을 예측해 보세요.
  </p>
  <h2 style="font-size:1.4rem;font-weight:700;margin-top:32px;">자동차 비용 정보를 확인하는 기준</h2>
  <p>
    카테인의 자동차 유지비 계산과 매거진 글은 특정 차량, 금융 상품, 보험 상품 가입을 보장하지 않는 참고 자료입니다.
    실제 구매 조건은 제조사 할인, 판매사 견적, 금융 수수료, 보험 산출 결과, 거주 지역 보조금, 차량 등록 시점에 따라 달라질 수 있습니다.
    사용자는 계산 결과를 확정 금액으로 보지 말고 후보 차량을 비교하기 위한 기준값으로 활용해야 합니다.
  </p>
  <p>
    중고차를 검토할 때는 판매 글의 장점보다 성능점검기록부, 보험 이력, 소유자 변경, 리콜 여부, 정비 영수증,
    타이어와 브레이크 상태를 먼저 확인하는 것이 안전합니다. 신차와 전기차는 출고 대기, 보조금 잔여 예산,
    충전 환경, 배터리 보증, 장거리 운행 패턴까지 함께 봐야 하며 계약 직전에는 자동차365, 보험개발원,
    제조사 공식 견적을 다시 대조해야 합니다.
  </p>
  <p>
    카테인은 광고 문구처럼 장점만 나열하기보다 운전자가 놓치기 쉬운 비용과 확인해야 할 공식 자료를 함께 안내합니다.
    보험료와 세금처럼 개인 조건에 따라 달라지는 항목은 확정 금액으로 단정하지 않고 비교 기준과 확인 방법을 설명합니다.
    중요한 구매 결정을 앞두고 있다면 매거진 글을 읽은 뒤 실제 견적서와 공공기관 자료를 함께 확인하는 것이 좋습니다.
  </p>
  <h2 style="font-size:1.4rem;font-weight:700;margin-top:32px;">최신 자동차 매거진</h2>
  ${renderPostListItems(posts)}
  <p><a href="/magazine">매거진 글 전체 보기 →</a></p>
</section>`;
  return htmlDocument(head, body);
}

async function renderMagazineList(searchQuery: string, page: number): Promise<string> {
  const db = getDb();
  const seoPolicy = getMagazineSeoPolicy(BASE, searchQuery, page);
  const isSearch = seoPolicy.isSearch;
  const rows = isSearch
    ? await db.execute({
        sql: `SELECT title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE ${PUBLIC_POST_INTEGRITY_SQL} AND datetime(published_at) <= datetime('now') AND (title LIKE ? OR excerpt LIKE ?) ORDER BY published_at DESC LIMIT 30`,
        args: [`%${searchQuery}%`, `%${searchQuery}%`],
      })
    : await db.execute({
        sql: `SELECT title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE ${PUBLIC_POST_INTEGRITY_SQL} AND datetime(published_at) <= datetime('now') ORDER BY published_at DESC LIMIT ? OFFSET ?`,
        args: [POSTS_PER_PAGE, (page - 1) * POSTS_PER_PAGE],
      });
  const posts = rows.rows as unknown as SummaryRow[];

  // 페이지네이션: 크롤러가 전체 글 목록을 순회할 수 있도록 이전/다음/번호 링크를 노출한다.
  let totalPages = 1;
  if (!isSearch) {
    try {
      const countRows = await db.execute(
        `SELECT COUNT(*) AS n FROM posts WHERE ${PUBLIC_POST_INTEGRITY_SQL} AND datetime(published_at) <= datetime('now')`,
      );
      const total = Number(
        (countRows.rows[0] as unknown as { n: number | string })?.n ?? 0,
      );
      totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
    } catch {
      totalPages = 1;
    }
  }
  const pageUrl = (n: number) => (n <= 1 ? `${BASE}/magazine` : `${BASE}/magazine?page=${n}`);

  const head = renderHead({
    title: seoPolicy.title,
    description: seoPolicy.description,
    canonical: seoPolicy.canonicalUrl,
    robots: seoPolicy.robots,
    linkTags:
      !isSearch && totalPages > 1
        ? [
            page > 1
              ? `<link rel="prev" href="${escapeAttr(pageUrl(page - 1))}" />`
              : "",
            page < totalPages
              ? `<link rel="next" href="${escapeAttr(pageUrl(page + 1))}" />`
              : "",
          ]
            .filter(Boolean)
            .join("\n    ")
        : undefined,
  });

  const paginationNav =
    !isSearch && totalPages > 1
      ? (() => {
          const windowStart = Math.max(1, page - 2);
          const windowEnd = Math.min(totalPages, windowStart + 4);
          const numbered: string[] = [];
          for (let n = windowStart; n <= windowEnd; n += 1) {
            numbered.push(
              n === page
                ? `<strong aria-current="page">${n}</strong>`
                : `<a href="${escapeAttr(pageUrl(n))}">${n}</a>`,
            );
          }
          return `<nav aria-label="페이지 이동" style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;gap:10px;flex-wrap:wrap;">
    ${page > 1 ? `<a href="${escapeAttr(pageUrl(page - 1))}" rel="prev">← 이전</a>` : ""}
    ${numbered.join("\n    ")}
    ${page < totalPages ? `<a href="${escapeAttr(pageUrl(page + 1))}" rel="next">다음 →</a>` : ""}
  </nav>`;
        })()
      : "";

  const body = `<section>
  <h1 style="font-size:2rem;font-weight:800;">자동차 매거진</h1>
  <p style="color:#374151;margin:12px 0 24px;">자동차 구매·유지비·보험·세금·전기차 정보를 한곳에서 확인하세요.</p>
  ${isSearch ? `<p><strong>${escapeHtml(searchQuery)}</strong> 검색 결과</p>` : `<p style="font-size:13px;color:#6b7280;">${page}페이지 / 전체 ${totalPages}페이지</p>`}
  ${renderPostListItems(posts)}
  ${paginationNav}
</section>`;
  return htmlDocument(head, body);
}

function renderStaticPage(path: string): string | null {
  const pages: Record<
    string,
    { title: string; description: string; body: string }
  > = {
    "/about": {
      title: "카테인 소개 | 자동차 정보 플랫폼",
      description:
        "카테인은 자동차 구매, 유지비, 보험, 세금 정보를 쉽게 비교할 수 있는 자동차 정보 플랫폼입니다.",
      body: `<h1>카테인 소개</h1>
  <p>카테인(cartain.kr)은 자동차를 사고, 유지하고, 관리하는 데 필요한 정보를 누구나 쉽게 찾을 수 있도록 만든 자동차 정보 플랫폼입니다.</p>
  <h2>우리가 다루는 정보</h2>
  <ul>
    <li>자동차 구매 가이드 — 신차·중고차 선택, 견적, 계약 시 주의사항</li>
    <li>유지비 정보 — 보험료, 자동차세, 연료비, 정비 비용</li>
    <li>유지비 계산기 — 차종별 월 유지비를 직접 계산</li>
    <li>전기차·친환경차 — 보조금, 충전, 세제 혜택</li>
  </ul>
  <h2>운영 원칙</h2>
  <p>카테인은 실제 소비자가 비용과 조건을 비교하는 데 필요한 정보를 우선합니다. 수치와 제도를 인용할 때는 가능한 범위에서 기준 시점과 공식 확인 경로를 표시하고, 중요한 결정 전에는 최신 자료를 다시 확인하도록 안내합니다.</p>
  <p>문의는 <a href="/contact">문의 페이지</a>를 이용해 주세요.</p>`,
    },
    "/contact": {
      title: "문의하기 | 카테인",
      description:
        "카테인에 대한 문의, 제휴, 정보 정정 요청은 이메일로 보내주세요.",
      body: `<h1>문의하기</h1>
  <p>카테인에 대한 문의, 콘텐츠 정정 요청, 제휴 제안은 아래 이메일로 보내주시면 확인 후 답변드립니다.</p>
  <ul>
    <li>이메일: <a href="mailto:contact@cartain.kr">contact@cartain.kr</a></li>
    <li>운영 시간: 평일 10:00 ~ 18:00 (주말·공휴일 제외)</li>
    <li>응답: 보통 영업일 기준 1~3일 이내</li>
  </ul>
  <h2>자주 묻는 문의</h2>
  <p>콘텐츠의 사실 오류나 오래된 정보를 발견하셨다면 해당 글의 주소와 함께 알려주세요. 빠르게 검토해 수정하겠습니다.</p>`,
    },
    "/privacy": {
      title: "개인정보처리방침 | 카테인",
      description:
        "카테인의 개인정보 수집·이용 및 Google AdSense 쿠키 사용에 관한 안내입니다.",
      body: `<h1>개인정보처리방침</h1>
  <p>카테인(cartain.kr, 이하 '사이트')은 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」을 준수합니다.</p>
  <h2>1. 수집하는 정보</h2>
  <p>사이트는 회원가입 없이 이용할 수 있으며, 별도의 개인정보를 직접 수집하지 않습니다. 다만 서비스 이용 과정에서 방문 기록, 쿠키, 기기·브라우저 정보가 자동으로 생성·수집될 수 있습니다.</p>
  <h2>2. 쿠키 및 제3자 광고</h2>
  <p>본 사이트는 사용자가 쿠키에 동의한 경우에만 Google AdSense, Google Analytics와 쿠팡 파트너스 제휴 배너의 외부 이미지·측정 스크립트를 불러옵니다. 거부하더라도 계산기와 매거진의 핵심 기능은 계속 이용할 수 있습니다.</p>
  <ul>
    <li>이용자는 <a href="https://policies.google.com/technologies/ads" rel="noopener noreferrer" target="_blank">Google 광고 설정</a>에서 맞춤 광고를 비활성화할 수 있습니다.</li>
    <li>브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 일부 기능 이용에 제한이 있을 수 있습니다.</li>
  </ul>
  <h2>3. 웹 분석 도구</h2>
  <p>사이트는 동의한 사용자의 서비스 이용 흐름을 개선하기 위해 Google Analytics를 사용하며, 계산 완료와 같은 집계 이벤트를 측정합니다.</p>
  <h2>4. 콘텐츠 전송 서비스</h2>
  <p>게시글 이미지와 웹 글꼴은 Supabase Storage와 jsDelivr를 통해 제공될 수 있으며, 콘텐츠 요청 과정에서 IP 주소, 요청 시각과 브라우저 정보가 처리될 수 있습니다.</p>
  <h2>5. 보유 및 이용 기간</h2>
  <p>브라우저의 동의 선택은 철회하거나 저장 정보를 삭제할 때까지 남습니다. 제3자 서비스에서 처리되는 정보는 각 사업자의 보유 정책을 따르며, 이메일 문의는 처리 목적 달성 후 삭제하되 법정 보존 의무가 있으면 해당 기간까지 보관할 수 있습니다.</p>
  <h2>6. 문의</h2>
  <p>개인정보 관련 문의는 <a href="mailto:contact@cartain.kr">contact@cartain.kr</a>로 연락해 주세요. 본 방침은 법령·서비스 변경에 따라 개정될 수 있습니다.</p>`,
    },
    "/terms": {
      title: "이용약관 | 카테인",
      description: "카테인 서비스 이용에 관한 약관 안내입니다.",
      body: `<h1>이용약관</h1>
  <h2>제1조 (목적)</h2>
  <p>본 약관은 카테인(cartain.kr, 이하 '사이트')이 제공하는 자동차 정보 서비스의 이용 조건과 절차를 규정함을 목적으로 합니다.</p>
  <h2>제2조 (콘텐츠의 성격)</h2>
  <p>사이트가 제공하는 모든 정보는 일반적인 참고용이며, 특정 상황에 대한 전문적 조언(법률·세무·금융 등)을 대체하지 않습니다. 자동차 구매·보험·세금 등 중요한 결정 전에는 공식 기관 또는 전문가의 확인을 권장합니다.</p>
  <h2>제3조 (책임의 한계)</h2>
  <p>사이트는 정보의 정확성을 위해 노력하나, 제도 변경·오기 등으로 인한 오류가 있을 수 있습니다. 이용자가 본 사이트의 정보를 바탕으로 내린 결정과 그 결과에 대해 사이트는 법적 책임을 지지 않습니다.</p>
  <h2>제4조 (저작권)</h2>
  <p>사이트에 게시된 콘텐츠의 저작권은 카테인에 있으며, 무단 복제·배포를 금합니다.</p>
  <h2>제5조 (약관의 변경)</h2>
  <p>본 약관은 관련 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 사이트에 공지합니다.</p>`,
    },
    "/calculator": {
      title: "자동차 유지비 계산기 | 월 비용·할부·보험료 무료 계산",
      description:
        "차량 가격, 선수금, 할부 금리, 연비, 주행거리와 보험료를 입력해 월·연간 자동차 유지비를 무료로 비교하세요.",
      body: `<h1>자동차 유지비 계산기</h1>
  <p>회원가입 없이 차량 가격, 선수금, 할부 기간과 금리, 연비, 월 주행거리, 유가, 보험료를 입력하면 예상 월 유지비와 연간 비용을 비교할 수 있습니다.</p>
  <p><a href="#calculator-input">내 조건으로 월 유지비 계산하기</a></p>
  <h2>계산에 포함되는 항목</h2>
  <ul>
    <li>월 할부금 — 차량 가격에서 선수금을 뺀 원금, 기간, 연 금리를 사용한 원리금균등상환 예상액</li>
    <li>월 연료비 — 월 주행거리 ÷ 연비 × 입력한 연료 단가</li>
    <li>월 보험료 — 사용자가 받은 연 보험료 견적을 월 단위로 환산한 값</li>
    <li>자동차세 — 선택한 차종의 예시 세액 또는 사용자가 확인한 연세액의 월 환산값</li>
  </ul>
  <h2>계산 순서</h2>
  <ol id="calculator-input">
    <li>차종 예시를 고르거나 차량 가격과 선수금을 직접 입력합니다.</li>
    <li>실제 금융 견적의 할부 기간과 금리를 입력합니다.</li>
    <li>평소 월 주행거리, 실주행 연비, 현재 연료 단가와 보험료를 입력합니다.</li>
    <li>계산 결과에서 월 비용, 연간 비용과 항목별 비중을 확인합니다.</li>
  </ol>
  <h2>결과를 해석할 때 주의할 점</h2>
  <p>결과는 입력값을 기준으로 한 비교용 예상치이며 확정 견적이 아닙니다. 주차비, 통행료, 정비·소모품, 취득세와 감가상각은 개인별 차이가 커 별도로 더해야 합니다. 전기차는 충전 장소와 요금제, 계절 효율을 반영한 실제 전비와 충전 단가를 사용하세요.</p>
  <h2>기준과 공식 자료</h2>
  <p>자동차세와 연납 공제는 <a href="https://www.wetax.go.kr" rel="noopener noreferrer">위택스</a>, 차량 이력과 등록 정보는 <a href="https://www.car365.go.kr" rel="noopener noreferrer">자동차365</a>, 연료 가격은 <a href="https://www.opinet.co.kr" rel="noopener noreferrer">오피넷</a>에서 최신 값을 확인할 수 있습니다.</p>
  <h2>자주 묻는 질문</h2>
  <h3>계산 결과가 실제 청구액과 다른 이유는 무엇인가요?</h3>
  <p>금융 수수료, 운전자별 보험료, 실제 연비, 지역별 세금과 주차·통행·정비비가 입력값과 다를 수 있기 때문입니다. 계약 전 실제 견적과 고지서를 다시 확인하세요.</p>
  <h3>0% 금리도 계산할 수 있나요?</h3>
  <p>가능합니다. 0% 금리에서는 남은 원금을 할부 개월 수로 나눈 값을 월 할부금으로 계산합니다.</p>
  <p>계산기는 JavaScript 환경에서 동작합니다. 비용 항목을 더 자세히 확인하려면 <a href="/magazine">자동차 매거진</a>을 함께 참고하세요.</p>`,
    },
  };

  const page = pages[path];
  if (!page) return null;
  const canonical = `${BASE}${path}`;
  const calculatorJsonLd = path === "/calculator" ? [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "자동차 유지비 계산기",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: canonical,
      offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: BASE },
        { "@type": "ListItem", position: 2, name: "유지비 계산기", item: canonical },
      ],
    },
  ] : undefined;
  const head = renderHead({
    title: page.title,
    description: page.description,
    canonical,
    jsonLd: calculatorJsonLd,
  });
  return htmlDocument(head, `<section>\n  ${page.body}\n</section>`);
}

// ---------- 메인 핸들러 ----------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url!, `https://${req.headers.host}`);
  // middleware가 원본 경로를 ?p= 로 전달(/api/ssr로 rewrite되므로 pathname은 못 씀)
  const rawPath = url.searchParams.get("p") || url.pathname;
  const path = rawPath.replace(/\/+$/, "") || "/";
  const searchQuery = normalizeMagazineSearchQuery(url.searchParams.get("q"));
  const page = normalizeMagazinePage(url.searchParams.get("page"));

  try {
    let html: string | null = null;

    if (path === "/") {
      html = await renderHome();
    } else if (path === "/magazine") {
      html = await renderMagazineList(searchQuery, page);
      setPublicCache(res, CACHE_CONTROL.POSTS_LIST);
    } else if (path.startsWith("/magazine/")) {
      const slug = safeDecode(path.slice("/magazine/".length));
      html = await renderArticle(slug);
      if (html) setPublicCache(res, CACHE_CONTROL.POST_DETAIL);
    } else {
      html = renderStaticPage(path);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    if (!html) {
      // 글/페이지 없음 → 404 (soft 404 방지)
      const head = renderHead({
        title: "페이지를 찾을 수 없습니다 | 카테인",
        description: "요청하신 페이지를 찾을 수 없습니다.",
        canonical: `${BASE}${path}`,
        robots: "noindex, nofollow",
      });
      const body = `<section>
  <h1>페이지를 찾을 수 없습니다</h1>
  <p>요청하신 글이 존재하지 않거나 삭제되었을 수 있습니다.</p>
  <p><a href="/magazine">매거진 목록으로 돌아가기</a></p>
</section>`;
      return res.status(404).send(htmlDocument(head, body));
    }

    return res.status(200).send(html);
  } catch (e) {
    console.error("[SSR]", e);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res
      .status(500)
      .send(
        "<!doctype html><html lang=ko><head><meta charset=utf-8><title>오류</title></head><body><h1>일시적인 오류가 발생했습니다</h1></body></html>",
      );
  }
}
