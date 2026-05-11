"""
Shared image generation and upload helpers for Cartain article thumbnails.

Default provider is Replicate Flux Schnell. The script builds a
content-specific prompt from the Korean title/excerpt, generates a WebP image,
uploads it to the Supabase Storage `blog-images` bucket, and returns the public
URL stored in `posts.thumbnail_url`.
"""

from __future__ import annotations

import os
import re
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

import requests

try:
    import anthropic
except ImportError:  # pragma: no cover - optional prompt enhancer
    anthropic = None


def load_local_env_files() -> None:
    project_root = Path(__file__).resolve().parents[1]
    for filename in (".env", ".env.production.local", ".env.production"):
        env_path = project_root / filename
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

REPLICATE_TOKEN = os.environ.get("REPLICATE_API_TOKEN", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

FLUX_MODEL = "black-forest-labs/flux-schnell"
BUCKET = "blog-images"
IMAGE_TIMEOUT_SECONDS = 90
POLL_INTERVAL_SECONDS = 2


@dataclass(frozen=True)
class TopicVisual:
    keywords: tuple[str, ...]
    subject: str


TOPIC_VISUALS = (
    TopicVisual(
        ("브레이크", "패드", "디스크", "캘리퍼", "brake"),
        "close-up of a mechanic replacing brake pads beside a clean sedan wheel",
    ),
    TopicVisual(
        ("배터리", "방전", "agm", "efb", "battery"),
        "car battery replacement under an open hood in a modern service bay",
    ),
    TopicVisual(
        ("세금", "취득세", "공채", "법인차", "장애인", "감면", "tax"),
        "car purchase documents, calculator, and keys on a Korean office desk",
    ),
    TopicVisual(
        ("보험", "사기", "과실", "전손", "보상", "사고", "insurance"),
        "vehicle damage inspection with insurance claim papers after a minor accident",
    ),
    TopicVisual(
        ("서비스센터", "카센터", "정비", "엔진오일", "오일", "service"),
        "modern auto service center with a mechanic inspecting a sedan engine",
    ),
    TopicVisual(
        ("연비", "주유", "연료", "만땅", "fuel"),
        "dashboard fuel gauge and highway driving scene in a practical family car",
    ),
    TopicVisual(
        ("중고차", "하자", "보증", "성능", "구매", "used car"),
        "used car inspection checklist with a sedan on a dealership lot",
    ),
    TopicVisual(
        ("신차", "모터쇼", "할인", "첫 차", "첫차", "new car"),
        "new car handover scene with keys and paperwork in a bright showroom",
    ),
    TopicVisual(
        ("차박", "캠핑", "suv", "camping"),
        "SUV camping setup at dusk with organized gear and soft outdoor lighting",
    ),
)


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip().lower()


def _fallback_subject(title: str, excerpt: str) -> str:
    text = f"{_normalize_text(title)} {_normalize_text(excerpt)}"
    for visual in TOPIC_VISUALS:
        if any(keyword.lower() in text for keyword in visual.keywords):
            return visual.subject
    return "modern Korean automotive editorial scene with a practical sedan and useful ownership details"


def validate_runtime_config() -> None:
    missing = []
    if not REPLICATE_TOKEN:
        missing.append("REPLICATE_API_TOKEN")
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL or VITE_SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        raise RuntimeError(f"Missing image backfill env: {', '.join(missing)}")


def make_image_prompt(title: str, excerpt: str) -> str:
    """Return a concise, article-specific English prompt for a 16:9 thumbnail."""
    fallback = _fallback_subject(title, excerpt)
    base_instruction = (
        "Write one English image generation prompt for a Korean automotive blog thumbnail. "
        "Use a concrete visual subject matching the article. No text, no watermark, no logo. "
        "Max 28 words. Return only the prompt."
    )

    if ANTHROPIC_KEY and anthropic:
        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=80,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"{base_instruction}\n\n"
                        f"Title: {title}\n"
                        f"Excerpt: {excerpt[:180]}\n"
                        f"Suggested subject: {fallback}"
                    ),
                }
            ],
        )
        prompt = msg.content[0].text.strip().strip('"').strip("'")
        if prompt:
            return prompt[:240]

    return (
        f"{fallback}, professional automotive editorial photography, "
        "clean composition, realistic lighting"
    )[:240]


def generate_image(image_prompt: str) -> bytes:
    """Generate one WebP thumbnail with Replicate and return image bytes."""
    if not REPLICATE_TOKEN:
        raise RuntimeError("REPLICATE_API_TOKEN is not set")

    headers = {
        "Authorization": f"Bearer {REPLICATE_TOKEN}",
        "Content-Type": "application/json",
        "Prefer": "wait",
    }
    payload = {
        "version": FLUX_MODEL,
        "input": {
            "prompt": (
                f"{image_prompt}, 16:9 aspect ratio, high quality commercial photo, "
                "no text, no watermark, no logo"
            ),
            "aspect_ratio": "16:9",
            "output_format": "webp",
            "output_quality": 85,
            "num_outputs": 1,
        },
    }

    response = requests.post(
        "https://api.replicate.com/v1/predictions",
        headers=headers,
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    prediction = response.json()
    prediction_id = prediction["id"]
    deadline = time.monotonic() + IMAGE_TIMEOUT_SECONDS

    while time.monotonic() < deadline:
        poll = requests.get(
            f"https://api.replicate.com/v1/predictions/{prediction_id}",
            headers={"Authorization": f"Bearer {REPLICATE_TOKEN}"},
            timeout=15,
        )
        poll.raise_for_status()
        data = poll.json()
        status = data.get("status")

        if status == "succeeded":
            output = data.get("output") or []
            if not output:
                raise RuntimeError("Replicate returned no image output")
            image_response = requests.get(output[0], timeout=30)
            image_response.raise_for_status()
            return image_response.content

        if status in ("failed", "canceled"):
            raise RuntimeError(f"Replicate image generation failed: {data.get('error')}")

        time.sleep(POLL_INTERVAL_SECONDS)

    raise TimeoutError(f"Replicate did not finish within {IMAGE_TIMEOUT_SECONDS} seconds")


def upload_to_supabase(image_bytes: bytes, filename: str) -> str:
    """Upload image bytes to Supabase Storage and return the public URL."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set")

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "image/webp",
        "x-upsert": "true",
    }
    response = requests.post(upload_url, headers=headers, data=image_bytes, timeout=30)
    response.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"


def _safe_filename_seed(title: str) -> str:
    ascii_seed = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    if ascii_seed:
        return ascii_seed[:40]
    return f"cartain-{uuid.uuid4().hex[:8]}"


def make_thumbnail(title: str, excerpt: str) -> str:
    """Generate, upload, and return a content-matched thumbnail public URL."""
    prompt = make_image_prompt(title, excerpt)
    print(f"  prompt: {prompt}")

    image_bytes = generate_image(prompt)
    print(f"  generated: {len(image_bytes):,} bytes")

    filename = f"thumb-{_safe_filename_seed(title)}-{uuid.uuid4().hex[:8]}.webp"
    url = upload_to_supabase(image_bytes, filename)
    print(f"  uploaded: {filename}")
    return url
