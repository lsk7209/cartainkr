import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import {
  CONSENT_CHANGE_EVENT,
  getStoredMeasurementConsent,
  initializeAnalytics,
  storeMeasurementConsent,
} from "@/lib/analytics";

const updateConsent = (granted: boolean) => {
  if (typeof window.gtag !== "function") return;
  const status = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: status,
    analytics_storage: status,
    ad_user_data: status,
    ad_personalization: status,
  });
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredMeasurementConsent();
    if (stored === null) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
    // Re-apply stored consent on page load
    if (stored === "1") {
      updateConsent(true);
      initializeAnalytics();
    }
  }, []);

  const accept = () => {
    const persisted = storeMeasurementConsent(true);
    updateConsent(persisted);
    if (persisted) initializeAnalytics();
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: { granted: persisted } }));
    setVisible(false);
  };

  const decline = () => {
    storeMeasurementConsent(false);
    updateConsent(false);
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: { granted: false } }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="쿠키 사용 안내"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-card border border-border rounded-xl shadow-lg p-4 flex gap-3 items-start animate-fade-in"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium mb-1">쿠키 사용 안내</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          카테인은 서비스 개선 및 맞춤 광고 제공을 위해 쿠키를 사용합니다.{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            개인정보처리방침
          </Link>
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={accept}
            className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            동의합니다
          </button>
          <button
            onClick={decline}
            className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-md hover:bg-secondary/80 transition-colors"
          >
            거부
          </button>
        </div>
      </div>
      <button
        onClick={decline}
        aria-label="닫기"
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default CookieConsent;
