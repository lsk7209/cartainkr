import { getDb } from '../lib/turso';
import type { Env } from '../lib/types';

const BASE_URL = 'https://cartain.kr';
const INDEXNOW_KEY = '7f4e2b9d1a8c3f6e0d5b4a2c7e9f1d3b';

// Korean automotive term → romanized (for SEO-friendly slugs)
const KO_MAP: Record<string, string> = {
  자동차: 'jadongcha', 보험: 'boheom', 유지비: 'yujibi', 구매: 'gumae',
  신차: 'sincha', 중고차: 'junggocha', 세금: 'segeum', 연비: 'yeonbi',
  할부: 'halbu', 경차: 'gyeongcha', 소형차: 'sohyungcha', 대형차: 'daehyungcha',
  전기차: 'jeongicha', 하이브리드: 'hybrid', 수입차: 'swipicha', 국산차: 'guksancha',
  엔진: 'engine', 타이어: 'tire', 브레이크: 'brake', 오일: 'oil',
  주차: 'jujha', 사고: 'sago', 수리: 'suri', 튜닝: 'tuning',
  SUV: 'suv', 세단: 'sedan', 쿠페: 'coupe', 왜건: 'wagon',
  절약: 'jeolyak', 비교: 'bigyo', 추천: 'chucheon', 방법: 'bangbeop',
  가이드: 'guide',
};

function generateSlug(title: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6);
  let romanized = title;
  for (const [ko, en] of Object.entries(KO_MAP)) {
    romanized = romanized.split(ko).join(en);
  }
  const base = romanized
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  return base ? `${base}-${datePart}-${rand}` : `post-${datePart}-${rand}`;
}

function sanitizeHtml(html: string): string {
  const forbiddenTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style', 'link', 'meta'];
  let s = html;
  for (const tag of forbiddenTags) {
    if (tag === 'script' || tag === 'style') {
      s = s.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi'), '');
    }
    s = s.replace(new RegExp(`<${tag}[^>]*>`, 'gi'), '');
    s = s.replace(new RegExp(`</${tag}>`, 'gi'), '');
  }
  for (const attr of ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']) {
    s = s.replace(new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi'), '');
  }
  s = s.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  return s;
}

async function generateBlogContent(
  title: string,
  keywords: string,
  category: string,
  apiKey: string
): Promise<{ html: string; excerpt: string }> {
  const seed = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const systemPrompt = `당신은 SEO/GEO/AEO 전문 자동차 에디터입니다. 한국어로 100% 독창적인 블로그 글을 작성합니다. 반드시 HTML 태그만 사용하고 마크다운 문법(**굵게**, *기울임*, ## 등)은 절대 사용하지 마세요.`;

  const userPrompt = `[고유 시드: ${seed}]

주제: ${title}
키워드: ${keywords}
카테고리: ${category}
작성 시점: ${year}년 ${month}월 최신 정보 기준

=== 금지사항 ===
- 마크다운 문법 절대 금지 (**굵게**, *기울임*, ## 등)
- 반드시 HTML 태그만 사용: <strong>굵게</strong>, <em>기울임</em>, <h2>제목</h2>
- 외부 링크 금지 (내부 링크 /calculator, /magazine 만 허용)

=== 필수 요소 ===
1. SEO: 키워드 자연스럽게 분산 (밀도 1-2%), 시맨틱 HTML
2. EEAT: 국토교통부/보험개발원/KATRI 등 공신력 출처 인용, 연도 명시
3. AEO: <details><summary>질문</summary><div>답변</div></details> 형식 FAQ 7개 이상
4. 가독성: 2-3문장마다 새 <p> 태그, 표 5행 이상
5. 내용: 3,500자 이상, ${year}년 최신 정보, 구체적 수치

JSON으로 반환:
{
  "html": "<article>...</article>",
  "excerpt": "[120-160자 SEO 요약. 메인 키워드 앞부분 포함]"
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);

  const data = await res.json() as { content: Array<{ text: string }> };
  const text = data.content?.[0]?.text ?? '';

  let parsed: { html?: string; excerpt?: string } = {};
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    parsed = { html: `<article><h2>${title}</h2>${text}</article>`, excerpt: title };
  }

  let html = (parsed.html ?? `<article>${text}</article>`)
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .trim();

  if (!html.startsWith('<article') && !html.startsWith('<div')) {
    html = `<article>${html}</article>`;
  }

  html = sanitizeHtml(html);

  const rawExcerpt = (parsed.excerpt ?? '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .trim();
  const excerpt = rawExcerpt.length > 160
    ? rawExcerpt.substring(0, 157) + '...'
    : rawExcerpt || title;

  return { html, excerpt };
}

async function pingSearchEngines(postUrl: string): Promise<void> {
  const payload = JSON.stringify({
    host: 'cartain.kr',
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: [postUrl],
  });
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };

  await Promise.allSettled([
    fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers, body: payload }),
    fetch('https://www.bing.com/indexnow', { method: 'POST', headers, body: payload }),
    fetch(`https://searchadvisor.naver.com/indexnow?url=${encodeURIComponent(postUrl)}&key=${INDEXNOW_KEY}`),
    fetch(`https://register.search.daum.net/index.daum?act=insert&url=${encodeURIComponent(postUrl)}`),
  ]);
}

export async function generatePost(env: Env): Promise<{ success: boolean; message?: string; error?: string }> {
  const db = getDb(env);

  // Auto-recover stuck processing items (>30 min)
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await db.execute({
    sql: "UPDATE post_queue SET status = 'pending' WHERE status = 'processing' AND created_at < ?",
    args: [thirtyMinsAgo],
  });

  // Get next pending item
  const queueRes = await db.execute(
    "SELECT * FROM post_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
  );
  if (queueRes.rows.length === 0) {
    return { success: true, message: 'No pending posts in queue' };
  }
  const item = queueRes.rows[0];

  // Mark as processing
  await db.execute({ sql: "UPDATE post_queue SET status = 'processing' WHERE id = ?", args: [item.id as string] });

  try {
    const { html, excerpt } = await generateBlogContent(
      item.title as string,
      item.target_keywords as string,
      item.category as string,
      env.ANTHROPIC_API_KEY
    );

    const slug = generateSlug(item.title as string);
    const randomDaysAgo = Math.floor(Math.random() * 7) + 1;
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() - randomDaysAgo);
    publishDate.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
    const publishedAt = publishDate.toISOString();
    const id = crypto.randomUUID();

    await db.execute({
      sql: 'INSERT INTO posts (id, title, slug, content_html, excerpt, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, item.title as string, slug, html, excerpt, publishedAt, publishedAt],
    });

    await db.execute({ sql: "UPDATE post_queue SET status = 'completed' WHERE id = ?", args: [item.id as string] });

    // Ping search engines (non-blocking)
    pingSearchEngines(`${BASE_URL}/magazine/${slug}`).catch(() => {});

    return { success: true, message: `"${item.title}" 발행 완료` };
  } catch (err) {
    await db.execute({ sql: "UPDATE post_queue SET status = 'failed' WHERE id = ?", args: [item.id as string] });
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Scheduled handler — called by CF cron trigger
export async function handleScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  const db = getDb(env);

  // Check posts_per_day setting to decide how many to generate
  const settRes = await db.execute("SELECT value FROM settings WHERE key = 'posts_per_day'");
  const postsPerDay = parseInt((settRes.rows[0]?.value as string) ?? '2');
  const count = Math.ceil(postsPerDay / 2); // Each cron fires 2x/day

  for (let i = 0; i < count; i++) {
    await generatePost(env);
  }
}
