import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { canLoadAffiliateBanner } from "@/lib/adPolicy";
import { CONSENT_CHANGE_EVENT, hasMeasurementConsent } from "@/lib/analytics";

const DASHBOARD_BASE = "https://multi-dashboard-one.vercel.app";
const SITE_KEY = "cartain-2";
const SLOT_KEY = "coupang-inline";
const LABEL = "차량용 거치대";
const DISCLOSURE =
  "이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";
export default function CoupangAffiliateBanner() {
  const location = useLocation();
  const [hasConsent, setHasConsent] = useState(hasMeasurementConsent);
  const pathname = location.pathname || "/";

  useEffect(() => {
    const syncConsent = () => setHasConsent(hasMeasurementConsent());
    window.addEventListener(CONSENT_CHANGE_EVENT, syncConsent);
    window.addEventListener("storage", syncConsent);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  if (!canLoadAffiliateBanner(pathname, hasConsent)) return null;

  const params = new URLSearchParams({
    siteKey: SITE_KEY,
    slotKey: SLOT_KEY,
    purpose: "public",
    pageUrl: `https://cartain.kr${pathname}`,
  });

  return (
    <div data-banner-measurement data-banner-measurement-base={DASHBOARD_BASE} data-banner-site-key={SITE_KEY} data-banner-slot-key={SLOT_KEY}>
    <aside aria-label="쿠팡 파트너스 추천" style={{ margin: "24px auto", maxWidth: 960, padding: "0 16px" }}>
      <a href={`${DASHBOARD_BASE}/api/banner-management/click?${params.toString()}`} target="_blank" rel="sponsored nofollow noopener noreferrer" style={{ alignItems: "center", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, color: "#111827", display: "flex", gap: 12, justifyContent: "center", minHeight: 92, padding: 12, textDecoration: "none" }}>
        <span style={{ color: "#9a3412", fontSize: 12, fontWeight: 700 }}>광고</span>
        <img src={`${DASHBOARD_BASE}/api/banner-management/image?${params.toString()}`} alt={`쿠팡에서 ${LABEL} 보기`} width={728} height={90} loading="lazy" style={{ borderRadius: 6, display: "block", height: "auto", maxWidth: "100%" }} />
      </a>
      <p style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.5, margin: "8px 0 0" }}>{DISCLOSURE}</p>
    </aside>
    <script src={`${DASHBOARD_BASE}/banner-measurement.js`} defer />
    </div>
  );
}
