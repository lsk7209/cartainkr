"""
이미지 생성·업로드 공용 모듈
- Replicate Flux Schnell 로 이미지 생성
- Supabase Storage blog-images 버킷에 업로드
- public URL 반환
"""

import os
import re
import time
import uuid
import requests
import anthropic

REPLICATE_TOKEN       = os.environ.get("REPLICATE_API_TOKEN", "")
SUPABASE_URL          = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_KEY         = os.environ.get("ANTHROPIC_API_KEY", "")

FLUX_MODEL = "black-forest-labs/flux-schnell"
BUCKET     = "blog-images"


# ── 1. Claude로 영문 이미지 프롬프트 추출 ─────────────────────────────────
def make_image_prompt(title: str, excerpt: str) -> str:
    """한국어 제목+발췌 → 영문 Flux 프롬프트 (15단어 이내)"""
    if not ANTHROPIC_KEY:
        return "professional automotive photography, modern car, clean background"

    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=60,
        messages=[{
            "role": "user",
            "content": (
                f"Korean automotive article title: {title}\n"
                f"Excerpt: {excerpt[:120]}\n\n"
                "Write a Flux image generation prompt in English, max 15 words. "
                "Focus on the automotive subject. No quotes, no explanation."
            )
        }]
    )
    prompt = msg.content[0].text.strip().strip('"').strip("'")
    return prompt[:200]


# ── 2. Replicate Flux Schnell 이미지 생성 ─────────────────────────────────
def generate_image(image_prompt: str) -> bytes:
    """Replicate polling API → PNG bytes"""
    if not REPLICATE_TOKEN:
        raise RuntimeError("REPLICATE_API_TOKEN 미설정")

    headers = {
        "Authorization": f"Bearer {REPLICATE_TOKEN}",
        "Content-Type": "application/json",
        "Prefer": "wait",
    }
    payload = {
        "version": "black-forest-labs/flux-schnell",
        "input": {
            "prompt": (
                f"{image_prompt}, professional automotive photography, "
                "16:9 aspect ratio, high quality commercial photo, no text, no watermark"
            ),
            "aspect_ratio": "16:9",
            "output_format": "webp",
            "output_quality": 85,
            "num_outputs": 1,
        }
    }

    # 예측 생성
    resp = requests.post(
        "https://api.replicate.com/v1/predictions",
        headers=headers,
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    prediction = resp.json()
    pred_id = prediction["id"]

    # 완료 대기 (최대 60초)
    for _ in range(30):
        poll = requests.get(
            f"https://api.replicate.com/v1/predictions/{pred_id}",
            headers={"Authorization": f"Bearer {REPLICATE_TOKEN}"},
            timeout=15,
        )
        poll.raise_for_status()
        data = poll.json()
        status = data.get("status")

        if status == "succeeded":
            image_url = data["output"][0]
            img_resp = requests.get(image_url, timeout=30)
            img_resp.raise_for_status()
            return img_resp.content

        if status in ("failed", "canceled"):
            raise RuntimeError(f"Replicate 예측 실패: {data.get('error')}")

        time.sleep(2)

    raise TimeoutError("Replicate 60초 내 응답 없음")


# ── 3. Supabase Storage 업로드 ────────────────────────────────────────────
def upload_to_supabase(image_bytes: bytes, filename: str) -> str:
    """blog-images 버킷에 업로드 → public URL"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 미설정")

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "image/webp",
        "x-upsert": "true",
    }
    resp = requests.post(upload_url, headers=headers, data=image_bytes, timeout=30)
    resp.raise_for_status()

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"
    return public_url


# ── 4. 통합 함수 ──────────────────────────────────────────────────────────
def make_thumbnail(title: str, excerpt: str) -> str:
    """제목+발췌 → 이미지 생성 → 업로드 → public URL"""
    prompt   = make_image_prompt(title, excerpt)
    print(f"  🎨 이미지 프롬프트: {prompt}")

    img_bytes = generate_image(prompt)
    print(f"  📷 생성 완료 ({len(img_bytes):,} bytes)")

    # slug-safe 파일명
    safe = re.sub(r"[^a-z0-9]+", "-", title.lower())[:40].strip("-")
    filename = f"thumb-{safe}-{uuid.uuid4().hex[:8]}.webp"

    url = upload_to_supabase(img_bytes, filename)
    print(f"  ☁️  업로드 완료: {filename}")
    return url
