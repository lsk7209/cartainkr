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
    setMeta('og:site_name', '카테인', true);
    setMeta('og:locale', 'ko_KR', true);
    if (ogImage) {
      setMeta('og:image', ogImage, true);
      setMeta('og:image:alt', title, true);
      setMeta('og:image:width', '1200', true);
      setMeta('og:image:height', '630', true);
      setMeta('og:image:type', 'image/jpeg', true);
    }
    if (canonicalUrl) {
      setMeta('og:url', canonicalUrl, true);
    }

    // Twitter Card tags
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:site', '@cartain_kr');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    if (ogImage) {
      setMeta('twitter:image', ogImage);
      setMeta('twitter:image:alt', title);
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

    // Cleanup: reset title and remove transient link/meta tags on unmount
    return () => {
      document.title = '카테인 - 자동차 정보 플랫폼';
      // Remove canonical so it doesn't bleed into pages that don't set one
      document.querySelector('link[rel="canonical"]')?.remove();
      // Reset og:url and og:type to safe defaults
      document.querySelector('meta[property="og:url"]')?.remove();
      document.querySelector('meta[property="og:type"]')?.remove();
      // Remove article-specific meta tags
      ['article:published_time', 'article:modified_time', 'article:author'].forEach((prop) => {
        document.querySelector(`meta[property="${prop}"]`)?.remove();
      });
    };
  }, [title, description, canonicalUrl, ogImage, ogType, publishedAt, modifiedAt, author, keywords]);

  // Remove og:image tags when the current page doesn't supply one
  useEffect(() => {
    if (!ogImage) {
      document.querySelectorAll('meta[property="og:image"], meta[property="og:image:alt"], meta[name="twitter:image"], meta[name="twitter:image:alt"]')
        .forEach(el => el.remove());
    }
  }, [ogImage]);
};

// JSON-LD structured data helpers
export const generateArticleSchema = (post: {
  title: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string;
  updated_at?: string | null;
  slug: string;
  content_html?: string | null;
}) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cartain.kr';
  const articleUrl = `${baseUrl}/magazine/${post.slug}`;

  // Estimate word count from HTML content for EEAT signal
  const wordCount = post.content_html
    ? Math.round(post.content_html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().split(' ').length)
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': articleUrl,
    headline: post.title,
    description: post.excerpt || post.title,
    articleSection: '자동차',
    ...(wordCount ? { wordCount } : {}),
    image: {
      '@type': 'ImageObject',
      url: post.thumbnail_url || `${baseUrl}/og-image.png`,
      width: 1200,
      height: 630,
    },
    url: articleUrl,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    inLanguage: 'ko-KR',
    author: {
      '@type': 'Person',
      name: '카테인 에디터',
      url: `${baseUrl}/about`,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: '카테인',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      name: '카테인',
      url: baseUrl,
    },
    about: {
      '@type': 'Thing',
      name: '자동차',
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'h2', 'article > p:first-of-type'],
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
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cartain.kr';
  
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
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cartain.kr';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    name: '카테인',
    url: baseUrl,
    description: '자동차 구매, 유지비, 세금 계산 등 스마트한 자동차 정보를 제공합니다.',
    inLanguage: 'ko-KR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/magazine?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'h2', '.speakable'],
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: '카테인',
      url: baseUrl,
    },
  };
};

// Organization schema
export const generateOrganizationSchema = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cartain.kr';

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: '카테인',
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/og-image.png`,
      width: 1200,
      height: 630,
    },
    description: '자동차 구매, 유지비, 세금 계산 등 스마트한 자동차 정보를 제공하는 전문 플랫폼입니다.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@cartain.kr',
      contactType: 'customer service',
      availableLanguage: ['Korean'],
    },
    sameAs: [
      'https://twitter.com/cartain_kr',
    ],
  };
};

// Person schema for author EEAT signal
export const generateAuthorSchema = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cartain.kr';

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${baseUrl}/#author`,
    name: '카테인 에디터',
    url: `${baseUrl}/about`,
    worksFor: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: '카테인',
    },
    knowsAbout: ['자동차', '자동차 구매', '자동차 보험', '자동차 유지비', '자동차세', '중고차', '전기차'],
  };
};

// HowTo schema for step-by-step calculator guides (AEO)
export const generateHowToSchema = (url: string) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '자동차 유지비 계산하는 방법',
    description: '차량 가격, 할부 조건, 연비, 보험료를 입력하면 월 유지비를 자동으로 계산해드립니다.',
    url,
    totalTime: 'PT2M',
    tool: [{ '@type': 'HowToTool', name: '카테인 자동차 유지비 계산기' }],
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: '차종 선택',
        text: '경차, 소형차, 중형차, 대형차, SUV, 전기차 중 차종을 선택하거나 직접 차량 가격을 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: '할부 조건 입력',
        text: '할부 기간(개월)과 할부 금리(%)를 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: '연비 정보 입력',
        text: '차량의 연비(km/L), 월 주행거리(km), 현재 유가(원/L)를 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: '보험료 입력',
        text: '월 자동차 보험료를 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: '결과 확인',
        text: '할부금·유류비·보험료·자동차세가 포함된 월 총 유지비와 연간 유지비를 확인합니다.',
      },
    ],
  };
};

// SoftwareApplication schema for calculator/tools
export const generateSoftwareApplicationSchema = (
  name: string,
  description: string,
  url: string
) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cartain.kr';
  
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

// WebPage schema for static informational pages (About, Privacy, Terms, Contact)
export const generateWebPageSchema = (
  name: string,
  description: string,
  url: string,
  pageType: 'WebPage' | 'AboutPage' | 'ContactPage' = 'WebPage'
) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cartain.kr';

  return {
    '@context': 'https://schema.org',
    '@type': pageType,
    name,
    description,
    url,
    inLanguage: 'ko-KR',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      name: '카테인',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: '카테인',
      url: baseUrl,
    },
  };
};
