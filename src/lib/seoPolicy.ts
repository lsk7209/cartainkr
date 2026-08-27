export const DEFAULT_ROBOTS_DIRECTIVE =
  "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

export const resolveRobotsDirective = (value?: string): string =>
  value?.trim() || DEFAULT_ROBOTS_DIRECTIVE;

export const normalizeMagazineSearchQuery = (value?: string | null): string =>
  (value ?? "").trim().slice(0, 100);

export const normalizeMagazinePage = (value?: string | number | null): number => {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) ? Math.min(1000, Math.max(1, Math.trunc(parsed))) : 1;
};

export const getMagazineSeoPolicy = (
  baseUrl: string,
  searchQuery: string,
  page: number,
) => {
  const query = normalizeMagazineSearchQuery(searchQuery);
  const normalizedPage = normalizeMagazinePage(page);
  const isSearch = query.length >= 2;

  return {
    isSearch,
    title: isSearch
      ? `"${query}" 검색 결과 | 카테인 매거진`
      : normalizedPage > 1
        ? `자동차 매거진 ${normalizedPage}페이지 | 카테인`
        : "자동차 매거진 | 카테인",
    description:
      "신차·중고차 구매 가이드부터 자동차세·보험료 확인 방법과 연비 비교까지, 자동차 비용 판단에 필요한 기준과 공식 확인 경로를 정리합니다.",
    canonicalUrl: isSearch
      ? `${baseUrl}/magazine`
      : normalizedPage > 1
        ? `${baseUrl}/magazine?page=${normalizedPage}`
        : `${baseUrl}/magazine`,
    robots: isSearch ? "noindex, follow" : DEFAULT_ROBOTS_DIRECTIVE,
  };
};
