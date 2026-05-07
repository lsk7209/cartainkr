import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/turso.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDb();
    const row = await db.execute('SELECT COUNT(*) as cnt FROM posts');
    res.json({ ok: true, count: Number((row.rows[0] as any).cnt) });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
