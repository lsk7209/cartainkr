import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  execute: vi.fn(),
  setPublicCache: vi.fn(),
}));

vi.mock("./_lib/turso.js", () => ({
  getDb: () => ({ execute: dbMocks.execute }),
  POSTS_PER_PAGE: 12,
}));

vi.mock("./_lib/cache.js", () => ({
  CACHE_CONTROL: { POSTS_LIST: "list", POST_DETAIL: "detail" },
  setPublicCache: dbMocks.setPublicCache,
}));

import handler from "./ssr";

function createResponse() {
  const state = {
    statusCode: 0,
    body: "",
    headers: new Map<string, string>(),
  };
  const response = {
    setHeader(name: string, value: string) {
      state.headers.set(name, value);
      return response;
    },
    status(code: number) {
      state.statusCode = code;
      return response;
    },
    send(body: string) {
      state.body = body;
      return response;
    },
  };
  return { response, state };
}

async function render(path: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams({ p: path, ...params });
  const request = {
    method: "GET",
    url: `/api/ssr?${search.toString()}`,
    headers: { host: "cartain.kr" },
  } as unknown as Parameters<typeof handler>[0];
  const { response, state } = createResponse();
  await handler(request, response as unknown as Parameters<typeof handler>[1]);
  return state;
}

beforeEach(() => {
  dbMocks.execute.mockReset();
  dbMocks.setPublicCache.mockReset();
  dbMocks.execute.mockResolvedValue({ rows: [] });
});

describe("crawler SSR", () => {
  it("renders search results with noindex and a stable magazine canonical", async () => {
    const state = await render("/magazine", { q: "</title><script>alert(1)</script>", page: "999" });

    expect(state.statusCode).toBe(200);
    expect(state.body).toContain('name="robots" content="noindex, follow"');
    expect(state.body).toContain('rel="canonical" href="https://cartain.kr/magazine"');
    expect(state.body).not.toContain("<script>alert(1)</script>");
    expect(state.body).toContain("&lt;/title&gt;");
  });

  it("sanitizes malicious stored article fields in the actual handler", async () => {
    dbMocks.execute.mockResolvedValue({
      rows: [{
        id: "post-1",
        title: "</title><script>alert(1)</script>",
        slug: "safe-article",
        excerpt: "An & unsafe excerpt",
        content_html: '<h1>Nested</h1><script>alert(2)</script><p><img src="javascript:alert(3)" onerror="alert(4)">Body</p>',
        thumbnail_url: "javascript:alert(5)",
        published_at: "2026-08-28T00:00:00.000Z",
        updated_at: null,
      }],
    });

    const state = await render("/magazine/safe-article");

    expect(state.statusCode).toBe(200);
    expect(state.body).toContain('rel="canonical" href="https://cartain.kr/magazine/safe-article"');
    expect(state.body.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(state.body).not.toContain("<script>alert");
    expect(state.body).not.toContain("javascript:");
    expect(state.body).not.toContain("onerror");
    expect(state.body).toContain("<h2>Nested</h2>");
  });

  it("renders calculator metadata without querying the article database", async () => {
    const state = await render("/calculator");

    expect(state.statusCode).toBe(200);
    expect(state.body).toContain('rel="canonical" href="https://cartain.kr/calculator"');
    expect(state.body.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(dbMocks.execute).not.toHaveBeenCalled();
  });

  it("returns a noindex 404 for invalid article slugs and missing routes", async () => {
    const invalidArticle = await render("/magazine/../secret");
    expect(invalidArticle.statusCode).toBe(404);
    expect(invalidArticle.body).toContain('name="robots" content="noindex, nofollow"');
    expect(dbMocks.execute).not.toHaveBeenCalled();

    const missingPage = await render("/missing-page");
    expect(missingPage.statusCode).toBe(404);
    expect(missingPage.body).toContain('name="robots" content="noindex, nofollow"');
  });
});
