import type { Context } from 'hono';
import { getDb } from '../lib/turso';
import type { Env } from '../lib/types';

const BASE_URL = 'https://cartain.kr';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function rssHandler(c: Context<{ Bindings: Env }>) {
  const db = getDb(c.env);
  const res = await db.execute(
    'SELECT title, slug, excerpt, thumbnail_url, published_at FROM posts ORDER BY published_at DESC LIMIT 50'
  );

  const items = res.rows.map((row) => {
    const url = `${BASE_URL}/magazine/${row.slug}`;
    const pubDate = new Date(row.published_at as string).toUTCString();
    const desc = escapeXml((row.excerpt as string) ?? '');
    const mediaTag = row.thumbnail_url
      ? `\n      <media:content url="${row.thumbnail_url}" medium="image" />`
      : '';
    return `    <item>
      <title>${escapeXml(row.title as string)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
      <category>자동차</category>
      <author>editor@cartain.kr (카테인 에디터)</author>${mediaTag}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>카테인 - 자동차 정보 매거진</title>
    <link>${BASE_URL}</link>
    <description>자동차 구매 가이드, 유지비 계산, 보험 정보 등 실용적인 자동차 정보를 제공합니다.</description>
    <language>ko</language>
    <managingEditor>editor@cartain.kr (카테인 에디터)</managingEditor>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <ttl>60</ttl>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}
