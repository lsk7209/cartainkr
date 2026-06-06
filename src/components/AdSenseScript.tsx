import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ADSENSE_CLIENT_ID = "ca-pub-3050601904412736";
const ADSENSE_SCRIPT_ID = "cartain-adsense-script";
const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;

const AD_ALLOWED_PATHS = ["/", "/magazine", "/calculator"];
const AD_BLOCKED_PATHS = ["/about", "/contact", "/privacy", "/terms", "/admin"];

function canLoadAds(pathname: string) {
  if (AD_BLOCKED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return false;
  }

  return AD_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const AdSenseScript = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!canLoadAds(pathname) || document.getElementById(ADSENSE_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement("script");
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.src = ADSENSE_SRC;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [pathname]);

  return null;
};

export default AdSenseScript;
