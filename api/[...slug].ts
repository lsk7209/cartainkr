import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, POSTS_PER_PAGE } from './_lib/turso.js';
import { setCors } from './_lib/auth.js';
import { CACHE_CONTROL, setPublicCache } from './_lib/cache.js';

type CountRow = { cnt: string | number };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, '');

  try {
    // GET /api/posts (paginated list)
    if (path === '/api/posts' && req.method === 'GET') {
      const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
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

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('[API]', e);
    return res.status(500).json({ error: String(e) });
  }
}
