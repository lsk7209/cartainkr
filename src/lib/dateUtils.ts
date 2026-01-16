/**
 * 날짜 관련 유틸리티 함수
 */

export type DateFormatStyle = 'full' | 'short' | 'monthDay' | 'datetime' | 'compact';

/**
 * 날짜 문자열을 한국어 포맷으로 변환
 * @param dateString - ISO 형식 날짜 문자열 또는 Date 객체
 * @param style - 포맷 스타일
 *   - full: 2024년 1월 15일
 *   - short: 2024년 1월 15일
 *   - monthDay: 1월 15일
 *   - datetime: 2024년 01월 15일 14:30
 *   - compact: 01/15
 */
export const formatDate = (dateString: string | Date, style: DateFormatStyle = 'full'): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
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
    case 'datetime':
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).replace(/\. /g, '년 ').replace('.', '일').replace(/(\d{2}):(\d{2})/, ' $1:$2');
    case 'compact':
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}`;
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
