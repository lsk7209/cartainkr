import { next, rewrite } from "@vercel/edge";

/**
 * 봇/크롤러 요청을 SSR 함수(/api/ssr)로 넘기는 Edge Middleware.
 *
 * vercel.json의 `has: user-agent` 정규식은 AdSense 크롤러(Mediapartners-Google)처럼
 * 대문자가 섞인 UA를 안정적으로 못 잡았다. 여기서는 JS 정규식 `i` 플래그로 확실히 판별한다.
 * 봇이면 원본 경로를 ?p= 로 실어 /api/ssr로 rewrite, 사람은 그대로 SPA로 통과.
 */

const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|adsbot|googlebot|bingbot|chatgpt|google-extended|anthropic-ai|oai-search|yeti|daum|naver|facebookexternalhit|twitterbot|whatsapp|telegram|slack|discord|embedly|lighthouse|inspectiontool/i;
const CARTAIN_READ_ORIGIN = "https://cartain-site.item79.com";
const DYNAMIC_READ_PATHS = new Set(["/sitemap.xml", "/rss.xml", "/feed.xml", "/feed"]);
const STATIC_READ_PATHS = new Set(["/", "/magazine", "/about", "/contact", "/privacy", "/terms", "/calculator", "/favicon.ico"]);

export const config = {
  matcher: [
    "/",
    "/magazine",
    "/magazine/:path*",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/calculator",
    "/api/posts/:path*",
    "/sitemap.xml",
    "/rss.xml",
    "/feed.xml",
    "/feed",
    "/assets/:path*",
    "/favicon.ico",
  ],
};

export default function middleware(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return next();
  const url = new URL(request.url);
  if (url.hostname === "www.cartain.kr") return next();
  if (url.pathname === "/api/posts" || url.pathname.startsWith("/api/posts/") || DYNAMIC_READ_PATHS.has(url.pathname)) {
    return rewrite(new URL(url.pathname + url.search, CARTAIN_READ_ORIGIN));
  }
  const ua = request.headers.get("user-agent") || "";
  if (BOT_UA.test(ua)) return rewrite(new URL(url.pathname + url.search, CARTAIN_READ_ORIGIN));
  if (STATIC_READ_PATHS.has(url.pathname) || url.pathname.startsWith("/assets/")) {
    return rewrite(new URL(url.pathname + url.search, CARTAIN_READ_ORIGIN));
  }
  return next();
}
