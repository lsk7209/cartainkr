import { hasMeasurementConsent } from "./analytics";
import { canLoadAds } from "./adPolicy";

const ADSENSE_CLIENT_ID = "ca-pub-3050601904412736";
const ADSENSE_SCRIPT_ID = "cartain-adsense-script";
const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;

export const ensureAdSenseScript = (pathname: string): boolean => {
  if (
    typeof document === "undefined" ||
    !hasMeasurementConsent() ||
    !canLoadAds(pathname) ||
    document.getElementById(ADSENSE_SCRIPT_ID)
  ) {
    return false;
  }
  const script = document.createElement("script");
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.src = ADSENSE_SRC;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
  return true;
};
