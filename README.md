# CartainKR

카테인(`cartain.kr`)은 자동차 구매·유지비·보험·세금 정보를 제공하는 한국어 자동차 정보 사이트입니다. 핵심 사용자 행동은 무료 유지비 계산 완료이며, 매거진 콘텐츠가 계산기로 연결되는 구조입니다.

## 기술 구성

- Vite, React 18, TypeScript, Tailwind CSS
- Vercel Functions: 게시글, 관리자, SSR, sitemap, RSS
- `sanitize-html`: SSR·빌드 시 게시글 HTML 허용목록 정제
- Turso/libSQL: 운영 게시글 데이터
- Supabase: 기존 REST·Edge Function·마이그레이션 자산

운영과 개발의 데이터 경로가 다르므로 변경 시 두 경로를 구분해서 검증해야 합니다.

## 로컬 실행

```powershell
npm ci
npm run dev
```

기본 개발 주소는 Vite가 출력합니다. 자격증명이 없으면 정적 화면과 일부 Supabase 개발 경로만 확인할 수 있습니다.

## 품질 검사

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:build
npm audit --omit=dev
```

빌드 시 `TURSO_URL`과 `TURSO_TOKEN`이 없으면 게시글 상세 prerender는 생략됩니다. 이 경우 빌드 성공이 운영 게시글 렌더링 성공을 의미하지 않습니다.

## 환경 변수

실제 값은 저장소에 커밋하지 않습니다.

| 변수 | 용도 | 노출 범위 |
|---|---|---|
| `VITE_SUPABASE_URL` | 개발 클라이언트 데이터 접근 | 브라우저 공개 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase 공개 키 | 브라우저 공개 |
| `TURSO_URL` | 운영 게시글 DB | 서버/빌드 전용 |
| `TURSO_TOKEN` | Turso 인증 | 서버/빌드 전용 |
| `ADMIN_API_KEY` | 관리자 API bearer 인증 | 서버 전용 |

자동화 스크립트에는 별도 서비스 키가 필요할 수 있습니다. `.env*`, 토큰, 서비스 계정 JSON은 Git에 추가하지 마세요.

## 검색 및 전환 구조

- 대표 URL: `https://cartain.kr`
- 매거진 canonical: `/magazine`
- `/blog`는 `/magazine`으로 영구 이동
- sitemap: `/sitemap.xml`
- RSS: `/rss.xml`
- 주요 전환 이벤트: `calculator_completed`

Google Analytics, AdSense와 쿠팡 파트너스 측정 배너는 사용자가 쿠키에 동의한 후에만 로드됩니다. 검색 성과는 Google Search Console과 Naver Search Advisor, 전환은 GA4의 `calculator_completed` 이벤트로 분리해 측정합니다.

## 운영 경계

- 이 저장소의 로컬 빌드나 Git push는 실제 배포 성공을 증명하지 않습니다.
- DB 마이그레이션, 검색엔진 제출, 환경 변수 변경, 외부 게시와 배포는 각각 별도 승인과 검증이 필요합니다.
- 공식 배포 대상은 Vercel 하나이며, 오래된 Netlify 설정은 제거했습니다.
- 운영 콘텐츠를 자동 생성·발행하거나 대량 백필하는 GitHub Actions는 제거했습니다. `scripts/`의 운영 스크립트는 별도 승인, 행 제한과 dry-run 검토 없이 실행하지 않습니다.
- 글과 본문 카피는 외부 생성 API가 아니라 검토 가능한 로컬 작성물만 사용합니다.
