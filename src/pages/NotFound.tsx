import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestPosts } from "@/hooks/usePosts";
import { getPostThumbnailUrl } from "@/lib/imageUtils";
import { useSEO } from "@/hooks/useSEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();
  const { data: posts = [], isLoading } = useLatestPosts(3);

  useSEO({
    title: '페이지를 찾을 수 없습니다 (404) | 카테인',
    description: '요청하신 페이지가 존재하지 않습니다. 카테인 홈으로 이동하거나 매거진을 확인해보세요.',
  });

  useEffect(() => {
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow');
    return () => {
      document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error("404:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main id="main-content" className="flex-1 py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* 404 헤더 */}
          <div className="text-center mb-12">
            <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
            <p className="text-2xl text-foreground mb-2">페이지를 찾을 수 없습니다</p>
            <p className="text-muted-foreground mb-8">
              요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link to="/">
                <Home className="h-5 w-5" />
                홈으로 돌아가기
              </Link>
            </Button>
          </div>

          {/* 추천 콘텐츠 */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">추천 콘텐츠</h2>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-full">
                    <Skeleton className="aspect-video w-full rounded-t-lg" />
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {posts.map((post) => (
                  <Link key={post.id} to={`/magazine/${post.slug}`}>
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img
                          src={getPostThumbnailUrl(post.thumbnail_url, { width: 400 })}
                          alt={post.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-2 mb-2">{post.title}</h3>
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="text-center mt-8">
              <Button variant="outline" asChild>
                <Link to="/magazine">모든 글 보기</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
