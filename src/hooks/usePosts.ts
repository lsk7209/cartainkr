import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PostSummary, PostsResponse } from '@/types/post';
import { POSTS_PER_PAGE } from '@/lib/constants';

export const usePaginatedPosts = (page: number) =>
  useQuery({
    queryKey: ['posts-list', page],
    queryFn: (): Promise<PostsResponse> => api.posts.list(page),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const useLatestPosts = (limit = 3) =>
  useQuery({
    queryKey: ['latest-posts', limit],
    queryFn: (): Promise<PostSummary[]> => api.posts.latest(limit),
    staleTime: 5 * 60 * 1000,
  });

export const usePostsCount = () =>
  useQuery({
    queryKey: ['posts-count'],
    queryFn: () => api.posts.count(),
    staleTime: 10 * 60 * 1000,
  });

export const useSearchPosts = (query: string) => {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['posts-search', trimmed],
    queryFn: (): Promise<PostSummary[]> => api.posts.search(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
};

export const useRelatedPosts = (currentPostId: string, limit = 4, currentTitle?: string) =>
  useQuery({
    queryKey: ['related-posts', currentPostId, limit, currentTitle],
    queryFn: (): Promise<PostSummary[]> =>
      api.posts.related(currentPostId, currentTitle ?? '', limit),
    staleTime: 5 * 60 * 1000,
    enabled: !!currentPostId,
  });

export { POSTS_PER_PAGE };
