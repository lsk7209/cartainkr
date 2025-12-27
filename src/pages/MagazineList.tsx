import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO, generateCollectionPageSchema, generateBreadcrumbSchema } from "@/hooks/useSEO";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
}

const MagazineList = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Apply SEO meta tags
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://driveflow.co.kr';
  
  useSEO({
    title: '매거진 | DriveFlow Ads - 자동차 정보 플랫폼',
    description: '자동차 구매, 유지비, 보험 등 알아두면 유용한 정보를 전문가의 시선으로 전해드립니다. 최신 자동차 뉴스와 가이드를 확인하세요.',
    canonicalUrl: `${baseUrl}/magazine`,
    ogType: 'website',
  });

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug, excerpt, thumbnail_url, published_at")
        .order("published_at", { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data || []);
      }
      setIsLoading(false);
    };

    fetchPosts();
  }, []);

  // Generate structured data
  const structuredData = useMemo(() => {
    const data: object[] = [];
    
    // CollectionPage + ItemList schema
    const collectionSchema = generateCollectionPageSchema(
      '매거진 - DriveFlow Ads',
      '자동차 구매, 유지비, 보험 등 알아두면 유용한 정보를 전문가의 시선으로 전해드립니다.',
      `${baseUrl}/magazine`,
      posts.map(post => ({
        title: post.title,
        url: `${baseUrl}/magazine/${post.slug}`,
        image: post.thumbnail_url,
        description: post.excerpt,
        datePublished: post.published_at,
      }))
    );
    data.push(collectionSchema);
    
    // Breadcrumb schema
    data.push(generateBreadcrumbSchema([
      { name: '홈', url: baseUrl },
      { name: '매거진', url: `${baseUrl}/magazine` },
    ]));
    
    return data;
  }, [posts, baseUrl]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
              매거진
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              자동차 구매, 유지비, 보험 등 알아두면 유용한 정보를 전문가의 시선으로 전해드립니다
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
                        src={post.thumbnail_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading={index < 6 ? "eager" : "lazy"}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent">
                        <span className="text-4xl font-bold text-primary/30">D</span>
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
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MagazineList;
