"""
자동 발행 스크립트 — GitHub Actions 크론에서 5시간마다 실행
1. 큐에서 다음 pending 항목 조회
2. Claude API로 3000자 이상 HTML 아티클 생성
3. Replicate로 썸네일 이미지 생성 → Supabase Storage 업로드
4. cartain.kr API로 발행
5. IndexNow 핑
6. Vercel Deploy Hook으로 SSG 재빌드 트리거
"""

import os
import re
import sys
import uuid
import random
import string
import requests
import anthropic
from datetime import datetime, timezone

# 이미지 생성 모듈 (선택적 — 환경변수 미설정 시 스킵)
try:
    from generate_image import make_thumbnail
    _IMAGE_ENABLED = bool(os.environ.get("REPLICATE_API_TOKEN"))
except ImportError:
    _IMAGE_ENABLED = False

CARTAIN_TOKEN  = os.environ["CARTAIN_TOKEN"]
ANTHROPIC_KEY  = os.environ["ANTHROPIC_API_KEY"]
DEPLOY_HOOK    = os.environ.get("VERCEL_DEPLOY_HOOK", "")
BASE           = "https://www.cartain.kr"
AUTH           = {"Authorization": f"Bearer {CARTAIN_TOKEN}"}
AUTH_JSON      = {**AUTH, "Content-Type": "application/json; charset=utf-8"}


# ── 최근 발행 슬러그 목록으로 중복 방지 ──────────────────────────────────────
def get_recent_slugs(n=30):
    r = requests.get(f"{BASE}/api/admin/posts", headers=AUTH, timeout=15)
    rows = r.json()
    return [row["slug"] for row in rows[:n]]


# ── 큐에서 다음 pending 항목 ───────────────────────────────────────────────
def get_next_pending():
    r = requests.get(f"{BASE}/api/admin/queue", headers=AUTH, timeout=15)
    r.raise_for_status()
    queue = r.json()
    pending = [x for x in queue if x.get("status") == "pending"]
    if not pending:
        print("❌ pending 항목 없음 — 큐가 비었습니다.")
        sys.exit(0)
    return pending[0]


# ── 제목이 깨진 문자열인지 확인 ────────────────────────────────────────────
def is_garbled(title: str) -> bool:
    q_count = title.count("?")
    return q_count > len(title) * 0.3


# ── 슬러그 생성 ────────────────────────────────────────────────────────────
def make_slug(en_title: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    base = re.sub(r"[^a-z0-9]+", "-", en_title.lower()).strip("-")[:60]
    return f"{base}-{today}-{suffix}"


# ── Claude API로 아티클 생성 ───────────────────────────────────────────────
SYSTEM_PROMPT = """
당신은 한국 자동차 정보 블로그 '카테인(cartain.kr)'의 시니어 에디터입니다.
한국 자동차 소비자에게 실용적인 정보를 제공하는 심층 아티클을 HTML로 작성합니다.

## 출력 형식 — 순수 HTML만 출력, 마크다운/코드블록/설명 절대 금지
- 최상단: <h2 id="intro">제목</h2>
- 본문: h2(id 포함), h3, p, ul, ol, table, details/summary 사용
- 테이블: thead/tbody 포함, 비교·수치 데이터 반드시 표 사용
- FAQ: <details><summary>질문</summary><div><p>답변</p></div></details> 형식으로 5개
- 관련 글 섹션: <h2 id="related">함께 읽으면 도움이 되는 글</h2> 포함
  내부 링크 예시: <a href="/calculator">유지비 계산기</a>
  내부 링크 예시: <a href="/magazine">매거진 전체 보기</a>
- 마지막 섹션: <h2 id="conclusion">핵심 요약</h2> — bullet 3개
- 최소 3,500 HTML 문자 이상 (실질적인 정보 밀도)

## 문체 및 콘텐츠 원칙
- 첫 문단: 구체적 수치·사례로 독자 관심 즉시 획득
- 모든 주장에 수치·출처·기준 명시 (예: "3~5만km마다", "법인세법 제27조의2")
- 독자가 바로 행동할 수 있는 체크리스트·기준 제시
- 광고성 문구, AI 클리셰("중요합니다", "알아보겠습니다") 절대 금지
- 한국 도로·세법·보험 환경 기준 (2026년 최신)

## 첫 번째 요소 — 독자 대상 안내 박스 (필수)
<div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px 20px;border-radius:8px;margin:20px 0">
<strong>이런 분에게 필요한 글</strong>
<ul style="margin:8px 0 0 0;padding-left:20px">
<li>...</li>
</ul>
</div>
""".strip()


def generate_article(queue_title: str, recent_slugs: list) -> dict:
    """Claude API 호출 → {title, slug, content_html, excerpt} 반환"""
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    if is_garbled(queue_title):
        topic_hint = "큐에 등록된 자동차 관련 주제 (제목이 손상됨)"
    else:
        topic_hint = f"주제: {queue_title}"

    recent_str = "\n".join(f"- {s}" for s in recent_slugs[:20])

    user_msg = f"""
{topic_hint}

아래 최근 발행 슬러그를 참고해 중복되지 않는 새로운 주제를 선택하거나, 위 주제로 아티클을 작성하세요.
최근 발행 슬러그:
{recent_str}

## 출력 구조 (JSON 없이 구분자만 사용)
===TITLE===
(한국어 완성형 제목, 예: "자동차 에어컨 가스 충전 완벽 가이드 2026: 셀프 충전 vs 카센터")
===SLUG_EN===
(영문 슬러그 키워드만, 예: car-aircon-recharge-guide-2026)
===EXCERPT===
(100~140자 한국어 메타 설명)
===CONTENT===
(완성된 HTML 아티클)
""".strip()

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=6000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = response.content[0].text

    def extract(tag):
        m = re.search(rf"==={tag}===\s*([\s\S]*?)(?:===\w+===|$)", raw)
        return m.group(1).strip() if m else ""

    title      = extract("TITLE")
    slug_en    = extract("SLUG_EN")
    excerpt    = extract("EXCERPT")
    content    = extract("CONTENT")

    if not title or not content:
        print("❌ 아티클 파싱 실패. 원문:")
        print(raw[:500])
        sys.exit(1)

    slug = make_slug(slug_en or re.sub(r"[^a-z0-9]+", "-", title.lower())[:50])

    return {"title": title, "slug": slug, "excerpt": excerpt, "content_html": content}


# ── 발행 ───────────────────────────────────────────────────────────────────
def publish(article: dict, queue_id: str):
    payload = {
        "id":           str(uuid.uuid4()),
        "slug":         article["slug"],
        "title":        article["title"],
        "content_html": article["content_html"],
        "excerpt":      article["excerpt"],
        "thumbnail_url": article.get("thumbnail_url"),
        "published_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "queue_id":     queue_id,
    }
    r = requests.post(f"{BASE}/api/admin/posts", headers=AUTH_JSON,
                      json=payload, timeout=20)
    r.raise_for_status()
    return r.json()


# ── IndexNow 핑 ────────────────────────────────────────────────────────────
def ping_indexnow():
    r = requests.post(f"{BASE}/api/admin/indexnow", headers=AUTH, timeout=15)
    return r.json()


# ── Vercel Deploy Hook ──────────────────────────────────────────────────────
def trigger_vercel():
    if not DEPLOY_HOOK:
        print("⚠️  VERCEL_DEPLOY_HOOK 미설정 — SSG 재빌드 스킵")
        return
    r = requests.post(DEPLOY_HOOK, timeout=15)
    print(f"🚀 Vercel deploy hook: {r.status_code}")


# ── 메인 ───────────────────────────────────────────────────────────────────
def main():
    print(f"[{datetime.now(timezone.utc).isoformat()}] auto_publish 시작")

    pending      = get_next_pending()
    queue_id     = pending["id"]
    queue_title  = pending.get("title", "")
    print(f"📋 pending: {queue_id} | {queue_title[:60]}")

    recent_slugs = get_recent_slugs(30)
    print(f"📰 최근 슬러그 {len(recent_slugs)}개 로드")

    print("✍️  Claude API로 아티클 생성 중...")
    article = generate_article(queue_title, recent_slugs)
    print(f"📝 생성: {article['title']}")
    print(f"🔗 slug: {article['slug']}")

    # 이미지 생성 (REPLICATE_API_TOKEN 설정된 경우)
    if _IMAGE_ENABLED:
        print("🎨 썸네일 이미지 생성 중...")
        try:
            article["thumbnail_url"] = make_thumbnail(article["title"], article["excerpt"])
            print(f"🖼️  썸네일: {article['thumbnail_url']}")
        except Exception as e:
            print(f"⚠️  이미지 생성 실패 (thumbnail 없이 발행): {e}")
            article["thumbnail_url"] = None
    else:
        print("⚠️  REPLICATE_API_TOKEN 미설정 — 이미지 없이 발행")
        article["thumbnail_url"] = None

    result = publish(article, queue_id)
    print(f"✅ 발행 완료: {result}")

    idx = ping_indexnow()
    print(f"📡 IndexNow: bing={idx.get('bing')} naver={idx.get('naver')} count={idx.get('count')}")

    trigger_vercel()

    print("🎉 완료!")


if __name__ == "__main__":
    main()
