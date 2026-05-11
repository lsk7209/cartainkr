# Status | 마지막: 2026-05-12
## 현재 작업
사이트 최적화 T2 진행 중. 미래 글 숨김, 썸네일 보정, 관련글 이동, 5시간 자동 공개 보강 완료
## 최근 변경
- 05-12: auto-publish 워크플로우 동시 실행 방지 및 5시간 간격 published_at 예약 보강
- 05-12: MagazineDetail slug 변경 시 scrollTo top 및 로딩 상태 리셋 추가, 관련글 클릭 검증 완료
- 05-12: lint warning 정리 및 lint/type/build 통과
- 05-12: public/generated-thumbnails WebP 439개 생성, 누락 썸네일 112개 DB 업데이트
- 05-12: 미래 발행 글이 공개 목록/RSS/sitemap/상세에서 숨겨지도록 API 필터 적용
## TODO
- [ ] T2-5: useSEO.ts 네이버 메타 40자/80자 분기 구현
- [ ] T2: Lighthouse 접근성 지적(color contrast, target size 등) 보정
- [ ] T3: Next.js 전환 검토
## 결정사항
- 공개 제어는 post 상태값이 아니라 published_at <= now 필터로 처리
- 자동 발행은 GitHub Actions 5시간 cron + 스크립트의 다음 예약 시간 계산을 함께 사용
## 주의
- GitHub Actions cron '0 */5 * * *'는 UTC 0/5/10/15/20시에 실행되어 자정 구간은 4시간 간격
- 로컬 build는 TURSO_URL/TURSO_TOKEN 없으면 글 프리렌더를 건너뜀
