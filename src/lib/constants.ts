/**
 * 공통 상수 정의
 */

// 기본 URL (SSR 호환)
export const BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'https://cartain.kr';

// 페이지네이션
export const POSTS_PER_PAGE = 9;

// 현재 연도
export const CURRENT_YEAR = new Date().getFullYear();
