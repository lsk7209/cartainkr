import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { getDb } from "./_lib/turso.js";
import { requireAdmin, setCors } from "./_lib/auth.js";
import { parseArticleSlug } from "./_lib/contentSafety.js";

const DEFAULT_POST_LIMIT = 100;
const MAX_POST_LIMIT = 500;

type CountRow = { cnt: number | string };

const normalizeContentHtml = (value: unknown) => {
  if (typeof value !== "string") return null;
  const content = value.trim();
  if (!content || content === "[object Object]") return null;
  return value;
};

const hasEncodingCorruption = (...values: Array<string | null | undefined>) =>
  values.some((value) => typeof value === "string" && value.includes("\uFFFD"));

const encodingCorruptionResponse = (res: VercelResponse) =>
  res.status(400).json({
    error:
      "Post contains replacement characters and was rejected to prevent mojibake from being published.",
  });

type SettingRow = { key: string; value: string };
type SlugRow = { slug: string };
type PostIdentityRow = { id: string; slug: string; title: string };
type UpdatePostBody = {
  id?: string;
  slug?: string;
  title?: string;
  content_html?: unknown;
  excerpt?: string;
  thumbnail_url?: string;
};

function parseBoundedInt(value: string | null, fallback: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(0, parsed));
}

function asRow<T>(row: unknown) {
  return row as T;
}

function asRows<T>(rows: unknown) {
  return rows as T[];
}

function parseUpdatePostBody(body: unknown): UpdatePostBody | null {
  if (body && typeof body === "object") return body as UpdatePostBody;
  if (typeof body !== "string") return null;

  try {
    const parsed = JSON.parse(body) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as UpdatePostBody) : null;
  } catch {
    return null;
  }
}

const stableQueueItemId = (titles: string[], index: number) => {
  const hex = createHash("sha256")
    .update(JSON.stringify(titles))
    .update(`:${index}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

// 정적 파일명(api/admin.ts)으로 두고, 하위 경로는 vercel.json rewrites가
// `?__r=<route>` (queue item은 `?__r=queue-item&__id=`) 쿼리로 넘겨준다.
// (Vercel은 rewrites 정의 시 동적 catch-all 함수의 자동 라우트를 만들지 않음)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!requireAdmin(req))
    return res.status(401).json({ error: "Unauthorized" });

  const url = new URL(req.url!, `http://${req.headers.host}`);

  // 라우트 복원
  const r = url.searchParams.get("__r");
  let path = url.pathname.replace(/\/$/, "");
  if (r === "queue-item")
    path = `/api/admin/queue/${url.searchParams.get("__id") ?? ""}`;
  else if (r) path = `/api/admin/${r}`;

  try {
    if (path === "/api/admin/stats" && req.method === "GET") {
      const db = getDb();
      const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const [total, weekly, pending, completed] = await Promise.all([
        db.execute("SELECT COUNT(*) as cnt FROM posts"),
        db.execute({
          sql: "SELECT COUNT(*) as cnt FROM posts WHERE published_at >= ?",
          args: [weekAgo],
        }),
        db.execute(
          "SELECT COUNT(*) as cnt FROM post_queue WHERE status = 'pending'",
        ),
        db.execute(
          "SELECT COUNT(*) as cnt FROM post_queue WHERE status = 'completed'",
        ),
      ]);
      return res.json({
        totalPosts: Number(asRow<CountRow>(total.rows[0]).cnt),
        thisWeekPosts: Number(asRow<CountRow>(weekly.rows[0]).cnt),
        pendingQueue: Number(asRow<CountRow>(pending.rows[0]).cnt),
        completedQueue: Number(asRow<CountRow>(completed.rows[0]).cnt),
      });
    }

    if (path === "/api/admin/posts" && req.method === "GET") {
      const db = getDb();
      const thumbnailFilter = url.searchParams.get("thumbnail");
      const limit = parseBoundedInt(
        url.searchParams.get("limit"),
        DEFAULT_POST_LIMIT,
        MAX_POST_LIMIT,
      );
      const offset = parseBoundedInt(
        url.searchParams.get("offset"),
        0,
        Number.MAX_SAFE_INTEGER,
      );
      const where =
        thumbnailFilter === "missing"
          ? "WHERE thumbnail_url IS NULL OR TRIM(thumbnail_url) = ''"
          : "";
      const rows = await db.execute({
        sql: `SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
        args: [limit, offset],
      });
      return res.json(rows.rows);
    }

    if (path === "/api/admin/queue" && req.method === "GET") {
      const db = getDb();
      const rows = await db.execute(
        "SELECT * FROM post_queue ORDER BY created_at DESC",
      );
      return res.json(rows.rows);
    }

    if (path === "/api/admin/queue" && req.method === "POST") {
      const body = req.body as { items?: unknown } | null;
      if (!Array.isArray(body?.items) || body.items.length === 0 || body.items.length > MAX_POST_LIMIT) {
        return res.status(400).json({ error: `items must contain 1-${MAX_POST_LIMIT} entries` });
      }
      const titles = body.items.map((item) =>
        item && typeof item === "object" && "title" in item && typeof item.title === "string"
          ? item.title.trim()
          : "",
      );
      if (titles.some((title) => !title || title.length > 200)) {
        return res.status(400).json({ error: "Every queue title must contain 1-200 characters" });
      }
      const db = getDb();
      const createdAt = new Date().toISOString();
      const results = await db.batch(
        titles.map((title, index) => ({
          sql: "INSERT INTO post_queue (id, title, status, created_at) VALUES (?, ?, 'pending', ?) ON CONFLICT(id) DO NOTHING",
          args: [stableQueueItemId(titles, index), title, createdAt],
        })),
        "write",
      );
      const count = results.reduce((sum, result) => sum + result.rowsAffected, 0);
      return res.json({ success: true, count, duplicates: titles.length - count });
    }

    if (path === "/api/admin/update-post" && req.method === "POST") {
      const body = parseUpdatePostBody(req.body);
      if (!body?.id?.trim()) {
        return res.status(400).json({ error: "A post id is required" });
      }

      const { id, slug, title, content_html, excerpt, thumbnail_url } = body;
      const safeSlug = slug === undefined ? null : parseArticleSlug(slug);
      if (slug !== undefined && !safeSlug) {
        return res.status(400).json({ error: "Invalid slug" });
      }
      const normalizedContent =
        content_html === undefined ? null : normalizeContentHtml(content_html);
      if (content_html !== undefined && !normalizedContent) {
        return res.status(400).json({ error: "Invalid content_html" });
      }
      if (hasEncodingCorruption(title, excerpt, normalizedContent)) {
        return encodingCorruptionResponse(res);
      }
      const db = getDb();
      const now = new Date().toISOString();
      const result = await db.execute({
        sql: `UPDATE posts SET slug = COALESCE(?, slug), title = COALESCE(?, title), content_html = COALESCE(?, content_html), excerpt = COALESCE(?, excerpt), thumbnail_url = COALESCE(?, thumbnail_url), updated_at = ? WHERE id = ?`,
        args: [
          safeSlug?.decoded ?? null,
          title ?? null,
          normalizedContent,
          excerpt ?? null,
          thumbnail_url ?? null,
          now,
          id,
        ],
      });
      if (result.rowsAffected !== 1) {
        return res.status(404).json({ error: "Post not found" });
      }
      return res.json({ success: true, updatedAt: now });
    }

    const queueItemMatch = path.match(/^\/api\/admin\/queue\/([^/]+)$/);
    if (queueItemMatch) {
      const id = queueItemMatch[1];
      if (req.method === "PATCH") {
        const { status } = req.body as { status: string };
        const db = getDb();
        await db.execute({
          sql: "UPDATE post_queue SET status = ? WHERE id = ?",
          args: [status, id],
        });
        return res.json({ success: true });
      }
      if (req.method === "DELETE") {
        const db = getDb();
        await db.execute({
          sql: "DELETE FROM post_queue WHERE id = ?",
          args: [id],
        });
        return res.json({ success: true });
      }
    }

    if (path === "/api/admin/posts" && req.method === "POST") {
      const {
        id,
        slug,
        title,
        content_html,
        excerpt,
        thumbnail_url,
        published_at,
      } = req.body as {
        id: string;
        slug: string;
        title: string;
        content_html: unknown;
        excerpt: string;
        thumbnail_url: string | null;
        published_at: string;
      };
      if (
        typeof id !== "string" ||
        !id.trim() ||
        typeof slug !== "string" ||
        typeof title !== "string" ||
        !title.trim()
      ) {
        return res.status(400).json({ error: "id, slug, and title are required" });
      }
      const normalizedContent = normalizeContentHtml(content_html);
      if (!normalizedContent) {
        return res.status(400).json({ error: "Invalid content_html" });
      }
      if (hasEncodingCorruption(title, excerpt, normalizedContent)) {
        return encodingCorruptionResponse(res);
      }
      const safeSlug = parseArticleSlug(slug);
      if (!safeSlug) {
        return res.status(400).json({ error: "Invalid slug" });
      }
      const db = getDb();
      const now = published_at || new Date().toISOString();
      const { queue_id } = req.body as { queue_id?: string };
      const insertSql = queue_id
        ? "INSERT INTO posts (id, slug, title, content_html, excerpt, thumbnail_url, published_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM post_queue WHERE id = ?) ON CONFLICT(id) DO NOTHING"
        : "INSERT INTO posts (id, slug, title, content_html, excerpt, thumbnail_url, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING";
      const insertArgs = [
        id,
        safeSlug.decoded,
        title,
        normalizedContent,
        excerpt,
        thumbnail_url ?? null,
        now,
        now,
        ...(queue_id ? [queue_id] : []),
      ];
      const statements = [
        { sql: insertSql, args: insertArgs },
        ...(queue_id
          ? [{
              sql: "UPDATE post_queue SET status = 'completed' WHERE id = ? AND EXISTS (SELECT 1 FROM posts WHERE id = ? AND slug = ? AND title = ?)",
              args: [queue_id, id, safeSlug.decoded, title],
            }]
          : []),
        {
          sql: "SELECT id, slug, title FROM posts WHERE id = ? LIMIT 1",
          args: [id],
        },
      ];
      const results = await db.batch(statements, "write");
      const identityResult = results.at(-1);
      const identity = identityResult?.rows[0] as unknown as PostIdentityRow | undefined;
      if (!identity) {
        return res.status(queue_id ? 404 : 409).json({
          error: queue_id ? "Queue item not found" : "Post could not be created",
        });
      }
      if (identity.slug !== safeSlug.decoded || identity.title !== title) {
        return res.status(409).json({ error: "Post id already belongs to different content" });
      }
      if (queue_id && results[1]?.rowsAffected !== 1) {
        return res.status(409).json({ error: "Queue item could not be completed" });
      }
      return res.json({ success: true, slug: safeSlug.decoded });
    }

    if (path === "/api/admin/settings" && req.method === "GET") {
      const db = getDb();
      const rows = await db.execute("SELECT key, value FROM settings");
      const out: Record<string, string> = {};
      for (const row of asRows<SettingRow>(rows.rows)) out[row.key] = row.value;
      return res.json(out);
    }

    if (path === "/api/admin/settings" && req.method === "POST") {
      const { key, value } = req.body as { key: string; value: string };
      const db = getDb();
      await db.execute({
        sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [key, value],
      });
      return res.json({ success: true });
    }

    // IndexNow: ping Bing/Yandex/Seznam with all post URLs
    if (path === "/api/admin/indexnow" && req.method === "POST") {
      const INDEXNOW_KEY = "7f4e2b9d1a8c3f6e0d5b4a2c7e9f1d3b";
      const BASE = "https://cartain.kr";
      const db = getDb();
      const rows = await db.execute(
        "SELECT slug FROM posts ORDER BY published_at DESC LIMIT 500",
      );
      const urlList = asRows<SlugRow>(rows.rows).map(
        (r) => `${BASE}/magazine/${r.slug}`,
      );
      urlList.unshift(
        BASE,
        `${BASE}/magazine`,
        `${BASE}/calculator`,
        `${BASE}/about`,
        `${BASE}/contact`,
        `${BASE}/privacy`,
        `${BASE}/terms`,
      );

      const payload = {
        host: "cartain.kr",
        key: INDEXNOW_KEY,
        keyLocation: `${BASE}/${INDEXNOW_KEY}.txt`,
        urlList,
      };

      const response = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });

      return res.json({
        success: response.ok,
        status: response.status,
        count: urlList.length,
      });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (e) {
    console.error("[API/admin]", e);
    return res.status(500).json({ error: String(e) });
  }
}
