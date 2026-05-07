import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/turso.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
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
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
