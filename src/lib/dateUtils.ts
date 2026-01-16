/**
 * 날짜 관련 유틸리티 함수
 */

export type DateFormatStyle = 'full' | 'short' | 'monthDay';

/**
 * 날짜 문자열을 한국어 포맷으로 변환
 * @param dateString - ISO 형식 날짜 문자열
 * @param style - 포맷 스타일 (full: 2024년 1월 15일, short: 2024년 1월 15일, monthDay: 1월 15일)
 */
export const formatDate = (dateString: string, style: DateFormatStyle = 'full'): string => {
  const date = new Date(dateString);
  
  switch (style) {
    case 'monthDay':
      return date.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      });
    case 'short':
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    case 'full':
    default:
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  }
};

/**
 * HTML 콘텐츠의 읽기 시간 추정 (한국어 기준)
 * @param html - HTML 문자열
 * @returns 예: "3분 소요"
 */
export const estimateReadTime = (html: string): string => {
  const text = html.replace(/<[^>]*>/g, "");
  const chars = text.length;
  const minutes = Math.ceil(chars / 500); // 한국어: 분당 약 500자
  return `${minutes}분 소요`;
};
