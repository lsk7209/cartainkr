export interface Env {
  TURSO_URL: string;
  TURSO_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  ADMIN_API_KEY: string;
  INDEXNOW_KEY: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content_html: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
  updated_at: string;
}

export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
}

export interface PostQueue {
  id: string;
  title: string;
  target_keywords: string;
  category: string;
  status: string;
  created_at: string;
}
