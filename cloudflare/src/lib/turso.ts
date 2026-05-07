import { createClient } from '@libsql/client/web';
import type { Env } from './types';

export function getDb(env: Env) {
  const url = env.TURSO_URL.startsWith('libsql://')
    ? env.TURSO_URL.replace('libsql://', 'https://')
    : env.TURSO_URL;

  return createClient({
    url,
    authToken: env.TURSO_TOKEN,
  });
}
