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
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLISH_INTERVAL_HOURS = int(os.environ.get("PUBLISH_INTERVAL_HOURS", "5"))


def load_local_env_files() -> None:
    for filename in (".env", ".env.production.local", ".env.production"):
        env_path = ROOT / filename
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if not line or line.lstrip().startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            name = name.strip()
            value = value.strip().strip('"').strip("'")
            if name and value and not os.environ.get(name):
                os.environ[name] = value


load_local_env_files()

# 이미지 생성 모듈 (선택적 — 환경변수 미설정 시 스킵)
try:
    from generate_image import make_thumbnail
    _IMAGE_ENABLED = bool(os.environ.get("REPLICATE_API_TOKEN"))
except ImportError:
    _IMAGE_ENABLED = False

CARTAIN_TOKEN  = os.environ.get("CARTAIN_TOKEN") or os.environ.get("ADMIN_API_KEY")
ANTHROPIC_KEY  = os.environ.get("ANTHROPIC_API_KEY")
if not CARTAIN_TOKEN:
    raise RuntimeError("CARTAIN_TOKEN or ADMIN_API_KEY is not set")
if not ANTHROPIC_KEY:
    raise RuntimeError("ANTHROPIC_API_KEY is not set")
DEPLOY_HOOK    = os.environ.get("VERCEL_DEPLOY_HOOK", "")
BASE           = "https://cartain.kr"
AUTH           = {"Authorization": f"Bearer {CARTAIN_TOKEN}"}
AUTH_JSON      = {**AUTH, "Content-Type": "application/json; charset=utf-8"}


# ── 최근 발행 슬러그 목록으로 중복 방지 ──────────────────────────────────────
def get_recent_slugs(n=30):
    r = requests.get(f"{BASE}/api/admin/posts", headers=AUTH, timeout=15)
    r.raise_for_status()
    rows = r.json()
    return [row["slug"] for row in rows[:n]]


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def format_publish_at(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def get_next_publish_at() -> datetime:
    r = requests.get(f"{BASE}/api/admin/posts?limit=500", headers=AUTH, timeout=15)
    r.raise_for_status()
    rows = r.json()
    published_times = [
        parsed
        for parsed in (parse_iso_datetime(row.get("published_at")) for row in rows)
        if parsed is not None
    ]
    now = datetime.now(timezone.utc).replace(microsecond=0)
    latest = max(published_times, default=None)
    if latest and latest > now:
        return latest + timedelta(hours=PUBLISH_INTERVAL_HOURS)
    return now


# ── 큐에서 다음 pending 항목 ───────────────────────────────────────────────
def get_next_pending(exit_if_empty: bool = True):
    r = requests.get(f"{BASE}/api/admin/queue", headers=AUTH, timeout=15)
    r.raise_for_status()
    queue = r.json()
    pending = [x for x in queue if x.get("status") == "pending"]
    if not pending:
        if exit_if_empty:
            print("❌ pending 항목 없음 — 큐가 비었습니다.")
            sys.exit(0)
        return None
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
    if not base:
        base = "car-guide"
    return f"{base}-{today}-{suffix}"


def generate_fallback_article(queue_title: str) -> dict:
    title = queue_title.strip() or "자동차 실전 관리 가이드 2026"
    excerpt = (
        f"{title}의 핵심 기준을 구매 전 확인할 항목, 비용 계산, 서류 점검, "
        "실전 체크리스트 중심으로 정리합니다."
    )
    slug_seed = "car-guide-" + re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:40]
    content = f"""
<p class="article-summary">{excerpt}</p>
<div class="key-takeaways">
  <h2>핵심 요약</h2>
  <ul>
    <li>차량 관련 결정은 차값이 아니라 총비용 기준으로 비교해야 합니다.</li>
    <li>세금, 보험, 보증, 정비 이력은 계약 전 반드시 서면으로 확인합니다.</li>
    <li>조건이 애매하면 공식 기관 또는 계약서 원문 기준으로 다시 점검합니다.</li>
  </ul>
</div>
<h2>먼저 확인할 기준</h2>
<p>{title}에서 가장 먼저 볼 것은 실제 지출과 책임 범위입니다. 자동차 관련 비용은 차량 가격, 세금, 보험료, 소모품, 정비비가 함께 움직이기 때문에 한 항목만 보고 판단하면 예산이 쉽게 어긋납니다.</p>
<h2>비용 계산 방법</h2>
<p>구매 또는 유지 비용은 월 단위와 연 단위로 나누어 계산하는 것이 좋습니다. 취득세, 공채, 자동차세, 보험료처럼 한 번에 나가는 비용과 유류비, 충전비, 정비비처럼 반복되는 비용을 분리하면 비교가 쉬워집니다.</p>
<table>
  <thead><tr><th>항목</th><th>확인 포인트</th></tr></thead>
  <tbody>
    <tr><td>초기 비용</td><td>차량 가격, 취득세, 공채, 등록비, 보험료</td></tr>
    <tr><td>월 유지비</td><td>유류비 또는 충전비, 주차비, 소모품, 할부금</td></tr>
    <tr><td>위험 비용</td><td>중도해지 위약금, 보증 제외 수리비, 사고 자기부담금</td></tr>
  </tbody>
</table>
<h2>실전 체크리스트</h2>
<ul>
  <li>견적서의 포함 항목과 제외 항목을 분리해서 확인하기</li>
  <li>보험료는 본인 나이와 운전 경력 기준으로 직접 조회하기</li>
  <li>계약 전 세금 감면, 보증, 환불, 위약금 조건을 서면으로 남기기</li>
  <li>중고차는 성능점검기록부와 보험 이력을 함께 확인하기</li>
</ul>
<h2>자주 묻는 질문</h2>
<details><summary>온라인 평균 비용만 보고 결정해도 되나요?</summary><div><p>평균 비용은 참고용입니다. 실제 비용은 지역, 명의, 보험 경력, 차량 등급, 계약 조건에 따라 달라지므로 본인 조건으로 다시 계산해야 합니다.</p></div></details>
<details><summary>계약 전 가장 중요한 서류는 무엇인가요?</summary><div><p>견적서, 계약서, 약관, 보증 조건, 세금 계산 내역입니다. 분쟁이 생기면 구두 안내보다 서면 자료가 기준이 됩니다.</p></div></details>
<h2>마무리</h2>
<p>{title}는 한 번의 선택보다 보유 기간 전체 비용과 조건을 보는 것이 중요합니다. 위 체크리스트를 기준으로 비교하면 불필요한 지출과 사후 분쟁을 줄일 수 있습니다.</p>
""".strip()
    return {
        "title": title,
        "slug": make_slug(slug_seed),
        "excerpt": excerpt,
        "content_html": content,
    }


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
        "published_at": article.get("published_at", format_publish_at(get_next_publish_at())),
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
def publish_one(index: int, total: int):
    """큐에서 1편을 생성·발행한다. 큐가 비면 None 반환(배치 종료 신호)."""
    pending = get_next_pending(exit_if_empty=(index == 0))
    if pending is None:
        return None
    queue_id     = pending["id"]
    queue_title  = pending.get("title", "")
    print(f"📋 [{index + 1}/{total}] pending: {queue_id} | {queue_title[:60]}")

    recent_slugs = get_recent_slugs(30)
    print(f"📰 최근 슬러그 {len(recent_slugs)}개 로드")

    print("✍️  Claude API로 아티클 생성 중...")
    try:
        article = generate_article(queue_title, recent_slugs)
    except Exception as e:
        print(f"Claude article generation failed, using local fallback: {type(e).__name__}: {e}")
        article = generate_fallback_article(queue_title)
    article["published_at"] = format_publish_at(get_next_publish_at())
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
    return result


def main():
    # 빌드 비용 절감: BATCH_SIZE편을 생성·발행한 뒤 Vercel deploy hook(=풀 재빌드)을 1회만 호출.
    # published_at은 기존 로직대로 5h 간격으로 예약되므로 글 노출 시각 분산은 유지되고,
    # 재빌드 시 도달분이 일괄 노출된다(spinkorea와 동일 원리). cron은 하루 1회 권장.
    batch_size = max(1, int(os.environ.get("BATCH_SIZE", "5")))
    print(f"[{datetime.now(timezone.utc).isoformat()}] auto_publish 시작 (BATCH_SIZE={batch_size})")

    published = 0
    for i in range(batch_size):
        if publish_one(i, batch_size) is None:
            print(f"📭 큐 소진 — {published}편까지 발행")
            break
        published += 1

    if published > 0:
        trigger_vercel()  # 배치당 1회만 → 재빌드 1회
        print(f"🎉 배치 완료: {published}편 발행, 재빌드 1회")
    else:
        print("📭 발행할 글 없음 — 재빌드 스킵")


if __name__ == "__main__":
    main()
