# Status | 마지막: 2026-05-12
## 현재 작업
사이트 최적화 T2 진행 중. sitemap/RSS/GA/본문 손상 복구 완료, 자동 발행 fallback 보강 중
## 최근 변경
- 05-12: Anthropic 크레딧 부족 시 자동 발행 실패하지 않도록 로컬 HTML fallback 추가
- 05-12: GA4 ID를 G-N7JJFW6007로 교체, sitemap XML 이스케이프 및 RSS feed.xml 별칭 배포
- 05-12: [object Object]로 손상된 글 7개 본문 복구 및 admin API 저장 검증 추가
- 05-12: auto-publish 워크플로우 동시 실행 방지 및 5시간 간격 published_at 예약 보강
- 05-12: MagazineDetail slug 변경 시 scrollTo top 및 로딩 상태 리셋 추가, 관련글 클릭 검증 완료
## TODO
- [ ] T2-5: useSEO.ts 네이버 메타 40자/80자 분기 구현
- [ ] T2: Lighthouse 접근성 지적(color contrast, target size 등) 보정
- [ ] T3: Next.js 전환 검토
## 결정사항
- 공개 제어는 post 상태값이 아니라 published_at <= now 필터로 처리
- 자동 발행은 GitHub Actions 5시간 cron + 스크립트의 다음 예약 시간 계산을 함께 사용
- 대표 RSS는 /rss.xml, 호환 주소로 /feed.xml 및 /feed도 같은 피드 제공
## 주의
- GitHub Actions cron '0 */5 * * *'는 UTC 0/5/10/15/20시에 실행되어 자정 구간은 4시간 간격
- 로컬 build는 TURSO_URL/TURSO_TOKEN 없으면 글 프리렌더를 건너뜀
