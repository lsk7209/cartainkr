import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  publishedAt?: string;
  modifiedAt?: string;
  author?: string;
  keywords?: string[];
}

export const useSEO = ({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  publishedAt,
  modifiedAt,
  author,
  keywords,
}: SEOProps) => {
  useEffect(() => {
    // Update title
    document.title = title;

    // Helper to update or create meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.content = content;
    };

    // Basic meta tags
    setMeta('description', description);
    if (keywords?.length) {
      setMeta('keywords', keywords.join(', '));
    }
    if (author) {
      setMeta('author', author);
    }

    // Open Graph tags
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', ogType, true);
    if (ogImage) {
      setMeta('og:image', ogImage, true);
    }
    if (canonicalUrl) {
      setMeta('og:url', canonicalUrl, true);
    }

    // Twitter Card tags
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    if (ogImage) {
      setMeta('twitter:image', ogImage);
    }

    // Article specific tags
    if (ogType === 'article') {
      if (publishedAt) {
        setMeta('article:published_time', publishedAt, true);
      }
      if (modifiedAt) {
        setMeta('article:modified_time', modifiedAt, true);
      }
      if (author) {
        setMeta('article:author', author, true);
      }
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonicalUrl) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = canonicalUrl;
    }

    // Cleanup function to reset to defaults
    return () => {
      document.title = '카테인 - 자동차 정보 플랫폼';
    };
  }, [title, description, canonicalUrl, ogImage, ogType, publishedAt, modifiedAt, author, keywords]);
};

// JSON-LD structured data helpers
export const generateArticleSchema = (post: {
  title: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
  slug: string;
}) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catein.kr';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.thumbnail_url || `${baseUrl}/og-image.png`,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      '@type': 'Organization',
      name: '카테인',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: '카테인',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/favicon.ico`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/magazine/${post.slug}`,
    },
  };
};

export const generateFAQSchema = (faqs: { question: string; answer: string }[]) => {
  if (!faqs.length) return null;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
};

export const generateBreadcrumbSchema = (items: { name: string; url: string }[]) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

// CollectionPage schema for list pages
export const generateCollectionPageSchema = (
  name: string,
  description: string,
  url: string,
  items: {
    title: string;
    url: string;
    image?: string | null;
    description?: string | null;
    datePublished?: string;
  }[]
) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catein.kr';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    publisher: {
      '@type': 'Organization',
      name: '카테인',
      url: baseUrl,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Article',
          name: item.title,
          url: item.url,
          ...(item.image && { image: item.image }),
          ...(item.description && { description: item.description }),
          ...(item.datePublished && { datePublished: item.datePublished }),
        },
      })),
    },
  };
};

// WebSite schema for homepage
export const generateWebSiteSchema = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catein.kr';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '카테인',
    url: baseUrl,
    description: '자동차 구매, 유지비, 세금 계산 등 스마트한 자동차 정보를 제공합니다.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/magazine?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: '카테인',
      url: baseUrl,
    },
  };
};

// Organization schema
export const generateOrganizationSchema = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catein.kr';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '카테인',
    url: baseUrl,
    logo: `${baseUrl}/favicon.ico`,
    description: '자동차 구매, 유지비, 세금 계산 등 스마트한 자동차 정보를 제공하는 전문 플랫폼입니다.',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Korean'],
    },
  };
};

// SoftwareApplication schema for calculator/tools
export const generateSoftwareApplicationSchema = (
  name: string,
  description: string,
  url: string
) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catein.kr';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    provider: {
      '@type': 'Organization',
      name: '카테인',
      url: baseUrl,
    },
    featureList: [
      '자동차 할부금 계산',
      '월 유지비 분석',
      '연간 비용 예측',
      '차종별 비교 분석',
    ],
    inLanguage: 'ko-KR',
  };
};
