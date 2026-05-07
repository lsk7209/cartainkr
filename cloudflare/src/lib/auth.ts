import type { MiddlewareHandler } from 'hono';
import type { Env } from './types';

export const adminAuth: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const key = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!key || key !== c.env.ADMIN_API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
};
