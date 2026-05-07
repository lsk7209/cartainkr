import { Hono } from 'hono';
import { cors } from 'hono/cors';
import posts from './routes/posts';
import admin from './routes/admin';
import { sitemapHandler } from './routes/sitemap';
import { rssHandler } from './routes/rss';
import { handleScheduled } from './crons/generate';
import type { Env } from './lib/types';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = ['https://cartain.kr', 'https://www.cartain.kr', 'http://localhost:8080', 'http://localhost:5173'];
      return allowed.includes(origin) ? origin : 'https://cartain.kr';
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  })
);

app.route('/api/posts', posts);
app.route('/api/admin', admin);

app.get('/sitemap.xml', (c) => sitemapHandler(c));
app.get('/rss.xml', (c) => rssHandler(c));

app.get('/', (c) => c.json({ name: 'cartainkr-api', status: 'ok' }));

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
