import { beforeEach, describe, expect, it, vi } from "vitest";

const postMocks = vi.hoisted(() => ({
  execute: vi.fn(),
  setCors: vi.fn(),
  setPublicCache: vi.fn(),
}));

vi.mock("./_lib/turso.js", () => ({
  getDb: () => ({ execute: postMocks.execute }),
  POSTS_PER_PAGE: 12,
}));

vi.mock("./_lib/auth.js", () => ({
  setCors: postMocks.setCors,
}));

vi.mock("./_lib/cache.js", () => ({
  CACHE_CONTROL: { POSTS_LIST: "list", POST_DETAIL: "detail" },
  setPublicCache: postMocks.setPublicCache,
}));

import handler from "./posts";

function createResponse() {
  const state = { statusCode: 200, json: null as unknown };
  const response = {
    status(code: number) {
      state.statusCode = code;
      return response;
    },
    json(body: unknown) {
      state.json = body;
      return response;
    },
    end: () => response,
  };
  return { response, state };
}

async function requestDetail(slug: string) {
  const req = {
    method: "GET",
    url: `/api/posts?__r=detail&__slug=${slug}`,
    headers: { host: "cartain.kr" },
  } as unknown as Parameters<typeof handler>[0];
  const { response, state } = createResponse();
  await handler(req, response as unknown as Parameters<typeof handler>[1]);
  return state;
}

beforeEach(() => {
  postMocks.execute.mockReset();
  postMocks.setCors.mockReset();
  postMocks.setPublicCache.mockReset();
});

describe("public post integrity", () => {
  it("returns 404 when a corrupted row bypasses the SQL gate", async () => {
    postMocks.execute.mockResolvedValue({
      rows: [{
        title: "Broken \uFFFD title",
        excerpt: "Excerpt",
        content_html: "<p>Body</p>",
      }],
    });

    const state = await requestDetail("broken-article");

    expect(state).toEqual({
      statusCode: 404,
      json: { error: "Not found" },
    });
    expect(postMocks.setPublicCache).not.toHaveBeenCalled();
  });

  it("includes the replacement-character gate in public detail SQL", async () => {
    postMocks.execute.mockResolvedValue({ rows: [] });

    await requestDetail("safe-article");

    const statement = postMocks.execute.mock.calls[0]?.[0] as { sql: string };
    expect(statement.sql.match(/char\(65533\)/g)).toHaveLength(3);
  });
});
