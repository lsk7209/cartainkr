import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, POSTS_PER_PAGE } from '../_lib/turso.js';
import { setCors } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, '');

  try {
    if (path === '/api/posts/count' && req.method === 'GET') {
      const db = getDb();
      const row = await db.execute('SELECT COUNT(*) as cnt FROM posts');
      return res.json({ count: Number((row.rows[0] as any).cnt) });
    }

    if (path === '/api/posts/latest' && req.method === 'GET') {
      const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '6'));
      const db = getDb();
      const rows = await db.execute({
        sql: 'SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts ORDER BY published_at DESC LIMIT ?',
        args: [limit],
      });
      return res.json(rows.rows);
    }

    if (path === '/api/posts/search' && req.method === 'GET') {
      const q = url.searchParams.get('q') ?? '';
      if (q.length < 2) return res.json([]);
      const db = getDb();
      const rows = await db.execute({
        sql: 'SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE title LIKE ? OR excerpt LIKE ? ORDER BY published_at DESC LIMIT 30',
        args: [`%${q}%`, `%${q}%`],
      });
      return res.json(rows.rows);
    }

    if (path === '/api/posts/related' && req.method === 'GET') {
      const postId = url.searchParams.get('postId') ?? '';
      const limit = Math.min(6, parseInt(url.searchParams.get('limit') ?? '3'));
      const db = getDb();
      const rows = await db.execute({
        sql: 'SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts WHERE id != ? ORDER BY published_at DESC LIMIT ?',
        args: [postId, limit],
      });
      return res.json(rows.rows);
    }

    // GET /api/posts/:slug
    const slugMatch = path.match(/^\/api\/posts\/([^/]+)$/);
    if (slugMatch && req.method === 'GET') {
      const slug = decodeURIComponent(slugMatch[1]);
      const db = getDb();
      const rows = await db.execute({ sql: 'SELECT * FROM posts WHERE slug = ? LIMIT 1', args: [slug] });
      if (!rows.rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json(rows.rows[0]);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('[API/posts]', e);
    return res.status(500).json({ error: String(e) });
  }
}
