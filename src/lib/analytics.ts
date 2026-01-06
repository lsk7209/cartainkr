declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = "G-69KWFZVNCQ";

// 기본 이벤트 전송
export const trackEvent = (
  eventName: string,
  parameters?: Record<string, string | number | boolean>
) => {
  if (window.gtag) {
    window.gtag("event", eventName, parameters);
  }
};

// 버튼 클릭 추적
export const trackButtonClick = (
  buttonName: string,
  location?: string
) => {
  trackEvent("button_click", {
    button_name: buttonName,
    location: location || "unknown",
  });
};

// 링크 클릭 추적
export const trackLinkClick = (
  linkName: string,
  destination: string
) => {
  trackEvent("link_click", {
    link_name: linkName,
    destination,
  });
};

// 폼 제출 추적
export const trackFormSubmit = (
  formName: string,
  success: boolean
) => {
  trackEvent("form_submit", {
    form_name: formName,
    success,
  });
};

// 페이지 스크롤 추적
export const trackScroll = (
  scrollDepth: number,
  pagePath: string
) => {
  trackEvent("scroll", {
    scroll_depth: scrollDepth,
    page_path: pagePath,
  });
};

// 외부 링크 클릭 추적
export const trackOutboundClick = (url: string) => {
  trackEvent("outbound_click", {
    url,
  });
};

// 검색 추적
export const trackSearch = (searchTerm: string) => {
  trackEvent("search", {
    search_term: searchTerm,
  });
};

// CTA 클릭 추적
export const trackCTAClick = (
  ctaName: string,
  ctaLocation: string
) => {
  trackEvent("cta_click", {
    cta_name: ctaName,
    cta_location: ctaLocation,
  });
};

// 콘텐츠 조회 추적
export const trackContentView = (
  contentType: string,
  contentId: string,
  contentTitle?: string
) => {
  trackEvent("content_view", {
    content_type: contentType,
    content_id: contentId,
    content_title: contentTitle || "",
  });
};

// 공유 추적
export const trackShare = (
  contentType: string,
  method: string,
  contentId?: string
) => {
  trackEvent("share", {
    content_type: contentType,
    method,
    item_id: contentId || "",
  });
};

// 계산기 사용 추적
export const trackCalculatorUse = (
  calculatorType: string,
  action: string
) => {
  trackEvent("calculator_use", {
    calculator_type: calculatorType,
    action,
  });
};
