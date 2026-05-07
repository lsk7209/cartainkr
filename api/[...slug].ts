import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, POSTS_PER_PAGE } from './_lib/turso.js';
import { setCors } from './_lib/auth.js';

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
          sql: 'SELECT id,title,slug,excerpt,thumbnail_url,published_at FROM posts ORDER BY published_at DESC LIMIT ? OFFSET ?',
          args: [POSTS_PER_PAGE, offset],
        }),
        db.execute('SELECT COUNT(*) as cnt FROM posts'),
      ]);
      return res.json({ posts: rows.rows, totalCount: Number((countRow.rows[0] as any).cnt) });
    }

    // GET /api/sitemap
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
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticXml}\n${postsXml}\n</urlset>`
      );
    }

    // GET /api/rss
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
