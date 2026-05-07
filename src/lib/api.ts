import type { PostSummary, PostDetail, PostsResponse } from '@/types/post';
import { POSTS_PER_PAGE } from './constants';

// CF Worker URL — set VITE_API_URL in .env after deploying cloudflare/
// Until deployed, falls back to Supabase REST API
const CF_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const SUMMARY_FIELDS = 'id,title,slug,excerpt,thumbnail_url,published_at';

// ── Supabase REST fallback helpers ────────────────────────────────────────────

async function supaFetch<T>(path: string, params = ''): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function supaFetchCount(table: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    method: 'HEAD',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'count=exact',
    },
  });
  const range = res.headers.get('content-range');
  return range ? parseInt(range.split('/')[1] ?? '0') : 0;
}

// ── CF Worker helpers ──────────────────────────────────────────────────────────

async function cfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CF_API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path}: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const api = {
  posts: {
    list: async (page: number): Promise<PostsResponse> => {
      if (CF_API_URL) return cfFetch<PostsResponse>(`/api/posts?page=${page}`);
      const from = (page - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;
      const [posts, total] = await Promise.all([
        supaFetch<PostSummary[]>('posts', `?select=${SUMMARY_FIELDS}&order=published_at.desc&offset=${from}&limit=${POSTS_PER_PAGE}`),
        supaFetchCount('posts'),
      ]);
      return { posts, totalCount: total };
    },

    latest: async (limit: number): Promise<PostSummary[]> => {
      if (CF_API_URL) return cfFetch<PostSummary[]>(`/api/posts/latest?limit=${limit}`);
      return supaFetch<PostSummary[]>('posts', `?select=${SUMMARY_FIELDS}&order=published_at.desc&limit=${limit}`);
    },

    count: async (): Promise<number> => {
      if (CF_API_URL) return cfFetch<{ count: number }>('/api/posts/count').then((r) => r.count);
      return supaFetchCount('posts');
    },

    search: async (q: string): Promise<PostSummary[]> => {
      if (CF_API_URL) return cfFetch<PostSummary[]>(`/api/posts/search?q=${encodeURIComponent(q)}`);
      return supaFetch<PostSummary[]>('posts', `?select=${SUMMARY_FIELDS}&or=title.ilike.*${q}*,excerpt.ilike.*${q}*&order=published_at.desc&limit=30`);
    },

    related: async (postId: string, title: string, limit: number): Promise<PostSummary[]> => {
      if (CF_API_URL) {
        return cfFetch<PostSummary[]>(
          `/api/posts/related?postId=${encodeURIComponent(postId)}&title=${encodeURIComponent(title)}&limit=${limit}`
        );
      }
      return supaFetch<PostSummary[]>('posts', `?select=${SUMMARY_FIELDS}&neq=id.${postId}&order=published_at.desc&limit=${limit}`);
    },

    get: async (slug: string): Promise<PostDetail> => {
      if (CF_API_URL) return cfFetch<PostDetail>(`/api/posts/${encodeURIComponent(slug)}`);
      const rows = await supaFetch<PostDetail[]>('posts', `?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`);
      if (!rows[0]) throw new Error(`404: Post not found: ${slug}`);
      return rows[0];
    },
  },

  admin: {
    stats: (apiKey: string) =>
      cfFetch<{ totalPosts: number; thisWeekPosts: number; pendingQueue: number; completedQueue: number }>(
        '/api/admin/stats',
        { headers: { Authorization: `Bearer ${apiKey}` } }
      ),

    posts: (apiKey: string) =>
      cfFetch<PostSummary[]>('/api/admin/posts', { headers: { Authorization: `Bearer ${apiKey}` } }),

    queue: {
      list: (apiKey: string) =>
        cfFetch<Array<{ id: string; title: string; target_keywords: string; category: string; status: string; created_at: string }>>(
          '/api/admin/queue',
          { headers: { Authorization: `Bearer ${apiKey}` } }
        ),

      add: (apiKey: string, items: Array<{ title: string }>) =>
        cfFetch<{ success: boolean; count: number }>('/api/admin/queue', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        }),

      updateStatus: (apiKey: string, id: string, status: string) =>
        cfFetch<{ success: boolean }>(`/api/admin/queue/${id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }),

      delete: (apiKey: string, id: string) =>
        cfFetch<{ success: boolean }>(`/api/admin/queue/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
    },

    settings: {
      get: (apiKey: string) =>
        cfFetch<Record<string, string>>('/api/admin/settings', { headers: { Authorization: `Bearer ${apiKey}` } }),

      set: (apiKey: string, key: string, value: string) =>
        cfFetch<{ success: boolean }>('/api/admin/settings', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        }),
    },

    generate: (apiKey: string) =>
      cfFetch<{ success: boolean; message?: string; error?: string }>('/api/admin/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
  },
};

export type { PostsResponse };
export { POSTS_PER_PAGE };
