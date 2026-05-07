# cartainkr Cloudflare Worker

Supabase를 대체하는 Turso + Cloudflare Workers API 서버.

## 배포 순서

### 1. Turso 스키마 적용

```bash
# Turso CLI로 직접 실행
turso db shell cartain < schema.sql

# 또는 HTTP API로 실행 (npx tsx)
TURSO_URL=https://cartain-lsk7209.aws-ap-northeast-1.turso.io \
TURSO_TOKEN=<jwt> \
npx tsx -e "
import { createClient } from '@libsql/client/web';
import fs from 'fs';
const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN });
const sql = fs.readFileSync('schema.sql', 'utf8');
for (const stmt of sql.split(';').map(s=>s.trim()).filter(Boolean)) await db.execute(stmt);
console.log('Schema applied');
"
```

### 2. Supabase → Turso 데이터 마이그레이션

```bash
TURSO_URL=https://cartain-lsk7209.aws-ap-northeast-1.turso.io \
TURSO_TOKEN=<jwt> \
SUPABASE_URL=https://tczuttsjfttqvcmdawbo.supabase.co \
SUPABASE_ANON_KEY=<anon-key> \
npx tsx migrate.ts
```

### 3. Cloudflare 로그인 & 시크릿 설정

```bash
npx wrangler login

# 필수 시크릿 설정
npx wrangler secret put TURSO_URL
# → https://cartain-lsk7209.aws-ap-northeast-1.turso.io

npx wrangler secret put TURSO_TOKEN
# → <jwt>

npx wrangler secret put ANTHROPIC_API_KEY
# → sk-ant-...

npx wrangler secret put ADMIN_API_KEY
# → 원하는 비밀 키 (관리자 로그인용 패스워드)
```

### 4. Worker 배포

```bash
npm run deploy
```

배포 후 출력되는 URL (예: `cartainkr-api.lsk7209.workers.dev`)을 메모.

### 5. 커스텀 도메인 설정 (선택)

Cloudflare 대시보드 → Workers → cartainkr-api → Settings → Custom Domains에서
`api.cartain.kr` 추가.

### 6. 프론트엔드 환경변수 업데이트

루트의 `.env` 수정:
```
VITE_API_URL=https://cartainkr-api.lsk7209.workers.dev
```
또는 커스텀 도메인 사용 시:
```
VITE_API_URL=https://api.cartain.kr
```

`public/_redirects`와 `vercel.json`의 Worker URL도 동일하게 수정.

### 7. GitHub push → Vercel 자동 배포

```bash
git add -A && git commit -m "feat: migrate to Turso + Cloudflare Workers"
git push
```

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/posts?page=N | 페이지네이션된 글 목록 |
| GET | /api/posts/latest?limit=N | 최신 글 |
| GET | /api/posts/count | 전체 글 수 |
| GET | /api/posts/search?q=... | 검색 |
| GET | /api/posts/related?postId=...&title=... | 관련 글 |
| GET | /api/posts/:slug | 글 상세 |
| GET | /sitemap.xml | 사이트맵 |
| GET | /rss.xml | RSS 피드 |
| GET | /api/admin/stats | 통계 (Auth 필요) |
| GET | /api/admin/posts | 전체 글 목록 (Auth 필요) |
| GET/POST | /api/admin/queue | 큐 조회/추가 (Auth 필요) |
| PATCH/DELETE | /api/admin/queue/:id | 큐 수정/삭제 (Auth 필요) |
| GET/POST | /api/admin/settings | 설정 (Auth 필요) |
| POST | /api/admin/generate | 글 생성 트리거 (Auth 필요) |

Admin API: `Authorization: Bearer <ADMIN_API_KEY>` 헤더 필요.

## Cron 트리거

`wrangler.toml`에 설정된 크론: 매일 오전 1시, 오후 1시(UTC).
`posts_per_day` 설정에 따라 자동으로 글 생성.
