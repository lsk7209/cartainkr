/**
 * 게시물 관련 커스텀 훅
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostSummary, PostsResponse } from "@/types/post";
import { POSTS_PER_PAGE } from "@/lib/constants";

// 공통 select 필드
const POST_SUMMARY_FIELDS = "id, title, slug, excerpt, thumbnail_url, published_at";

/**
 * 페이지네이션된 게시물 목록 조회
 */
export const usePaginatedPosts = (page: number) => {
  return useQuery({
    queryKey: ["posts-list", page],
    queryFn: async (): Promise<PostsResponse> => {
      const from = (page - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // 총 개수 조회
      const { count } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      // 페이지네이션된 게시물 조회
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SUMMARY_FIELDS)
        .order("published_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { posts: (data as PostSummary[]) || [], totalCount: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * 최신 게시물 조회 (홈페이지용)
 */
export const useLatestPosts = (limit: number = 3) => {
  return useQuery({
    queryKey: ["latest-posts", limit],
    queryFn: async (): Promise<PostSummary[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SUMMARY_FIELDS)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as PostSummary[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 관련 게시물 조회 (현재 게시물 제외)
 */
export const useRelatedPosts = (currentPostId: string, limit: number = 4) => {
  return useQuery({
    queryKey: ["related-posts", currentPostId, limit],
    queryFn: async (): Promise<PostSummary[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SUMMARY_FIELDS)
        .neq("id", currentPostId)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as PostSummary[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!currentPostId,
  });
};
