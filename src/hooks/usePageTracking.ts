import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA_MEASUREMENT_ID = "G-N7JJFW6007";

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Don't send page views if user explicitly declined
    const consent = localStorage.getItem("cartain_cookie_consent");
    if (consent === "0") return;

    if (window.gtag) {
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
};
