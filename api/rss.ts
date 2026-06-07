import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_lib/turso.js";
import { CACHE_CONTROL, setPublicCache } from "./_lib/cache.js";

type RssPostRow = {
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const cdata = (value: string) =>
  `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const db = getDb();
    const rows = await db.execute(
      "SELECT title, slug, excerpt, published_at FROM posts WHERE datetime(published_at) <= datetime('now') ORDER BY published_at DESC LIMIT 50",
    );
    const BASE = "https://cartain.kr";
    const items = (rows.rows as unknown as RssPostRow[])
      .map(
        (p) =>
          `  <item>\n    <title>${cdata(p.title)}</title>\n    <link>${escapeXml(`${BASE}/magazine/${encodeURIComponent(p.slug)}`)}</link>\n    <description>${cdata(p.excerpt ?? "")}</description>\n    <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>\n    <guid isPermaLink="true">${escapeXml(`${BASE}/magazine/${encodeURIComponent(p.slug)}`)}</guid>\n  </item>`,
      )
      .join("\n");
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    setPublicCache(res, CACHE_CONTROL.FEED);
    return res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>카테인</title>\n  <link>${escapeXml(BASE)}</link>\n  <description>자동차 구매와 유지비에 관한 정보 플랫폼</description>\n  <language>ko</language>\n  <atom:link href="${escapeXml(`${BASE}/rss.xml`)}" rel="self" type="application/rss+xml"/>\n${items}\n</channel>\n</rss>`,
    );
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
