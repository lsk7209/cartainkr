import { Hono } from 'hono';
import { adminAuth } from '../lib/auth';
import { getDb } from '../lib/turso';
import { generatePost } from '../crons/generate';
import type { Env, PostQueue } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', adminAuth);

// GET /api/admin/stats
app.get('/stats', async (c) => {
  const db = getDb(c.env);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [total, weekPosts, queueRows] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM posts'),
    db.execute({ sql: 'SELECT COUNT(*) as count FROM posts WHERE published_at >= ?', args: [oneWeekAgo] }),
    db.execute('SELECT status, COUNT(*) as count FROM post_queue GROUP BY status'),
  ]);

  const queueByStatus: Record<string, number> = {};
  for (const row of queueRows.rows) {
    queueByStatus[row.status as string] = row.count as number;
  }

  return c.json({
    totalPosts: (total.rows[0]?.count as number) ?? 0,
    thisWeekPosts: (weekPosts.rows[0]?.count as number) ?? 0,
    pendingQueue: queueByStatus['pending'] ?? 0,
    completedQueue: queueByStatus['completed'] ?? 0,
  });
});

// GET /api/admin/posts
app.get('/posts', async (c) => {
  const db = getDb(c.env);
  const res = await db.execute(
    'SELECT id, title, slug, excerpt, thumbnail_url, published_at FROM posts ORDER BY published_at DESC'
  );
  return c.json(res.rows);
});

// GET /api/admin/queue
app.get('/queue', async (c) => {
  const db = getDb(c.env);
  const res = await db.execute('SELECT * FROM post_queue ORDER BY created_at DESC');
  return c.json(res.rows as unknown as PostQueue[]);
});

// POST /api/admin/queue  — bulk insert titles
app.post('/queue', async (c) => {
  const body = await c.req.json<{ items: Array<{ title: string; target_keywords?: string; category?: string }> }>();
  if (!body.items?.length) return c.json({ error: 'No items' }, 400);

  const db = getDb(c.env);
  const now = new Date().toISOString();
  const id = () => crypto.randomUUID();

  await db.batch(
    body.items.map((item) => ({
      sql: 'INSERT INTO post_queue (id, title, target_keywords, category, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id(), item.title, item.target_keywords ?? '자동 생성', item.category ?? '자동차', 'pending', now],
    }))
  );

  return c.json({ success: true, count: body.items.length });
});

// PATCH /api/admin/queue/:id  — update status
app.patch('/queue/:id', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json<{ status: string }>();
  const allowed = ['pending', 'processing', 'completed', 'failed'];
  if (!allowed.includes(status)) return c.json({ error: 'Invalid status' }, 400);

  const db = getDb(c.env);
  await db.execute({ sql: 'UPDATE post_queue SET status = ? WHERE id = ?', args: [status, id] });
  return c.json({ success: true });
});

// DELETE /api/admin/queue/:id
app.delete('/queue/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  await db.execute({ sql: 'DELETE FROM post_queue WHERE id = ?', args: [id] });
  return c.json({ success: true });
});

// GET /api/admin/settings
app.get('/settings', async (c) => {
  const db = getDb(c.env);
  const res = await db.execute('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of res.rows) settings[row.key as string] = row.value as string;
  return c.json(settings);
});

// POST /api/admin/settings
app.post('/settings', async (c) => {
  const body = await c.req.json<{ key: string; value: string }>();
  if (!body.key) return c.json({ error: 'Missing key' }, 400);

  const db = getDb(c.env);
  await db.execute({
    sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    args: [body.key, body.value],
  });
  return c.json({ success: true });
});

// POST /api/admin/generate  — trigger one post generation
app.post('/generate', async (c) => {
  const result = await generatePost(c.env);
  return c.json(result);
});

export default app;
