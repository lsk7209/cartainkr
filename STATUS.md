# Status | 마지막: 2026-05-11
## 현재 작업
AEO/GEO 최적화 완료 → 배포됨 (Vercel 자동 배포 진행 중)

## 최근 변경 (최근 5개)
- 05-11: AEO/GEO 최적화 - llms.txt·ai-index.json·docs/*.md 추가, sitemap image태그, robots.txt 봇 추가

## TODO
- [ ] T2-5: useSEO.ts 네이버 메타 40자/80자 분기 구현
- [ ] 배포 후 검증: /llms.txt, /ai-index.json, /sitemap.xml image태그, /robots.txt
- [ ] T3: Next.js 전환 검토 (장기)

## 결정사항
- Security headers(T2-3): vercel.json에 이미 구현됨 → 스킵
- optimizeDeps include에 lucide-react 등 추가 (번들 최적화)
- vercel.json rewrite에 llms·ai-index·docs 경로 예외 처리

## 주의
- vite.config.ts PostToolUse hook이 포맷 자동 변경함 — 편집 전 항상 Read 먼저
- git은 main 브랜치 → origin/main 트래킹
