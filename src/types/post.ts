/**
 * 게시물 관련 타입 정의
 */

// 게시물 목록용 타입 (간략 정보)
export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
}

// 게시물 상세용 타입 (전체 정보)
export interface PostDetail extends PostSummary {
  content_html: string;
}

// 페이지네이션된 게시물 응답
export interface PostsResponse {
  posts: PostSummary[];
  totalCount: number;
}
