import { Hono } from 'hono';
import { getDb } from '../lib/turso';
import type { Env, Post, PostSummary } from '../lib/types';

const POSTS_PER_PAGE = 9;
const SUMMARY_COLS = 'id, title, slug, excerpt, thumbnail_url, published_at';

const app = new Hono<{ Bindings: Env }>();

// GET /api/posts?page=1
app.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1'));
  const offset = (page - 1) * POSTS_PER_PAGE;
  const db = getDb(c.env);

  const [countRes, dataRes] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM posts'),
    db.execute({
      sql: `SELECT ${SUMMARY_COLS} FROM posts ORDER BY published_at DESC LIMIT ? OFFSET ?`,
      args: [POSTS_PER_PAGE, offset],
    }),
  ]);

  const totalCount = (countRes.rows[0]?.count as number) ?? 0;
  return c.json({ posts: dataRes.rows as unknown as PostSummary[], totalCount });
});

// GET /api/posts/count
app.get('/count', async (c) => {
  const db = getDb(c.env);
  const res = await db.execute('SELECT COUNT(*) as count FROM posts');
  return c.json({ count: (res.rows[0]?.count as number) ?? 0 });
});

// GET /api/posts/latest?limit=3
app.get('/latest', async (c) => {
  const limit = Math.min(20, parseInt(c.req.query('limit') ?? '3'));
  const db = getDb(c.env);
  const res = await db.execute({
    sql: `SELECT ${SUMMARY_COLS} FROM posts ORDER BY published_at DESC LIMIT ?`,
    args: [limit],
  });
  return c.json(res.rows as unknown as PostSummary[]);
});

// GET /api/posts/search?q=...
app.get('/search', async (c) => {
  const q = c.req.query('q')?.trim() ?? '';
  if (q.length < 2) return c.json([]);

  const db = getDb(c.env);
  const like = `%${q}%`;
  const res = await db.execute({
    sql: `SELECT ${SUMMARY_COLS} FROM posts WHERE title LIKE ? OR excerpt LIKE ? ORDER BY published_at DESC LIMIT 30`,
    args: [like, like],
  });
  return c.json(res.rows as unknown as PostSummary[]);
});

// GET /api/posts/related?postId=...&title=...&limit=4
app.get('/related', async (c) => {
  const postId = c.req.query('postId') ?? '';
  const title = c.req.query('title') ?? '';
  const limit = Math.min(10, parseInt(c.req.query('limit') ?? '4'));
  const db = getDb(c.env);

  if (postId && title) {
    const keywords = title
      .replace(/[^\w가-힣\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .slice(0, 3);

    if (keywords.length > 0) {
      const conditions = keywords.map(() => 'title LIKE ?').join(' OR ');
      const args: (string | number)[] = [...keywords.map((k) => `%${k}%`), postId, limit];
      const res = await db.execute({
        sql: `SELECT ${SUMMARY_COLS} FROM posts WHERE (${conditions}) AND id != ? ORDER BY published_at DESC LIMIT ?`,
        args,
      });
      if (res.rows.length >= 2) {
        return c.json(res.rows as unknown as PostSummary[]);
      }
    }
  }

  // Fallback: latest posts
  const res = await db.execute({
    sql: `SELECT ${SUMMARY_COLS} FROM posts WHERE id != ? ORDER BY published_at DESC LIMIT ?`,
    args: [postId, limit],
  });
  return c.json(res.rows as unknown as PostSummary[]);
});

// GET /api/posts/:slug
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = getDb(c.env);
  const res = await db.execute({
    sql: 'SELECT * FROM posts WHERE slug = ? LIMIT 1',
    args: [slug],
  });
  if (res.rows.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.json(res.rows[0] as unknown as Post);
});

export default app;
