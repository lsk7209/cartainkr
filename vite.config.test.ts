import { describe, expect, it } from "vitest";
import {
  renderPrerenderedArticle,
  type PrerenderPostRow,
} from "./vite.config";

const INDEX_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <title>기본 제목</title>
    <meta name="description" content="기본 설명" />
    <meta property="og:title" content="기본 제목" />
    <meta property="og:description" content="기본 설명" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://cartain.kr" />
    <meta property="og:image" content="https://cartain.kr/og-image.png" />
    <meta name="twitter:title" content="기본 제목" />
    <meta name="twitter:description" content="기본 설명" />
    <meta name="twitter:image" content="https://cartain.kr/og-image.png" />
    <link rel="canonical" href="https://cartain.kr" />
  </head>
  <body><div id="root"></div><noscript>fallback</noscript></body>
</html>`;

const baseRow: PrerenderPostRow = {
  slug: "safe-$&-article",
  title: '</title><script>alert(1)</script>$&',
  excerpt: '"><img src=x onerror=alert(2)>설명',
  thumbnail_url: "javascript:alert(3)",
  published_at: "2026-08-28T00:00:00.000Z",
  updated_at: null,
  content_html:
    '<h1>본문 제목</h1><p>안전한 본문</p><a href=javascript:alert(4)>bad</a><svg/onload=alert(5)>',
};

describe("renderPrerenderedArticle", () => {
  it("keeps untrusted article fields inside their HTML contexts", () => {
    const result = renderPrerenderedArticle(
      INDEX_HTML,
      baseRow,
      "https://cartain.kr",
    );

    expect(result).not.toBeNull();
    const html = result!.html;
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain("&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;$&amp;");
    expect(html).not.toMatch(/<script>alert|javascript:|<svg\b|\sonload\s*=/i);
    expect(html).toContain(
      '<link rel="canonical" href="https://cartain.kr/magazine/safe-%24%26-article" />',
    );
    expect(html).toContain('content="https://cartain.kr/og-image.png"');
    expect(html).toContain("<h2>본문 제목</h2>");
  });

  it("rejects unsafe site origins and article slugs", () => {
    expect(
      renderPrerenderedArticle(INDEX_HTML, { ...baseRow, slug: "../outside" }, "https://cartain.kr"),
    ).toBeNull();
    expect(
      renderPrerenderedArticle(INDEX_HTML, baseRow, 'https://cartain.kr/" onload="x'),
    ).toBeNull();
  });
});
