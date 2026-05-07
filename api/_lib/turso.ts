import { createClient } from '@libsql/client/web';

const stripBom = (s: string) => s.replace(/^﻿/, '');

export function getDb() {
  const raw = stripBom(process.env.TURSO_URL ?? '');
  const url = raw.startsWith('libsql://') ? raw.replace('libsql://', 'https://') : raw;
  return createClient({ url, authToken: stripBom(process.env.TURSO_TOKEN ?? '') });
}

export const POSTS_PER_PAGE = 12;

export const SUMMARY_FIELDS = 'id,title,slug,excerpt,thumbnail_url,published_at';
