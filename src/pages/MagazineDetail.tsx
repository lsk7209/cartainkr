import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, User, ArrowLeft, Share2, Calculator } from "lucide-react";
import DOMPurify from "dompurify";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RelatedPosts from "@/components/RelatedPosts";
import JsonLd from "@/components/JsonLd";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO, generateArticleSchema, generateFAQSchema, generateBreadcrumbSchema } from "@/hooks/useSEO";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { formatDate, estimateReadTime } from "@/lib/dateUtils";
import { buildToc } from "@/lib/tocUtils";
import { markdownToHtml, stripMarkdown } from "@/lib/textUtils";
import { BASE_URL } from "@/lib/constants";
import type { PostDetail } from "@/types/post";
import AdSenseAd from "@/components/AdSenseAd";
import TableOfContents from "@/components/TableOfContents";
import ReadingProgress from "@/components/ReadingProgress";

// Enforce secure attributes via DOMPurify hook (runs once at module load)
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href') || '';
    if (href.startsWith('http') || href.startsWith('//')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  }
  if (node.tagName === 'IMG') {
    if (!node.getAttribute('loading')) node.setAttribute('loading', 'lazy');
    if (!node.getAttribute('decoding')) node.setAttribute('decoding', 'async');
  }
});

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
  const navigate = useNavigate();
  const articleRef = useRef<HTMLDivElement>(null);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Intercept internal links in generated content to use React Router navigation
  const handleArticleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a');
    if (!target) return;
    const href = target.getAttribute('href');
    if (!href) return;
    const isInternal = href.startsWith('/') && !href.startsWith('//');
    if (isInternal) {
      e.preventDefault();
      navigate(href);
    }
  }, [navigate]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const data = await api.posts.get(slug).catch((err) => {
        if (err.message?.includes('404')) return null;
        console.error("Error fetching post:", err);
        return null;
      });

      if (!data) {
        setNotFound(true);
      } else {
        setPost(data);
      }
      setIsLoading(false);
    };

    fetchPost();
  }, [slug]);

  // Build TOC and inject heading IDs, then sanitize
  const { sanitizedContent, toc } = useMemo(() => {
    if (!post?.content_html) return { sanitizedContent: '', toc: [] };
    const converted = markdownToHtml(post.content_html);
    const { html: htmlWithIds, toc: tocItems } = buildToc(converted);
    const sanitized = DOMPurify.sanitize(htmlWithIds, SANITIZE_CONFIG);
    return { sanitizedContent: sanitized, toc: tocItems };
  }, [post?.content_html]);

  // Extract FAQs for structured data
  const faqs = useMemo(() => {
    if (!post?.content_html) return [];
    return extractFAQs(post.content_html);
  }, [post?.content_html]);

  // Generate canonical URL
  const canonicalUrl = useMemo(() => {
    if (!post?.slug) return undefined;
    return `${BASE_URL}/magazine/${post.slug}`;
  }, [post?.slug]);

  // Apply SEO meta tags - 키워드를 title 앞쪽에 배치
  useSEO({
    title: post ? `${post.title} - 자동차 정보 | 카테인` : '자동차 정보 플랫폼 | 카테인',
    description: post?.excerpt ? stripMarkdown(post.excerpt) : (post?.title || '자동차 구매 가이드, 유지비 계산, 보험 정보 등 실용적인 자동차 정보를 제공합니다.'),
    canonicalUrl,
    ogImage: post?.thumbnail_url || undefined,
    ogType: 'article',
    publishedAt: post?.published_at,
    modifiedAt: post?.updated_at || post?.published_at,
    author: '카테인',
    keywords: ['자동차', '자동차 정보', '자동차 유지비', '자동차 구매'],
  });

  // Generate structured data
  const structuredData = useMemo(() => {
    if (!post) return [];
    
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
      { name: '홈', url: BASE_URL },
      { name: '매거진', url: `${BASE_URL}/magazine` },
      { name: post.title, url: `${BASE_URL}/magazine/${post.slug}` },
    ]));
    
    return data;
  }, [post, faqs]);

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
      <ReadingProgress />
      {/* Structured Data for SEO */}
      <JsonLd data={structuredData} />
      
      <Header />

      <main id="main-content" className="flex-1 py-12 px-4">
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
                  <Link to="/about" className="hover:text-primary transition-colors">카테인 에디터</Link>
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

          {/* Table of Contents — shown for articles with 3+ headings */}
          <TableOfContents items={toc} />

          {/* Article Content - sanitized client-side for defense-in-depth */}
          <div className="magazine-body max-w-none" ref={articleRef} onClick={handleArticleClick}>
            <article className="pl-4 md:pl-5" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
          </div>

          {/* Mid-article ad — slot ID to be filled after AdSense approval */}
          <AdSenseAd format="auto" className="my-8" />

          {/* CTA Section - 내부 링크 & 행동 유도 */}
          <div className="my-10 p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
            <h3 className="text-lg font-bold text-foreground mb-3">
              💡 이 글이 도움이 되셨나요?
            </h3>
            <p className="text-muted-foreground mb-4">
              카테인에서는 자동차 구매와 유지에 필요한 다양한 정보를 제공합니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/calculator"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Calculator className="w-4 h-4" />
                유지비 계산하기
              </Link>
              <Link
                to="/magazine"
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                더 많은 글 보기
              </Link>
            </div>
          </div>

          {/* 관련 내부 링크 섹션 */}
          <nav className="my-8 p-5 bg-muted/50 rounded-lg" aria-label="관련 콘텐츠">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">📚 함께 읽으면 좋은 콘텐츠</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/calculator" className="text-primary hover:underline">
                  → 자동차 유지비 계산기로 월 비용 확인하기
                </Link>
              </li>
              <li>
                <Link to="/magazine" className="text-primary hover:underline">
                  → 최신 자동차 구매 가이드 & 유지비 정보 보기
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-primary hover:underline">
                  → 카테인 소개 및 서비스 알아보기
                </Link>
              </li>
            </ul>
          </nav>

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
          <RelatedPosts currentPostId={post.id} currentTitle={post.title} limit={4} />
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default MagazineDetail;