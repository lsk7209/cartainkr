import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_lib/turso.js";
import { CACHE_CONTROL, setPublicCache } from "./_lib/cache.js";

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
const GA_ID = "G-N7JJFW6007";
const ADSENSE_CLIENT = "ca-pub-3050601904412736";

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

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttr = (s: string): string => escapeHtml(s).replace(/\n/g, " ");

// 본문 마크다운 굵게/기울임 → HTML (클라이언트 markdownToHtml과 동일 규칙)
const markdownToHtml = (html: string): string =>
  html
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

// 자체 콘텐츠지만 방어적으로 실행 가능 요소만 제거
const stripUnsafe = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "");

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

interface HeadOptions {
  title: string;
  description: string;
  canonical: string;
  ogType?: "website" | "article";
  ogImage?: string | null;
  publishedAt?: string;
  modifiedAt?: string;
  jsonLd?: object[];
}

function renderHead(o: HeadOptions): string {
  const desc = o.description.slice(0, 160);
  const ogImage = o.ogImage || `${BASE}/og-image.png`;
  const jsonLdTags = (o.jsonLd ?? [])
    .map(
      (d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`,
    )
    .join("\n    ");
  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(o.title)}</title>
    <meta name="description" content="${escapeAttr(desc)}" />
    <meta name="author" content="${SITE_NAME}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
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
    <link rel="alternate" type="application/rss+xml" title="카테인 RSS" href="${BASE}/rss.xml" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
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
  // DB는 raw 한글 slug로 저장됨. 디코딩/인코딩 형태가 섞여 들어와도 매칭되도록 두 형태 모두 조회.
  let encodedVariant = slug;
  try {
    encodedVariant = encodeURIComponent(slug);
  } catch {
    /* slug 그대로 사용 */
  }
  const rows = await db.execute({
    sql: "SELECT * FROM posts WHERE slug IN (?, ?) AND datetime(published_at) <= datetime('now') LIMIT 1",
    args: [slug, encodedVariant],
  });
  const post = rows.rows[0] as unknown as PostRow | undefined;
  if (!post) return null;

  const canonical = `${BASE}/magazine/${encodeURIComponent(post.slug)}`;
  const description = post.excerpt
    ? stripMarkdown(post.excerpt)
    : stripMarkdown(post.title);
  const bodyHtml = stripUnsafe(markdownToHtml(post.content_html || ""));

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    image: post.thumbnail_url || `${BASE}/og-image.png`,
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
    title: `${post.title} - 자동차 정보 | 카테인`,
    description,
    canonical,
    ogType: "article",
    ogImage: post.thumbnail_url,
    publishedAt: post.published_at,
    modifiedAt: post.updated_at || post.published_at,
    jsonLd: [articleSchema, breadcrumbSchema],
  });

  const thumb = post.thumbnail_url
    ? `<img src="${escapeAttr(post.thumbnail_url)}" alt="${escapeAttr(post.title)}" style="width:100%;border-radius:12px;margin-bottom:24px;" />`
    : "";

  const body = `<article>
  <nav aria-label="브레드크럼" style="font-size:13px;color:#6b7280;margin-bottom:12px;">
    <a href="/">홈</a> › <a href="/magazine">매거진</a>
  </nav>
  <h1 style="font-size:2rem;font-weight:800;margin-bottom:12px;">${escapeHtml(post.title)}</h1>
  <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
    <span>글쓴이 <a href="/about">카테인 에디터</a></span> ·
    <time datetime="${escapeAttr(post.published_at)}">${formatDate(post.published_at)}</time>
  </p>
  ${thumb}
  <div class="magazine-body">${bodyHtml}</div>
  <nav aria-label="관련 콘텐츠" style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;">
    <h2 style="font-size:1rem;">함께 읽으면 좋은 콘텐츠</h2>
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
    const url = `/magazine/${encodeURIComponent(p.slug)}`;
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
    "SELECT title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE datetime(published_at) <= datetime('now') ORDER BY published_at DESC LIMIT 12",
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

async function renderMagazineList(): Promise<string> {
  const db = getDb();
  const rows = await db.execute(
    "SELECT title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE datetime(published_at) <= datetime('now') ORDER BY published_at DESC LIMIT 100",
  );
  const posts = rows.rows as unknown as SummaryRow[];
  const head = renderHead({
    title: "자동차 매거진 | 카테인",
    description:
      "자동차 구매, 유지비, 보험, 세금, 전기차 정보를 한곳에서 확인하세요. 카테인 매거진의 최신 자동차 정보 모음입니다.",
    canonical: `${BASE}/magazine`,
  });
  const body = `<section>
  <h1 style="font-size:2rem;font-weight:800;">자동차 매거진</h1>
  <p style="color:#374151;margin:12px 0 24px;">자동차 구매·유지비·보험·세금·전기차 정보를 한곳에서 확인하세요.</p>
  ${renderPostListItems(posts)}
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
  <p>카테인은 광고나 협찬이 아닌, 실제 소비자 관점에서 도움이 되는 정보를 우선합니다. 모든 글은 공개된 공식 자료와 최신 제도를 바탕으로 작성하며, 제도 변경 시 업데이트합니다.</p>
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
  <p>본 사이트는 Google AdSense를 통한 광고를 게재합니다. Google과 같은 제3자 공급업체는 쿠키(DoubleClick DART 쿠키 포함)를 사용하여 이용자의 본 사이트 및 다른 사이트 방문 기록을 바탕으로 맞춤형 광고를 제공합니다.</p>
  <ul>
    <li>이용자는 <a href="https://policies.google.com/technologies/ads" rel="noopener noreferrer" target="_blank">Google 광고 설정</a>에서 맞춤 광고를 비활성화할 수 있습니다.</li>
    <li>브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 일부 기능 이용에 제한이 있을 수 있습니다.</li>
  </ul>
  <h2>3. 웹 분석 도구</h2>
  <p>사이트는 서비스 개선을 위해 Google Analytics를 사용합니다. 수집된 정보는 통계 분석 목적으로만 이용되며 개인을 식별하지 않습니다.</p>
  <h2>4. 보유 및 이용 기간</h2>
  <p>자동 수집된 정보는 분석 목적 달성 후 지체 없이 파기하거나 관련 법령이 정한 기간 동안 보관합니다.</p>
  <h2>5. 문의</h2>
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
      title: "자동차 유지비 계산기 | 카테인",
      description:
        "차량 가격, 연비, 보험료, 자동차세를 입력해 월 자동차 유지비를 계산해 보세요.",
      body: `<h1>자동차 유지비 계산기</h1>
  <p>차량 가격, 연비, 주행거리, 보험료, 자동차세 등을 입력하면 예상 월 유지비를 계산할 수 있는 도구입니다.</p>
  <h2>계산에 포함되는 항목</h2>
  <ul>
    <li>연료비 — 월 주행거리와 연비, 유가 기준</li>
    <li>자동차세 — 배기량 기준 연세액의 월 환산</li>
    <li>보험료 — 연 보험료의 월 환산</li>
    <li>정비·소모품 — 평균 유지 비용</li>
  </ul>
  <p>계산기는 JavaScript 환경에서 동작합니다. 자동차 유지비에 관한 자세한 정보는 <a href="/magazine">매거진</a>에서 확인하세요.</p>`,
    },
  };

  const page = pages[path];
  if (!page) return null;
  const canonical = `${BASE}${path}`;
  const head = renderHead({
    title: page.title,
    description: page.description,
    canonical,
  });
  return htmlDocument(head, `<section>\n  ${page.body}\n</section>`);
}

// ---------- 메인 핸들러 ----------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url!, `https://${req.headers.host}`);
  // middleware가 원본 경로를 ?p= 로 전달(/api/ssr로 rewrite되므로 pathname은 못 씀)
  const rawPath = url.searchParams.get("p") || url.pathname;
  const path = rawPath.replace(/\/+$/, "") || "/";

  try {
    let html: string | null = null;

    if (path === "/") {
      html = await renderHome();
    } else if (path === "/magazine") {
      html = await renderMagazineList();
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
