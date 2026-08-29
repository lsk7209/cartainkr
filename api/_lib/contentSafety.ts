import path from "node:path";
import sanitizeHtml from "sanitize-html";

const ARTICLE_TAGS = [
  "article",
  "section",
  "header",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "span",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "blockquote",
  "details",
  "summary",
  "a",
  "br",
  "hr",
  "img",
];

export const PUBLIC_POST_INTEGRITY_SQL = [
  "instr(COALESCE(title, ''), char(65533)) = 0",
  "instr(COALESCE(excerpt, ''), char(65533)) = 0",
  "instr(COALESCE(content_html, ''), char(65533)) = 0",
].join(" AND ");

export const hasEncodingCorruption = (
  ...values: Array<string | null | undefined>
): boolean =>
  values.some(
    (value) => typeof value === "string" && value.includes("\uFFFD"),
  );

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const escapeAttribute = (value: string): string =>
  escapeHtml(value).replace(/[\r\n\t]+/g, " ");

export const replaceCapturedValue = (
  html: string,
  pattern: RegExp,
  value: string,
): string =>
  html.replace(pattern, (_match, prefix: string) => `${prefix}${value}`);

export const sanitizeArticleHtml = (value: string): string =>
  sanitizeHtml(value, {
    allowedTags: ARTICLE_TAGS,
    allowedAttributes: {
      "*": ["class", "id"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "loading", "decoding", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      h1: "h2",
      a: (tagName, attributes) => {
        const next = { ...attributes };
        if (next.target === "_blank") {
          next.rel = "noopener noreferrer";
        } else {
          delete next.target;
        }
        return { tagName, attribs: next };
      },
      img: (tagName, attributes) => ({
        tagName,
        attribs: {
          ...attributes,
          loading: "lazy",
          decoding: "async",
        },
      }),
    },
  });

export const toSafeAbsoluteHttpUrl = (
  value: string | null | undefined,
  baseUrl: string,
): string | null => {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim(), baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
};

export const toSafeSiteOrigin = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/") return null;
    return url.origin;
  } catch {
    return null;
  }
};

export type SafeArticleSlug = {
  decoded: string;
  urlSegment: string;
};

export const parseArticleSlug = (value: string): SafeArticleSlug | null => {
  const raw = value.trim();
  if (!raw || raw.length > 600) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw).normalize("NFC");
  } catch {
    return null;
  }

  const hasControlCharacter = Array.from(decoded).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });

  if (
    !decoded ||
    decoded.length > 180 ||
    decoded === "." ||
    decoded === ".." ||
    hasControlCharacter ||
    /[\\/?#]/.test(decoded)
  ) {
    return null;
  }

  return { decoded, urlSegment: encodeURIComponent(decoded) };
};

export const resolveArticleOutputDirectory = (
  distDirectory: string,
  slug: string,
): { directory: string; slug: SafeArticleSlug } | null => {
  const safeSlug = parseArticleSlug(slug);
  if (!safeSlug) return null;

  const articleRoot = path.resolve(distDirectory, "magazine");
  const directory = path.resolve(articleRoot, safeSlug.urlSegment);
  if (!directory.startsWith(`${articleRoot}${path.sep}`)) return null;

  return { directory, slug: safeSlug };
};
