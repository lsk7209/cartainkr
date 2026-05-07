import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, POSTS_PER_PAGE } from './_lib/turso';
import { requireAdmin, setCors } from './_lib/auth';

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

      if (path === '/api/admin/generate' && req.method === 'POST') {
        const result = await generatePost();
        return res.json(result);
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

// ── Blog post generation (shared with cron) ────────────────────
async function generatePost(): Promise<{ success: boolean; message?: string; error?: string }> {
  const Anthropic = (await import('anthropic')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const db = getDb();

  // Pull next pending queue item (or pick a topic automatically)
  const queueRow = await db.execute("SELECT * FROM post_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
  const queueItem = queueRow.rows[0] as any;

  const topic = queueItem?.title ?? '자동차 유지비 절약 방법';

  const systemPrompt = `당신은 카테인(cartain.kr)의 자동차 정보 전문 에디터입니다.
독자는 자동차 구매와 유지비에 관심 있는 한국인입니다.
SEO에 최적화된 실용적인 블로그 글을 한국어로 작성합니다.
HTML 형식으로 작성하고, h2/h3/p/ul/li/strong 태그를 사용합니다.
글의 길이는 1500~2500자 내외로 작성합니다.`;

  const userPrompt = `다음 주제로 블로그 글을 작성해주세요: "${topic}"

요구사항:
1. 제목(title)과 본문(content_html), 요약(excerpt, 150자 이내), slug를 JSON으로 반환
2. slug는 영어 소문자와 하이픈만 사용 (예: car-maintenance-tips)
3. 실용적인 정보와 수치 포함
4. SEO 메타 설명 역할을 할 수 있는 excerpt 포함

반드시 다음 JSON 형식으로만 응답하세요:
{"title":"...", "slug":"...", "excerpt":"...", "content_html":"..."}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const raw = (msg.content[0] as any).text as string;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON 파싱 실패');

  const post = JSON.parse(jsonMatch[0]) as { title: string; slug: string; excerpt: string; content_html: string };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Ensure unique slug
  let finalSlug = post.slug.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80);
  const existing = await db.execute({ sql: 'SELECT id FROM posts WHERE slug = ? LIMIT 1', args: [finalSlug] });
  if (existing.rows[0]) finalSlug = `${finalSlug}-${Date.now()}`;

  await db.execute({
    sql: 'INSERT INTO posts (id, title, slug, content_html, excerpt, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, post.title, finalSlug, post.content_html, post.excerpt, now, now],
  });

  // Mark queue item done
  if (queueItem?.id) {
    await db.execute({ sql: "UPDATE post_queue SET status = 'completed' WHERE id = ?", args: [queueItem.id] });
  }

  // IndexNow ping
  const indexNowKey = '7f4e2b9d1a8c3f6e0d5b4a2c7e9f1d3b';
  const postUrl = `https://cartain.kr/magazine/${finalSlug}`;
  await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(postUrl)}&key=${indexNowKey}`).catch(() => {});
  await fetch(`https://www.bing.com/indexnow?url=${encodeURIComponent(postUrl)}&key=${indexNowKey}`).catch(() => {});

  return { success: true, message: `"${post.title}" 발행 완료` };
}
