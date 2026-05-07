import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/turso.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
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
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
