declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = "G-N7JJFW6007";
const GA_SCRIPT_ID = "cartain-google-analytics";
export const CONSENT_STORAGE_KEY = "cartain_cookie_consent";
export const CONSENT_CHANGE_EVENT = "cartain:consent-change";

export const getStoredMeasurementConsent = (): "1" | "0" | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "1" || value === "0" ? value : null;
  } catch {
    return null;
  }
};

export const storeMeasurementConsent = (granted: boolean): boolean => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, granted ? "1" : "0");
    return true;
  } catch {
    return false;
  }
};

export const hasMeasurementConsent = () => getStoredMeasurementConsent() === "1";

export const initializeAnalytics = () => {
  if (!hasMeasurementConsent() || document.getElementById(GA_SCRIPT_ID)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
  window.gtag("consent", "update", {
    ad_storage: "granted",
    analytics_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false,
  });

  const script = document.createElement("script");
  script.id = GA_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
};

export const trackPageView = (pagePath: string) => {
  if (!hasMeasurementConsent()) return;
  initializeAnalytics();
  if (!window.gtag) return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: pagePath });
};

// 기본 이벤트 전송
export const trackEvent = (
  eventName: string,
  parameters?: Record<string, string | number | boolean>
) => {
  if (hasMeasurementConsent() && window.gtag) {
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

export const trackPrimaryConversion = (
  mode: "single" | "compare",
  resultCount: number,
) => {
  trackEvent("calculator_completed", {
    calculator_mode: mode,
    result_count: resultCount,
  });
};
