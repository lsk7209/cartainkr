import { describe, expect, it } from "vitest";
import {
  escapeAttribute,
  parseArticleSlug,
  replaceCapturedValue,
  resolveArticleOutputDirectory,
  sanitizeArticleHtml,
  toSafeAbsoluteHttpUrl,
  toSafeSiteOrigin,
} from "./contentSafety";

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
