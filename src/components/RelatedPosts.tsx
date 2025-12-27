import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
}

interface RelatedPostsProps {
  currentPostId: string;
  limit?: number;
}

const RelatedPosts = ({ currentPostId, limit = 4 }: RelatedPostsProps) => {
  const [posts, setPosts] = useState<RelatedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedPosts = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug, excerpt, thumbnail_url, published_at")
        .neq("id", currentPostId)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching related posts:", error);
      } else {
        setPosts(data || []);
      }
      setIsLoading(false);
    };

    fetchRelatedPosts();
  }, [currentPostId, limit]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <section className="mt-16 pt-12 border-t border-border">
        <h2 className="text-2xl font-bold text-foreground mb-8">관련 글</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-12 border-t border-border">
      <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
        <span className="w-1 h-8 bg-primary rounded-full" />
        관련 글
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {posts.map((relatedPost) => (
          <Link
            key={relatedPost.id}
            to={`/magazine/${relatedPost.slug}`}
            className="group flex gap-4 p-4 rounded-xl bg-card hover:bg-muted/50 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
          >
            {/* Thumbnail */}
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              {relatedPost.thumbnail_url ? (
                <img
                  src={relatedPost.thumbnail_url}
                  alt={relatedPost.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <span className="text-3xl">📰</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {relatedPost.title}
              </h3>
              
              {relatedPost.excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {relatedPost.excerpt}
                </p>
              )}
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(relatedPost.published_at)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View All Link */}
      <div className="mt-8 text-center">
        <Link
          to="/magazine"
          className="inline-flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-full font-medium transition-colors"
        >
          더 많은 글 보기
          <span className="text-lg">→</span>
        </Link>
      </div>
    </section>
  );
};

export default RelatedPosts;
