import type { Context } from 'hono';
import { getDb } from '../lib/turso';
import type { Env } from '../lib/types';

const BASE_URL = 'https://cartain.kr';

const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/magazine', priority: '0.9', changefreq: 'daily' },
  { url: '/calculator', priority: '0.8', changefreq: 'monthly' },
  { url: '/about', priority: '0.6', changefreq: 'monthly' },
  { url: '/contact', priority: '0.5', changefreq: 'monthly' },
];

export async function sitemapHandler(c: Context<{ Bindings: Env }>) {
  const db = getDb(c.env);
  const res = await db.execute(
    'SELECT slug, updated_at, thumbnail_url FROM posts ORDER BY published_at DESC LIMIT 1000'
  );

  const staticUrls = STATIC_PAGES.map(
    (p) => `  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  ).join('\n');

  const postUrls = res.rows.map((row) => {
    const imageTag = row.thumbnail_url
      ? `\n    <image:image><image:loc>${row.thumbnail_url}</image:loc></image:image>`
      : '';
    return `  <url>
    <loc>${BASE_URL}/magazine/${row.slug}</loc>
    <lastmod>${(row.updated_at as string).split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>${imageTag}
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticUrls}
${postUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
