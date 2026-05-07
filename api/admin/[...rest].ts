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

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('[API/admin]', e);
    return res.status(500).json({ error: String(e) });
  }
}
