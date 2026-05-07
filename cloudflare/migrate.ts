/**
 * Supabase → Turso 데이터 마이그레이션 스크립트
 *
 * 사용법:
 *   TURSO_URL=https://cartain-lsk7209.aws-ap-northeast-1.turso.io \
 *   TURSO_TOKEN=<jwt> \
 *   SUPABASE_URL=https://tczuttsjfttqvcmdawbo.supabase.co \
 *   SUPABASE_ANON_KEY=<key> \
 *   npx tsx migrate.ts
 */

import { createClient } from '@libsql/client/web';

const TURSO_URL = (process.env.TURSO_URL ?? '').replace('libsql://', 'https://');
const TURSO_TOKEN = process.env.TURSO_TOKEN ?? '';
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

if (!TURSO_URL || !TURSO_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function supabaseFetch(path: string, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${path}${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
      Range: '0-999',
    },
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function run() {
  console.log('=== Cartainkr: Supabase → Turso Migration ===\n');

  // Step 1: Apply schema
  console.log('1. Applying schema...');
  const { readFileSync } = await import('fs');
  const { dirname, join } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  for (const stmt of schema.split(';').map((s) => s.trim()).filter(Boolean)) {
    await db.execute(stmt);
  }
  console.log('   Schema applied.\n');

  // Step 2: Migrate posts (paginate in chunks of 500)
  console.log('2. Migrating posts...');
  let offset = 0;
  let totalPosts = 0;

  while (true) {
    const posts = await supabaseFetch(
      'posts',
      `?select=id,title,slug,content_html,excerpt,thumbnail_url,published_at&order=published_at.asc&offset=${offset}&limit=500`
    ) as Record<string, unknown>[];

    if (!posts.length) break;

    const statements = posts.map((p) => ({
      sql: `INSERT OR IGNORE INTO posts (id, title, slug, content_html, excerpt, thumbnail_url, published_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.id as string,
        p.title as string,
        p.slug as string,
        p.content_html as string,
        p.excerpt as string | null,
        p.thumbnail_url as string | null,
        p.published_at as string,
        p.published_at as string,
      ],
    }));

    await db.batch(statements);
    totalPosts += posts.length;
    offset += posts.length;
    process.stdout.write(`\r   ${totalPosts} posts migrated...`);

    if (posts.length < 500) break;
  }
  console.log(`\n   ${totalPosts} posts done.\n`);

  // Step 3: Migrate post_queue
  console.log('3. Migrating post_queue...');
  const queue = await supabaseFetch(
    'post_queue',
    '?select=id,title,target_keywords,category,status,created_at&order=created_at.asc&limit=1000'
  ) as Record<string, unknown>[];

  if (queue.length > 0) {
    await db.batch(
      queue.map((q) => ({
        sql: 'INSERT OR IGNORE INTO post_queue (id, title, target_keywords, category, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [q.id, q.title, q.target_keywords, q.category, q.status, q.created_at] as string[],
      }))
    );
  }
  console.log(`   ${queue.length} queue items done.\n`);

  // Step 4: Migrate settings
  console.log('4. Migrating settings...');
  const settings = await supabaseFetch('settings', '?select=key,value') as Record<string, string>[];
  for (const s of settings) {
    await db.execute({ sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', args: [s.key, s.value] });
  }
  console.log(`   ${settings.length} settings done.\n`);

  // Verify
  const countRes = await db.execute('SELECT COUNT(*) as count FROM posts');
  console.log(`=== Migration complete. Total posts in Turso: ${countRes.rows[0]?.count} ===`);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
