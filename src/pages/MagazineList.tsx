import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useSEO, generateCollectionPageSchema, generateBreadcrumbSchema } from "@/hooks/useSEO";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "@/lib/imageUtils";
import { usePaginatedPosts } from "@/hooks/usePosts";
import { formatDate } from "@/lib/dateUtils";
import { BASE_URL, CURRENT_YEAR, POSTS_PER_PAGE } from "@/lib/constants";

const MagazineList = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = usePaginatedPosts(currentPage);

  const posts = data?.posts || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

  // Apply SEO meta tags
  useSEO({
    title: '자동차 구매 가이드 & 유지비 절약 팁 | 카테인 매거진',
    description: `${CURRENT_YEAR}년 최신 자동차 구매 가이드, 유지비 절약 방법, 보험료 비교 정보. 전문가가 알려주는 실용적인 자동차 정보를 무료로 확인하세요.`,
    canonicalUrl: `${BASE_URL}/magazine`,
    ogType: 'website',
    keywords: ['자동차 구매 가이드', '자동차 유지비', '자동차 보험', '중고차 구매', '신차 구매'],
  });

  // Generate structured data
  const structuredData = useMemo(() => {
    const data: object[] = [];
    
    // CollectionPage + ItemList schema
    const collectionSchema = generateCollectionPageSchema(
      '자동차 매거진 - 카테인',
      '자동차 구매 가이드, 유지비 절약 팁, 보험 정보까지. 전문가가 알려주는 실용적인 자동차 정보.',
      `${BASE_URL}/magazine`,
      posts.map(post => ({
        title: post.title,
        url: `${BASE_URL}/magazine/${post.slug}`,
        image: post.thumbnail_url,
        description: post.excerpt,
        datePublished: post.published_at,
      }))
    );
    data.push(collectionSchema);
    
    // Breadcrumb schema
    data.push(generateBreadcrumbSchema([
      { name: '홈', url: BASE_URL },
      { name: '매거진', url: `${BASE_URL}/magazine` },
    ]));
    
    return data;
  }, [posts]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Structured Data for SEO */}
      {!isLoading && <JsonLd data={structuredData} />}
      
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container max-w-5xl mx-auto">
          {/* Page Header */}
          <header className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              자동차 매거진
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              자동차 구매 가이드, 유지비 절약 팁, 보험 정보까지 전문가가 알려드립니다
            </p>
          </header>

          {/* Posts Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-5">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                아직 게시된 글이 없습니다
              </h2>
              <p className="text-muted-foreground mb-6">
                곧 유용한 자동차 정보를 담은 콘텐츠가 업로드될 예정입니다
              </p>
              <Link
                to="/calculator"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                유지비 계산기 사용하기
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/magazine/${post.slug}`}
                    className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-muted overflow-hidden">
                      {post.thumbnail_url ? (
                        <img
                          src={getOptimizedImageUrl(post.thumbnail_url, { width: 400 }) || post.thumbnail_url}
                          srcSet={getResponsiveSrcSet(post.thumbnail_url, [320, 400, 640])}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading={index < 3 ? "eager" : "lazy"}
                          decoding="async"
                          fetchPriority={index < 3 ? "high" : "low"}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent">
                          <span className="text-4xl font-bold text-primary/30">카</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h2 className="font-bold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="flex items-center justify-center gap-2 mt-12" aria-label="페이지 네비게이션">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {getPageNumbers().map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => handlePageChange(page)}
                      aria-label={`${page} 페이지`}
                      aria-current={currentPage === page ? "page" : undefined}
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="다음 페이지"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MagazineList;