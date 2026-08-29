import { describe, expect, it } from "vitest";
import {
  escapeAttribute,
  hasEncodingCorruption,
  parseArticleSlug,
  PUBLIC_POST_INTEGRITY_SQL,
  replaceCapturedValue,
  resolveArticleOutputDirectory,
  sanitizeArticleHtml,
  toSafeAbsoluteHttpUrl,
  toSafeSiteOrigin,
} from "./contentSafety";

describe("public content integrity", () => {
  it("detects Unicode replacement characters without rejecting valid Korean", () => {
    expect(hasEncodingCorruption("정상 한국어 제목", "정상 본문")).toBe(false);
    expect(hasEncodingCorruption("깨진 \uFFFD 제목")).toBe(true);
  });

  it("keeps the public SQL gate aligned across title, excerpt, and body", () => {
    expect(PUBLIC_POST_INTEGRITY_SQL).toContain("title");
    expect(PUBLIC_POST_INTEGRITY_SQL).toContain("excerpt");
    expect(PUBLIC_POST_INTEGRITY_SQL).toContain("content_html");
    expect(PUBLIC_POST_INTEGRITY_SQL.match(/char\(65533\)/g)).toHaveLength(3);
  });
});

describe("sanitizeArticleHtml", () => {
  it("removes executable markup and unsafe URL protocols", () => {
    const input = [
      '<script>alert(1)</script>',
      '<svg onload="alert(2)"><a href="javascript:alert(3)">svg</a></svg>',
      '<a href=javascript:alert(4) onclick=alert(5)>bad</a>',
      '<iframe srcdoc="<script>alert(6)</script>"></iframe>',
      '<form><button formaction="javascript:alert(7)">submit</button></form>',
      '<img src="data:text/html,<script>alert(8)</script>" onerror="alert(9)">',
      '<a href="java&#x73;cript:alert(10)">encoded</a>',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(11)">',
    ].join("");

    const output = sanitizeArticleHtml(input);

    expect(output).not.toMatch(/<(?:script|svg|iframe|form|button|meta)\b/i);
    expect(output).not.toMatch(/\s(?:srcdoc|onerror|onclick)\s*=/i);
    expect(output).not.toMatch(/javascript:|data:text\/html/i);
  });

  it("blocks URL-attribute and raw-text parser bypass payloads", () => {
    const input = [
      '<form action="javascript:alert(1)"><button formaction="javascript:alert(2)">go</button></form>',
      '<object data="javascript:alert(3)"></object>',
      '<video poster="javascript:alert(4)"></video>',
      '<div background="javascript:alert(5)"></div>',
      '<a ping="javascript:alert(6)" href="https://cartain.kr">safe link</a>',
      '<svg><textarea><img src=x onerror=alert(7)></textarea></svg>',
      '<math><xmp><img src=x onerror=alert(8)></xmp></math>',
      '<textarea></textarea/><img src=x onerror=alert(9)>',
      '<xmp><script>alert(10)</script><img src=x onerror=alert(11)></xmp>',
      '<a href="java&#000000115;cript:alert(12)">decimal entity</a>',
      '<a href="java&#x00000073;cript:alert(13)">hex entity</a>',
      '<img srcset="javascript:alert(14) 1x" imagesrcset="javascript:alert(15) 1x">',
      '<svg><animate attributeName="href" values="#safe;javascript:alert(16)"></animate></svg>',
    ].join("");

    const output = sanitizeArticleHtml(input);

    expect(output).not.toMatch(
      /<(?:script|form|button|object|video|svg|math|textarea|xmp|animate)\b/i,
    );
    expect(output).not.toMatch(
      /\s(?:action|formaction|data|poster|background|ping|onerror|srcset|imagesrcset|attributeName|values)\s*=/i,
    );
    expect(output).not.toMatch(/javascript:/i);
  });

  it("keeps useful article markup while demoting nested h1", () => {
    const output = sanitizeArticleHtml(
      '<h1>중복 제목</h1><h2>본문</h2><p>설명</p><a href="/calculator">계산</a>',
    );

    expect(output).toContain("<h2>중복 제목</h2>");
    expect(output).toContain('<a href="/calculator">계산</a>');
    expect(output).not.toContain("<h1>");
  });
});

describe("article URL safety", () => {
  it("accepts normal Korean slugs and rejects path traversal", () => {
    expect(parseArticleSlug("중고차-구매-가이드")?.urlSegment).toBe(
      encodeURIComponent("중고차-구매-가이드"),
    );
    expect(parseArticleSlug("../outside")).toBeNull();
    expect(parseArticleSlug("%2e%2e")).toBeNull();
    expect(parseArticleSlug("safe%2Foutside")).toBeNull();
    expect(parseArticleSlug("safe\\outside")).toBeNull();
  });

  it("keeps generated article directories inside dist/magazine", () => {
    const result = resolveArticleOutputDirectory("C:/build/dist", "안전한-글");
    expect(result?.directory.replace(/\\/g, "/")).toContain(
      "/dist/magazine/",
    );
    expect(resolveArticleOutputDirectory("C:/build/dist", "../escape")).toBeNull();
  });

  it("allows only HTTP URLs without embedded credentials", () => {
    expect(toSafeAbsoluteHttpUrl("/image.png", "https://cartain.kr")).toBe(
      "https://cartain.kr/image.png",
    );
    expect(toSafeAbsoluteHttpUrl("javascript:alert(1)", "https://cartain.kr")).toBeNull();
    expect(toSafeAbsoluteHttpUrl("https://user:pass@example.com/a", "https://cartain.kr")).toBeNull();
    expect(toSafeSiteOrigin("https://cartain.kr")).toBe("https://cartain.kr");
    expect(toSafeSiteOrigin('https://cartain.kr/" onerror="x')).toBeNull();
    expect(toSafeSiteOrigin("javascript:alert(1)")).toBeNull();
  });

  it("escapes values used in HTML attributes", () => {
    expect(escapeAttribute('x" onerror="alert(1)')).toBe(
      "x&quot; onerror=&quot;alert(1)",
    );
  });

  it("inserts dollar signs as text rather than replacement tokens", () => {
    expect(
      replaceCapturedValue("<title>old</title>", /(<title>)[^<]*/, "$& 안전"),
    ).toBe("<title>$& 안전</title>");
  });
});
