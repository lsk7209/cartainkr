import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel cron sends GET; protect with CRON_SECRET header Vercel automatically sets
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getDb();
    const settingRow = await db.execute("SELECT value FROM settings WHERE key = 'posts_per_day' LIMIT 1");
    const postsPerDay = parseInt((settingRow.rows[0] as any)?.value ?? '2');

    const results: string[] = [];
    for (let i = 0; i < postsPerDay; i++) {
      const result = await generatePost(db);
      results.push(result.message ?? result.error ?? '?');
    }

    return res.json({ success: true, results });
  } catch (e) {
    console.error('[cron/generate]', e);
    return res.status(500).json({ error: String(e) });
  }
}

async function generatePost(db: ReturnType<typeof getDb>): Promise<{ success: boolean; message?: string; error?: string }> {
  const Anthropic = (await import('anthropic')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const queueRow = await db.execute("SELECT * FROM post_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
  const queueItem = queueRow.rows[0] as any;
  const topic = queueItem?.title ?? '자동차 유지비 절약 완벽 가이드';

  const systemPrompt = `당신은 카테인(cartain.kr)의 자동차 정보 전문 에디터입니다.
독자는 자동차 구매와 유지비에 관심 있는 한국인입니다.
SEO에 최적화된 실용적인 블로그 글을 한국어로 작성합니다.
HTML 형식으로 작성하고, h2/h3/p/ul/li/strong 태그를 사용합니다.`;

  const userPrompt = `주제: "${topic}"

다음 JSON 형식으로만 응답하세요:
{"title":"...", "slug":"...", "excerpt":"...(150자 이내)", "content_html":"...(1500~2500자 HTML)"}

slug는 영어 소문자와 하이픈만 사용.`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const raw = (msg.content[0] as any).text as string;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { success: false, error: 'JSON 파싱 실패' };

  const post = JSON.parse(jsonMatch[0]) as { title: string; slug: string; excerpt: string; content_html: string };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  let slug = post.slug.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80);

  const dup = await db.execute({ sql: 'SELECT id FROM posts WHERE slug = ? LIMIT 1', args: [slug] });
  if (dup.rows[0]) slug = `${slug}-${Date.now()}`;

  await db.execute({
    sql: 'INSERT INTO posts (id, title, slug, content_html, excerpt, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, post.title, slug, post.content_html, post.excerpt, now, now],
  });

  if (queueItem?.id) {
    await db.execute({ sql: "UPDATE post_queue SET status = 'completed' WHERE id = ?", args: [queueItem.id] });
  }

  const key = '7f4e2b9d1a8c3f6e0d5b4a2c7e9f1d3b';
  const url = `https://cartain.kr/magazine/${slug}`;
  await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${key}`).catch(() => {});

  return { success: true, message: `"${post.title}" 발행 완료` };
}
