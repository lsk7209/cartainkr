import { beforeEach, describe, expect, it, vi } from "vitest";

const adminMocks = vi.hoisted(() => ({
  batch: vi.fn(),
  setCors: vi.fn(),
}));

vi.mock("./_lib/turso.js", () => ({
  getDb: () => ({ batch: adminMocks.batch }),
}));

vi.mock("./_lib/auth.js", () => ({
  requireAdmin: () => true,
  setCors: adminMocks.setCors,
}));

import handler from "./admin";

function createResponse() {
  const state = { statusCode: 200, json: null as unknown };
  const response = {
    setHeader: () => response,
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

async function request(route: string, body: unknown) {
  const req = {
    method: "POST",
    url: `/api/admin?__r=${route}`,
    headers: { host: "cartain.kr" },
    body,
  } as unknown as Parameters<typeof handler>[0];
  const { response, state } = createResponse();
  await handler(req, response as unknown as Parameters<typeof handler>[1]);
  return state;
}

beforeEach(() => {
  adminMocks.batch.mockReset();
  adminMocks.setCors.mockReset();
});

describe("admin write integrity", () => {
  it("creates a queue in one atomic, retry-stable batch", async () => {
    adminMocks.batch.mockResolvedValueOnce([{ rowsAffected: 1 }, { rowsAffected: 1 }]);
    const body = { items: [{ title: "First" }, { title: "Second" }] };
    const first = await request("queue", body);
    const firstStatements = adminMocks.batch.mock.calls[0]?.[0];

    adminMocks.batch.mockResolvedValueOnce([{ rowsAffected: 0 }, { rowsAffected: 0 }]);
    const retry = await request("queue", body);
    const retryStatements = adminMocks.batch.mock.calls[1]?.[0];

    expect(first).toEqual({ statusCode: 200, json: { success: true, count: 2, duplicates: 0 } });
    expect(retry).toEqual({ statusCode: 200, json: { success: true, count: 0, duplicates: 2 } });
    expect(adminMocks.batch).toHaveBeenNthCalledWith(1, expect.any(Array), "write");
    expect(firstStatements.map((statement: { args: unknown[] }) => statement.args[0])).toEqual(
      retryStatements.map((statement: { args: unknown[] }) => statement.args[0]),
    );
  });

  it("rejects malformed queue batches before touching the database", async () => {
    const state = await request("queue", { items: [{ title: "" }] });

    expect(state.statusCode).toBe(400);
    expect(adminMocks.batch).not.toHaveBeenCalled();
  });

  it("rejects corrupted queue titles before touching the database", async () => {
    const state = await request("queue", {
      items: [{ title: "Broken \uFFFD title" }],
    });

    expect(state.statusCode).toBe(400);
    expect(state.json).toEqual({
      error:
        "Content contains replacement characters and was rejected to prevent mojibake from being published.",
    });
    expect(adminMocks.batch).not.toHaveBeenCalled();
  });

  it("creates a post and completes its queue item in one write batch", async () => {
    adminMocks.batch.mockResolvedValue([
      { rowsAffected: 1, rows: [] },
      { rowsAffected: 1, rows: [] },
      { rowsAffected: 0, rows: [{ id: "post-1", slug: "safe-slug", title: "Safe title" }] },
    ]);

    const state = await request("posts", {
      id: "post-1",
      slug: "safe-slug",
      title: "Safe title",
      content_html: "<p>Body</p>",
      excerpt: "Excerpt",
      thumbnail_url: null,
      published_at: "2026-08-28T00:00:00.000Z",
      queue_id: "queue-1",
    });

    expect(state).toEqual({ statusCode: 200, json: { success: true, slug: "safe-slug" } });
    expect(adminMocks.batch).toHaveBeenCalledWith(expect.any(Array), "write");
    expect(adminMocks.batch.mock.calls[0]?.[0]).toHaveLength(3);
  });

  it("does not accept an idempotency collision as the requested post", async () => {
    adminMocks.batch.mockResolvedValue([
      { rowsAffected: 0, rows: [] },
      { rowsAffected: 0, rows: [] },
      { rowsAffected: 0, rows: [{ id: "post-1", slug: "other-slug", title: "Other title" }] },
    ]);

    const state = await request("posts", {
      id: "post-1",
      slug: "safe-slug",
      title: "Safe title",
      content_html: "<p>Body</p>",
      excerpt: "Excerpt",
      thumbnail_url: null,
      published_at: "2026-08-28T00:00:00.000Z",
      queue_id: "queue-1",
    });

    expect(state.statusCode).toBe(409);
  });

  it("rejects corrupted post fields before touching the database", async () => {
    const state = await request("posts", {
      id: "post-corrupt",
      slug: "broken-post",
      title: "Safe title",
      content_html: "<p>Broken \uFFFD body</p>",
      excerpt: "Excerpt",
      thumbnail_url: null,
      published_at: "2026-08-28T00:00:00.000Z",
    });

    expect(state.statusCode).toBe(400);
    expect(adminMocks.batch).not.toHaveBeenCalled();
  });
});
