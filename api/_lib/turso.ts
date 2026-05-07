import { createClient } from '@libsql/client/web';

export function getDb() {
  const raw = process.env.TURSO_URL ?? '';
  const url = raw.startsWith('libsql://') ? raw.replace('libsql://', 'https://') : raw;
  return createClient({ url, authToken: process.env.TURSO_TOKEN ?? '' });
}

export const POSTS_PER_PAGE = 12;

export const SUMMARY_FIELDS = 'id,title,slug,excerpt,thumbnail_url,published_at';
