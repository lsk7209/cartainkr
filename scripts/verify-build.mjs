import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SITE_ORIGIN = "https://cartain.kr";
const ROUTES = ["/", "/calculator", "/magazine", "/about", "/contact", "/privacy", "/terms"];
const FORBIDDEN_PRECONSENT_ORIGINS = [
  "googletagmanager.com",
  "googlesyndication.com",
  "multi-dashboard-one.vercel.app",
];

function readRouteHtml(route) {
  const relativePath = route === "/" ? "index.html" : `${route.slice(1)}/index.html`;
  return readFileSync(resolve("dist", relativePath), "utf8");
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const route of ROUTES) {
  const html = readRouteHtml(route);
  const expectedUrl = `${SITE_ORIGIN}${route === "/" ? "" : route}`;

  assert(countMatches(html, /<h1(?:\s|>)/gi) === 1, `${route}: expected exactly one h1`);
  assert(
    html.includes(`<link rel="canonical" href="${expectedUrl}"`),
    `${route}: canonical does not match ${expectedUrl}`,
  );
  assert(
    html.includes(`<link rel="alternate" hreflang="ko" href="${expectedUrl}"`),
    `${route}: ko hreflang does not match ${expectedUrl}`,
  );
  assert(
    html.includes('name="robots" content="index, follow'),
    `${route}: expected index, follow robots metadata`,
  );

  for (const origin of FORBIDDEN_PRECONSENT_ORIGINS) {
    assert(!html.includes(origin), `${route}: pre-consent third-party request found for ${origin}`);
  }
}

const privacyHtml = readRouteHtml("/privacy");
for (const disclosure of ["Google Analytics", "Google AdSense", "쿠팡", "Supabase", "jsDelivr"]) {
  assert(privacyHtml.includes(disclosure), `/privacy: missing ${disclosure} disclosure`);
}

const robots = readFileSync(resolve("dist", "robots.txt"), "utf8");
for (const directive of ["Disallow: /admin", "Sitemap: https://cartain.kr/sitemap.xml"]) {
  assert(robots.includes(directive), `robots.txt: missing ${directive}`);
}
assert(
  countMatches(robots, /^Disallow: \/admin$/gm) === 11,
  "robots.txt: every indexable crawler group must block /admin",
);

console.log(`Build artifact verification passed for ${ROUTES.length} routes.`);
