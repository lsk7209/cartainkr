import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Clock, User, ArrowLeft, Share2 } from "lucide-react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RelatedPosts from "@/components/RelatedPosts";
import JsonLd from "@/components/JsonLd";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO, generateArticleSchema, generateFAQSchema, generateBreadcrumbSchema } from "@/hooks/useSEO";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

// Safe HTML tags and attributes for blog content (defense-in-depth)
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'article', 'section', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'div', 'span', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'details', 'summary', 'a', 'br', 'hr', 'img'
  ],
  ALLOWED_ATTR: ['class', 'id', 'href', 'target', 'rel', 'src', 'alt'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
};

interface Post {
  id: string;
  title: string;
  slug: string;
  content_html: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
}

// Extract FAQ from HTML content
const extractFAQs = (html: string): { question: string; answer: string }[] => {
  const faqs: { question: string; answer: string }[] = [];
  
  // Match <details><summary>question</summary>answer</details> pattern
  const detailsRegex = /<details[^>]*>\s*<summary[^>]*>(.*?)<\/summary>\s*(?:<div[^>]*>)?([\s\S]*?)(?:<\/div>)?\s*<\/details>/gi;
  let match;
  
  while ((match = detailsRegex.exec(html)) !== null) {
    const question = match[1].replace(/<[^>]*>/g, '').trim();
    const answer = match[2].replace(/<[^>]*>/g, '').trim();
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }
  
  return faqs;
};

const MagazineDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error("Error fetching post:", error);
        setNotFound(true);
      } else if (!data) {
        setNotFound(true);
      } else {
        setPost(data);
      }
      setIsLoading(false);
    };

    fetchPost();
  }, [slug]);

  // Sanitize HTML content on the client-side as defense-in-depth
  const sanitizedContent = useMemo(() => {
    if (!post?.content_html) return '';
    return DOMPurify.sanitize(post.content_html, SANITIZE_CONFIG);
  }, [post?.content_html]);

  // Extract FAQs for structured data
  const faqs = useMemo(() => {
    if (!post?.content_html) return [];
    return extractFAQs(post.content_html);
  }, [post?.content_html]);

  // Generate canonical URL
  const canonicalUrl = useMemo(() => {
    if (!post?.slug) return undefined;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catein.kr';
    return `${baseUrl}/magazine/${post.slug}`;
  }, [post?.slug]);

  // Apply SEO meta tags
  useSEO({
    title: post ? `${post.title} | 카테인` : '카테인 - 자동차 정보 플랫폼',
    description: post?.excerpt || post?.title || '자동차 정보, 비용 분석, 유지비 계산 등 스마트한 자동차 정보를 제공합니다.',
    canonicalUrl,
    ogImage: post?.thumbnail_url || undefined,
    ogType: 'article',
    publishedAt: post?.published_at,
    author: '카테인',
  });

  // Generate structured data
  const structuredData = useMemo(() => {
    if (!post) return [];
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catein.kr';
    const data: object[] = [];
    
    // Article schema
    data.push(generateArticleSchema(post));
    
    // FAQ schema (if FAQs exist)
    const faqSchema = generateFAQSchema(faqs);
    if (faqSchema) {
      data.push(faqSchema);
    }
    
    // Breadcrumb schema
    data.push(generateBreadcrumbSchema([
      { name: '홈', url: baseUrl },
      { name: '매거진', url: `${baseUrl}/magazine` },
      { name: post.title, url: `${baseUrl}/magazine/${post.slug}` },
    ]));
    
    return data;
  }, [post, faqs]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const estimateReadTime = (html: string) => {
    const text = html.replace(/<[^>]*>/g, "");
    const words = text.length;
    const minutes = Math.ceil(words / 500); // Korean: ~500 chars per minute
    return `${minutes}분 소요`;
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post?.title,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("링크가 복사되었습니다");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-12 px-4">
          <article className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <Skeleton className="aspect-video w-full mb-8 rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </article>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-20 px-4">
          <div className="container max-w-3xl mx-auto text-center">
            <div className="bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📄</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              글을 찾을 수 없습니다
            </h1>
            <p className="text-muted-foreground mb-8">
              요청하신 글이 존재하지 않거나 삭제되었을 수 있습니다
            </p>
            <Link
              to="/magazine"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              매거진 목록으로
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Structured Data for SEO */}
      <JsonLd data={structuredData} />
      
      <Header />

      <main className="flex-1 py-12 px-4">
        <article className="max-w-3xl mx-auto">
          {/* Back Link */}
          <Link
            to="/magazine"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            매거진 목록
          </Link>

          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>카테인 에디터</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{estimateReadTime(post.content_html)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                공유
              </Button>
            </div>
          </header>

          {/* Thumbnail */}
          {post.thumbnail_url && (
            <figure className="aspect-video rounded-xl overflow-hidden mb-8">
              <img
                src={getOptimizedImageUrl(post.thumbnail_url, { width: 800 }) || post.thumbnail_url}
                alt={post.title}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </figure>
          )}

          {/* Article Content - sanitized client-side for defense-in-depth */}
          <div
            className="magazine-body max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {/* Article Footer */}
          <footer className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                to="/magazine"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                다른 글 보기
              </Link>
              <Button
                variant="outline"
                onClick={handleShare}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                이 글 공유하기
              </Button>
            </div>
          </footer>

          {/* Related Posts */}
          <RelatedPosts currentPostId={post.id} limit={4} />
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default MagazineDetail;
