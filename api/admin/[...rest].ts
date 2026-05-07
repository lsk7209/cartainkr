import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/turso.js';
import { requireAdmin, setCors } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, '');

  try {
    if (path === '/api/admin/stats' && req.method === 'GET') {
      const db = getDb();
      const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const [total, weekly, pending, completed] = await Promise.all([
        db.execute('SELECT COUNT(*) as cnt FROM posts'),
        db.execute({ sql: 'SELECT COUNT(*) as cnt FROM posts WHERE published_at >= ?', args: [weekAgo] }),
        db.execute("SELECT COUNT(*) as cnt FROM post_queue WHERE status = 'pending'"),
        db.execute("SELECT COUNT(*) as cnt FROM post_queue WHERE status = 'completed'"),
      ]);
      return res.json({
        totalPosts: Number((total.rows[0] as any).cnt),
        thisWeekPosts: Number((weekly.rows[0] as any).cnt),
        pendingQueue: Number((pending.rows[0] as any).cnt),
        completedQueue: Number((completed.rows[0] as any).cnt),
      });
    }

    if (path === '/api/admin/posts' && req.method === 'GET') {
      const db = getDb();
      const rows = await db.execute('SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts ORDER BY published_at DESC LIMIT 100');
      return res.json(rows.rows);
    }

    if (path === '/api/admin/queue' && req.method === 'GET') {
      const db = getDb();
      const rows = await db.execute('SELECT * FROM post_queue ORDER BY created_at DESC');
      return res.json(rows.rows);
    }

    if (path === '/api/admin/queue' && req.method === 'POST') {
      const { items } = req.body as { items: Array<{ title: string }> };
      const db = getDb();
      for (const item of items) {
        await db.execute({
          sql: "INSERT INTO post_queue (id, title, status, created_at) VALUES (?, ?, 'pending', ?)",
          args: [crypto.randomUUID(), item.title, new Date().toISOString()],
        });
      }
      return res.json({ success: true, count: items.length });
    }

    if (path === '/api/admin/posts/update' && req.method === 'POST') {
      const { id, title, content_html, excerpt, thumbnail_url } = req.body as {
        id: string; title?: string; content_html?: string;
        excerpt?: string; thumbnail_url?: string;
      };
      const db = getDb();
      const now = new Date().toISOString();
      await db.execute({
        sql: `UPDATE posts SET title = COALESCE(?, title), content_html = COALESCE(?, content_html), excerpt = COALESCE(?, excerpt), thumbnail_url = COALESCE(?, thumbnail_url), updated_at = ? WHERE id = ?`,
        args: [title ?? null, content_html ?? null, excerpt ?? null, thumbnail_url ?? null, now, id],
      });
      return res.json({ success: true });
    }

    const queueItemMatch = path.match(/^\/api\/admin\/queue\/([^/]+)$/);
    if (queueItemMatch) {
      const id = queueItemMatch[1];
      if (req.method === 'PATCH') {
        const { status } = req.body as { status: string };
        const db = getDb();
        await db.execute({ sql: 'UPDATE post_queue SET status = ? WHERE id = ?', args: [status, id] });
        return res.json({ success: true });
      }
      if (req.method === 'DELETE') {
        const db = getDb();
        await db.execute({ sql: 'DELETE FROM post_queue WHERE id = ?', args: [id] });
        return res.json({ success: true });
      }
    }

    if (path === '/api/admin/posts' && req.method === 'POST') {
      const { id, slug, title, content_html, excerpt, thumbnail_url, published_at } = req.body as {
        id: string; slug: string; title: string; content_html: string;
        excerpt: string; thumbnail_url: string | null; published_at: string;
      };
      const db = getDb();
      const now = published_at || new Date().toISOString();
      await db.execute({
        sql: 'INSERT INTO posts (id, slug, title, content_html, excerpt, thumbnail_url, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [id, slug, title, content_html, excerpt, thumbnail_url ?? null, now, now],
      });
      // Mark queue item as completed if queue_id provided
      const { queue_id } = req.body as { queue_id?: string };
      if (queue_id) {
        await db.execute({ sql: "UPDATE post_queue SET status = 'completed' WHERE id = ?", args: [queue_id] });
      }
      return res.json({ success: true, slug });
    }

    if (path === '/api/admin/settings' && req.method === 'GET') {
      const db = getDb();
      const rows = await db.execute('SELECT key, value FROM settings');
      const out: Record<string, string> = {};
      for (const row of rows.rows as any[]) out[row.key] = row.value;
      return res.json(out);
    }

    if (path === '/api/admin/settings' && req.method === 'POST') {
      const { key, value } = req.body as { key: string; value: string };
      const db = getDb();
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        args: [key, value],
      });
      return res.json({ success: true });
    }

    // IndexNow: ping Bing/Yandex/Seznam with all post URLs
    if (path === '/api/admin/indexnow' && req.method === 'POST') {
      const INDEXNOW_KEY = '7f4e2b9d1a8c3f6e0d5b4a2c7e9f1d3b';
      const BASE = 'https://cartain.kr';
      const db = getDb();
      const rows = await db.execute('SELECT slug FROM posts ORDER BY published_at DESC LIMIT 500');
      const urlList = (rows.rows as any[]).map((r) => `${BASE}/magazine/${r.slug}`);
      urlList.unshift(BASE, `${BASE}/magazine`, `${BASE}/calculator`);

      const payload = {
        host: 'cartain.kr',
        key: INDEXNOW_KEY,
        keyLocation: `${BASE}/${INDEXNOW_KEY}.txt`,
        urlList,
      };

      const response = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });

      return res.json({ success: response.ok, status: response.status, count: urlList.length });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('[API/admin]', e);
    return res.status(500).json({ error: String(e) });
  }
}
