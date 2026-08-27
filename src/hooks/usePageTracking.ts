import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  CONSENT_CHANGE_EVENT,
  trackPageView,
} from "@/lib/analytics";

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const sendPageView = () => {
      trackPageView(location.pathname + location.search);
    };

    const handleConsentChange = (event: Event) => {
      if ((event as CustomEvent<{ granted: boolean }>).detail?.granted) sendPageView();
    };

    sendPageView();
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
  }, [location]);
};
