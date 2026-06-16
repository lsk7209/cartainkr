import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, POSTS_PER_PAGE } from "./_lib/turso.js";
import { setCors } from "./_lib/auth.js";
import { CACHE_CONTROL, setPublicCache } from "./_lib/cache.js";

type CountRow = { cnt: string | number };

// Vercel은 vercel.json에 rewrites가 정의되면 동적 catch-all 함수(`[...slug]`)의
// 자동 라우트를 생성하지 않아 /api/posts/* 가 전부 404가 된다. 그래서 이 함수는
// 정적 파일명(api/posts.ts)으로 두고, 하위 경로는 vercel.json rewrites가
// `?__r=<route>` 쿼리로 넘겨준다(원본 req.url 보존 여부에 의존하지 않음).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const url = new URL(req.url!, `http://${req.headers.host}`);

  // 라우트 복원: rewrites가 넘긴 __r 기준으로 path를 재구성한다.
  const r = url.searchParams.get("__r");
  let path = url.pathname.replace(/\/$/, "");
  if (r === "count") path = "/api/posts/count";
  else if (r === "latest") path = "/api/posts/latest";
  else if (r === "search") path = "/api/posts/search";
  else if (r === "related") path = "/api/posts/related";
  else if (r === "detail")
    path = `/api/posts/${url.searchParams.get("__slug") ?? ""}`;

  try {
    // GET /api/posts (paginated list)
    if (path === "/api/posts" && req.method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
      const offset = (page - 1) * POSTS_PER_PAGE;
      const db = getDb();
      const [rows, countRow] = await Promise.all([
        db.execute({
          sql: "SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE datetime(published_at) <= datetime('now') ORDER BY published_at DESC LIMIT ? OFFSET ?",
          args: [POSTS_PER_PAGE, offset],
        }),
        db.execute(
          "SELECT COUNT(*) as cnt FROM posts WHERE datetime(published_at) <= datetime('now')",
        ),
      ]);
      setPublicCache(res, CACHE_CONTROL.POSTS_LIST);
      return res.json({
        posts: rows.rows,
        totalCount: Number((countRow.rows[0] as unknown as CountRow).cnt),
      });
    }

    if (path === "/api/posts/count" && req.method === "GET") {
      const db = getDb();
      const row = await db.execute(
        "SELECT COUNT(*) as cnt FROM posts WHERE datetime(published_at) <= datetime('now')",
      );
      setPublicCache(res, CACHE_CONTROL.POSTS_LIST);
      return res.json({
        count: Number((row.rows[0] as unknown as CountRow).cnt),
      });
    }

    if (path === "/api/posts/latest" && req.method === "GET") {
      const limit = Math.min(
        50,
        parseInt(url.searchParams.get("limit") ?? "6"),
      );
      const db = getDb();
      const rows = await db.execute({
        sql: "SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE datetime(published_at) <= datetime('now') ORDER BY published_at DESC LIMIT ?",
        args: [limit],
      });
      setPublicCache(res, CACHE_CONTROL.POSTS_LIST);
      return res.json(rows.rows);
    }

    if (path === "/api/posts/search" && req.method === "GET") {
      const q = url.searchParams.get("q") ?? "";
      if (q.length < 2) return res.json([]);
      const db = getDb();
      const rows = await db.execute({
        sql: "SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE datetime(published_at) <= datetime('now') AND (title LIKE ? OR excerpt LIKE ?) ORDER BY published_at DESC LIMIT 30",
        args: [`%${q}%`, `%${q}%`],
      });
      setPublicCache(res, CACHE_CONTROL.POSTS_LIST);
      return res.json(rows.rows);
    }

    if (path === "/api/posts/related" && req.method === "GET") {
      const postId = url.searchParams.get("postId") ?? "";
      const limit = Math.min(6, parseInt(url.searchParams.get("limit") ?? "3"));
      const db = getDb();
      const rows = await db.execute({
        sql: "SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE id != ? AND datetime(published_at) <= datetime('now') ORDER BY published_at DESC LIMIT ?",
        args: [postId, limit],
      });
      setPublicCache(res, CACHE_CONTROL.POSTS_LIST);
      return res.json(rows.rows);
    }

    // GET /api/posts/:slug
    const slugMatch = path.match(/^\/api\/posts\/([^/]+)$/);
    if (slugMatch && req.method === "GET") {
      const slug = decodeURIComponent(slugMatch[1]);
      const db = getDb();
      const rows = await db.execute({
        sql: "SELECT * FROM posts WHERE slug = ? AND datetime(published_at) <= datetime('now') LIMIT 1",
        args: [slug],
      });
      if (!rows.rows[0]) return res.status(404).json({ error: "Not found" });
      setPublicCache(res, CACHE_CONTROL.POST_DETAIL);
      return res.json(rows.rows[0]);
    }

    return res.status(404).json({ error: "Not found" });
  } catch (e) {
    console.error("[API/posts]", e);
    return res.status(500).json({ error: String(e) });
  }
}
