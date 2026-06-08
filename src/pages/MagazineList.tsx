import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar, Clock, ArrowRight, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useSEO, generateCollectionPageSchema, generateBreadcrumbSchema } from "@/hooks/useSEO";
import { getPostThumbnailUrl, getResponsiveSrcSet } from "@/lib/imageUtils";
import { usePaginatedPosts, useSearchPosts } from "@/hooks/usePosts";
import { formatDate } from "@/lib/dateUtils";
import { stripMarkdown } from "@/lib/textUtils";
import { BASE_URL, CURRENT_YEAR, POSTS_PER_PAGE } from "@/lib/constants";

const MagazineList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const searchQuery = searchParams.get("q") || "";
  // Page state persisted in URL (?page=N) so back-button and sharing work
  const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const { data, isLoading } = usePaginatedPosts(currentPage);
  const { data: searchResults = [], isLoading: searchLoading } = useSearchPosts(searchQuery);

  const isSearchMode = searchQuery.length >= 2;
  const posts = useMemo(
    () => (isSearchMode ? searchResults : (data?.posts || [])),
    [data?.posts, isSearchMode, searchResults],
  );
  const totalCount = data?.totalCount || 0;
  const totalPages = isSearchMode ? 1 : Math.ceil(totalCount / POSTS_PER_PAGE);
  const isLoadingAny = isSearchMode ? searchLoading : isLoading;

  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (value.trim().length >= 2) {
      setSearchParams({ q: value.trim() });
    } else if (value.trim().length === 0) {
      setSearchParams({});
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchParams({});
  };

  // Sync input with URL on back/forward navigation
  useEffect(() => {
    setSearchInput(searchParams.get("q") || "");
  }, [searchParams]);

  // Apply SEO meta tags
  useSEO({
    title: isSearchMode
      ? `"${searchQuery}" 검색 결과 | 카테인 매거진`
      : currentPage > 1
        ? `자동차 구매 가이드 & 유지비 절약 팁 - ${currentPage}페이지 | 카테인 매거진`
        : '자동차 구매 가이드 & 유지비 절약 팁 | 카테인 매거진',
    description: `신차·중고차 구매 가이드부터 자동차세·보험료 절약 팁, 연비 비교까지. ${CURRENT_YEAR}년 최신 자동차 정보를 전문 에디터가 쉽고 정확하게 정리합니다. 카테인 매거진에서 무료로 확인하세요.`,
    canonicalUrl: currentPage > 1 ? `${BASE_URL}/magazine?page=${currentPage}` : `${BASE_URL}/magazine`,
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
    const next: Record<string, string> = page > 1 ? { page: String(page) } : {};
    if (searchQuery) next.q = searchQuery;
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    
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

      <main id="main-content" className="flex-1 py-12 px-4">
        <div className="container max-w-5xl mx-auto">
          {/* Page Header */}
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              자동차 매거진
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              자동차 구매 가이드, 유지비 절약 팁, 보험 정보까지 전문가가 알려드립니다
            </p>
            {/* Search bar */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="자동차 정보 검색..."
                aria-label="매거진 검색"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
              {searchInput && (
                <button
                  onClick={clearSearch}
                  aria-label="검색 지우기"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {isSearchMode && (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">"{searchQuery}"</span> 검색 결과{" "}
                {searchLoading ? "..." : `${searchResults.length}건`}
              </p>
            )}
          </header>

          {/* Posts Grid */}
          {isLoadingAny ? (
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
                {isSearchMode ? (
                  <Search className="w-10 h-10 text-muted-foreground" />
                ) : (
                  <Clock className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {isSearchMode ? `"${searchQuery}"에 대한 결과가 없습니다` : '아직 게시된 글이 없습니다'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isSearchMode ? '다른 검색어로 시도해보세요' : '곧 유용한 자동차 정보를 담은 콘텐츠가 업로드될 예정입니다'}
              </p>
              {isSearchMode ? (
                <button
                  onClick={clearSearch}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                >
                  전체 글 보기
                </button>
              ) : (
                <Link
                  to="/calculator"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  유지비 계산기 사용하기
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
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
                      <img
                        src={getPostThumbnailUrl(post.thumbnail_url, { width: 400 })}
                        srcSet={getResponsiveSrcSet(post.thumbnail_url, [320, 400, 640]) || undefined}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading={index < 3 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h2 className="font-bold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {stripMarkdown(post.excerpt)}
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

              {/* Pagination — hidden in search mode */}
              {!isSearchMode && totalPages > 1 && (
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
