import type { VercelResponse } from "@vercel/node";

export const CACHE_CONTROL = {
  POSTS_LIST: "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
  POST_DETAIL: "public, max-age=0, s-maxage=900, stale-while-revalidate=86400",
  FEED: "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400",
  SITEMAP: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
} as const;

export function setPublicCache(
  res: VercelResponse,
  value: (typeof CACHE_CONTROL)[keyof typeof CACHE_CONTROL],
) {
  res.setHeader("Cache-Control", value);
}
