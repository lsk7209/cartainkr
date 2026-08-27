const AD_ALLOWED_PATHS = ["/", "/blog", "/magazine", "/calculator"];
const AD_BLOCKED_PATHS = ["/about", "/contact", "/privacy", "/terms", "/admin"];

export function canLoadAds(pathname: string) {
  if (AD_BLOCKED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return false;
  }
  return AD_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function canLoadAffiliateBanner(pathname: string, hasConsent: boolean) {
  return hasConsent && canLoadAds(pathname);
}
