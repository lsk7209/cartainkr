import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, POSTS_PER_PAGE } from './_lib/turso.js';
import { requireAdmin, setCors } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, '');

  try {
    // ── Posts ──────────────────────────────────────────────────
    if (path === '/api/posts' && req.method === 'GET') {
      const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
      const offset = (page - 1) * POSTS_PER_PAGE;
      const db = getDb();
      const [rows, countRow] = await Promise.all([
        db.execute({
          sql: 'SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts ORDER BY published_at DESC LIMIT ? OFFSET ?',
          args: [POSTS_PER_PAGE, offset],
        }),
        db.execute('SELECT COUNT(*) as cnt FROM posts'),
      ]);
      return res.json({ posts: rows.rows, totalCount: Number((countRow.rows[0] as any).cnt) });
    }

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

    // GET /api/posts/:slug  — must come after named sub-routes
    const postSlugMatch = path.match(/^\/api\/posts\/([^/]+)$/);
    if (postSlugMatch && req.method === 'GET') {
      const slug = decodeURIComponent(postSlugMatch[1]);
      const db = getDb();
      const rows = await db.execute({ sql: 'SELECT * FROM posts WHERE slug = ? LIMIT 1', args: [slug] });
      if (!rows.rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json(rows.rows[0]);
    }

    // ── Admin ──────────────────────────────────────────────────
    if (path.startsWith('/api/admin')) {
      if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

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

    }

    // ── Sitemap ────────────────────────────────────────────────
    if (path === '/api/sitemap') {
      const db = getDb();
      const rows = await db.execute('SELECT slug, updated_at, published_at FROM posts ORDER BY published_at DESC');
      const BASE = 'https://cartain.kr';
      const staticUrls = [
        { loc: BASE, priority: '1.0' },
        { loc: `${BASE}/magazine`, priority: '0.9' },
        { loc: `${BASE}/calculator`, priority: '0.8' },
        { loc: `${BASE}/about`, priority: '0.5' },
        { loc: `${BASE}/contact`, priority: '0.5' },
        { loc: `${BASE}/privacy`, priority: '0.3' },
        { loc: `${BASE}/terms`, priority: '0.3' },
      ];
      const staticXml = staticUrls.map(u => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n');
      const postsXml = (rows.rows as any[]).map(p => {
        const lastmod = ((p.updated_at || p.published_at) as string).slice(0, 10);
        return `  <url><loc>${BASE}/magazine/${p.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
      }).join('\n');
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      return res.send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${staticXml}\n${postsXml}\n</urlset>`
      );
    }

    // ── RSS ────────────────────────────────────────────────────
    if (path === '/api/rss') {
      const db = getDb();
      const rows = await db.execute('SELECT title, slug, excerpt, published_at FROM posts ORDER BY published_at DESC LIMIT 50');
      const BASE = 'https://cartain.kr';
      const items = (rows.rows as any[]).map(p =>
        `  <item>\n    <title><![CDATA[${p.title}]]></title>\n    <link>${BASE}/magazine/${p.slug}</link>\n    <description><![CDATA[${p.excerpt ?? ''}]]></description>\n    <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>\n    <guid isPermaLink="true">${BASE}/magazine/${p.slug}</guid>\n  </item>`
      ).join('\n');
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>카테인</title>\n  <link>${BASE}</link>\n  <description>자동차 구매와 유지비에 관한 정보 플랫폼</description>\n  <language>ko</language>\n  <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml"/>\n${items}\n</channel>\n</rss>`
      );
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('[API]', e);
    return res.status(500).json({ error: String(e) });
  }
}

