import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripBom = (s: string) => s.replace(/^\uFEFF/, '');

export function requireAdmin(req: VercelRequest): boolean {
  const auth = req.headers['authorization'];
  const key = stripBom(process.env.ADMIN_API_KEY ?? '');
  return !!key && auth === `Bearer ${key}`;
}

export function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
