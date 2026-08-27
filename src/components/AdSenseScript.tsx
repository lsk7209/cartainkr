import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CONSENT_CHANGE_EVENT } from "@/lib/analytics";
import { ensureAdSenseScript } from "@/lib/adScripts";

const AdSenseScript = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const loadAds = () => {
      ensureAdSenseScript(pathname);
    };

    loadAds();
    window.addEventListener(CONSENT_CHANGE_EVENT, loadAds);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, loadAds);
  }, [pathname]);

  return null;
};

export default AdSenseScript;
