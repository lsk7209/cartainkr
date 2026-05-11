import { ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { getPostThumbnailUrl } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/types/post";

interface PostListItemProps {
  post: PostSummary;
  /** 썸네일 표시 여부 */
  showThumbnail?: boolean;
  /** excerpt 표시 여부 */
  showExcerpt?: boolean;
  /** 컴팩트 모드 (Dashboard용) */
  compact?: boolean;
  className?: string;
}

/**
 * 재사용 가능한 게시물 목록 아이템 컴포넌트
 */
export const PostListItem = ({
  post,
  showThumbnail = false,
  showExcerpt = false,
  compact = false,
  className,
}: PostListItemProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        compact ? "p-3 bg-muted/50 rounded-lg" : "p-4 hover:bg-muted/50 transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {showThumbnail && (
          <img
            src={getPostThumbnailUrl(post.thumbnail_url, { width: 128 })}
            alt={post.title}
            className="w-16 h-12 object-cover rounded"
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{post.title}</h3>
          {showExcerpt && post.excerpt && (
            <p className="text-sm text-muted-foreground truncate">{post.excerpt}</p>
          )}
          <p className={cn("text-muted-foreground", showExcerpt ? "text-xs mt-1" : "text-sm")}>
            {formatDate(post.published_at, "datetime")}
          </p>
        </div>
      </div>
      <a
        href={`/magazine/${post.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-4 p-2 hover:bg-muted rounded-lg transition-colors"
      >
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
      </a>
    </div>
  );
};
