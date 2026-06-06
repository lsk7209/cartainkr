"""
Generate deterministic, content-matched static thumbnails for posts with empty
thumbnail_url, deployable from public/generated-thumbnails.

Flow:
  1. python scripts/backfill_static_thumbnails.py --generate --limit 0
  2. deploy the site
  3. python scripts/backfill_static_thumbnails.py --update-db --limit 0
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "generated-thumbnails"
BASE_URL = os.environ.get("CARTAIN_BASE_URL", "https://cartain.kr").rstrip("/")
SITE_URL = os.environ.get("CARTAIN_SITE_URL", "https://cartain.kr").rstrip("/")
WIDTH = 1200
HEIGHT = 675
REQUEST_TIMEOUT_SECONDS = 20


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


@dataclass(frozen=True)
class Theme:
    name: str
    keywords: tuple[str, ...]
    colors: tuple[str, str, str]
    accent: str
    icon: str


THEMES = (
    Theme("배터리", ("배터리", "방전", "AGM", "EFB", "충전"), ("#101a2e", "#1d4ed8", "#e0efff"), "#60a5fa", "battery"),
    Theme("브레이크", ("브레이크", "패드", "디스크", "캘리퍼"), ("#2a0f12", "#b91c1c", "#ffe6e6"), "#fb7185", "brake"),
    Theme("연비/주유", ("연비", "주유", "연료", "만땅크", "OBD", "기름"), ("#08251f", "#0f766e", "#d7fff8"), "#2dd4bf", "fuel"),
    Theme("정비", ("정비", "카센터", "서비스센터", "교체", "수리", "엔진오일"), ("#15151d", "#4b5563", "#f0f4f8"), "#f97316", "wrench"),
    Theme("세금/비용", ("세금", "취득세", "공채", "법인차", "감면", "공제", "총정리"), ("#25180a", "#9a5f13", "#fff3d6"), "#fbbf24", "document"),
    Theme("사고/보험", ("사고", "보험", "과실", "전손", "보상", "분쟁", "사기"), ("#06172d", "#0b5b78", "#d9f3ff"), "#38bdf8", "shield"),
    Theme("중고차", ("중고차", "성능", "보증", "하자", "AS", "구매 후"), ("#132012", "#2d6a4f", "#e8f7e6"), "#7ddf64", "checklist"),
    Theme("신차구매", ("신차", "첫 차", "첫차", "구매", "할인", "모터쇼"), ("#091322", "#2563eb", "#e6f0ff"), "#93c5fd", "keys"),
)

DEFAULT_THEME = Theme("자동차 가이드", tuple(), ("#07111f", "#0f766e", "#e5fbff"), "#22d3ee", "car")


def auth_headers(content_type: bool = False) -> dict[str, str]:
    token = os.environ.get("CARTAIN_TOKEN") or os.environ.get("ADMIN_API_KEY")
    if not token:
        raise RuntimeError("CARTAIN_TOKEN or ADMIN_API_KEY is not set")
    headers = {"Authorization": f"Bearer {token.strip()}"}
    if content_type:
        headers["Content-Type"] = "application/json"
    return headers


def fetch_posts(limit: int, missing_only: bool) -> list[dict[str, Any]]:
    params: dict[str, int | str] = {"limit": min(500, limit or 500), "offset": 0}
    if missing_only:
        params["thumbnail"] = "missing"
    response = requests.get(
        f"{BASE_URL}/api/admin/posts",
        headers=auth_headers(),
        params=params,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    posts = response.json()
    if not isinstance(posts, list):
        raise RuntimeError(f"Unexpected posts response: {posts}")
    return posts if not limit else posts[:limit]


def update_thumbnail(post_id: str, thumbnail_url: str) -> bool:
    response = requests.post(
        f"{BASE_URL}/api/admin/update-post",
        headers=auth_headers(content_type=True),
        json={"id": post_id, "thumbnail_url": thumbnail_url},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return bool(response.json().get("success"))


def pick_theme(title: str, excerpt: str) -> Theme:
    text = f"{title} {excerpt}".lower()
    for theme in THEMES:
        if any(keyword.lower() in text for keyword in theme.keywords):
            return theme
    return DEFAULT_THEME


def slug_filename(slug: str) -> str:
    safe = re.sub(r"[^a-z0-9-]+", "-", slug.lower()).strip("-")
    digest = hashlib.sha1(slug.encode("utf-8")).hexdigest()[:10]
    if not safe or safe.isdigit() or len(safe) < 8:
        safe = "post"
    return f"{safe[:72]}-{digest}.webp"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf",
        "C:/Windows/Fonts/NotoSansKR-Bold.ttf" if bold else "C:/Windows/Fonts/NotoSansKR-Regular.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def blend(a: tuple[int, int, int], b: tuple[int, int, int], ratio: float) -> tuple[int, int, int]:
    return tuple(round(a[index] * (1 - ratio) + b[index] * ratio) for index in range(3))


def draw_gradient(draw: ImageDraw.ImageDraw, theme: Theme) -> None:
    left = hex_to_rgb(theme.colors[0])
    right = hex_to_rgb(theme.colors[1])
    for x in range(WIDTH):
        ratio = x / max(1, WIDTH - 1)
        draw.line([(x, 0), (x, HEIGHT)], fill=blend(left, right, ratio))


def draw_car(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, fill: str, accent: str) -> None:
    body = [x, y + 100 * scale, x + 520 * scale, y + 190 * scale]
    roof = [(x + 110 * scale, y + 105 * scale), (x + 205 * scale, y + 30 * scale), (x + 375 * scale, y + 45 * scale), (x + 455 * scale, y + 110 * scale)]
    draw.rounded_rectangle(body, radius=int(40 * scale), fill=fill)
    draw.polygon(roof, fill=fill)
    draw.line([(x + 90 * scale, y + 120 * scale), (x + 460 * scale, y + 120 * scale)], fill=accent, width=max(2, int(5 * scale)))
    for wx in (x + 125 * scale, x + 410 * scale):
        draw.ellipse([wx - 40 * scale, y + 150 * scale, wx + 40 * scale, y + 230 * scale], fill="#020617", outline=accent, width=max(2, int(8 * scale)))


def draw_theme_icon(draw: ImageDraw.ImageDraw, theme: Theme) -> None:
    accent = theme.accent
    fill = "#eaf6ff"
    x, y = 785, 210
    draw_car(draw, 610, 315, 0.72, "#dbeafe", accent)
    if theme.icon == "document":
        draw.rounded_rectangle([780, 145, 1025, 365], radius=22, fill=fill, outline=accent, width=8)
        for i in range(4):
            draw.line([820, 205 + i * 38, 970, 205 + i * 38], fill="#334155", width=7)
        draw.rounded_rectangle([890, 455, 1060, 570], radius=20, fill="#0f172a", outline=accent, width=7)
        for i in range(3):
            for j in range(3):
                draw.rectangle([918 + j * 42, 480 + i * 25, 942 + j * 42, 494 + i * 25], fill=accent)
    elif theme.icon == "battery":
        draw.rounded_rectangle([760, 190, 1040, 340], radius=28, fill=fill, outline=accent, width=9)
        draw.rectangle([1040, 235, 1085, 295], fill=accent)
        draw.rectangle([805, 238, 940, 292], fill=accent)
        draw.line([860, 215, 860, 315], fill="#0f172a", width=8)
    elif theme.icon == "brake":
        draw.ellipse([760, 135, 1045, 420], fill=fill, outline=accent, width=12)
        draw.ellipse([845, 220, 960, 335], fill="#0f172a")
        draw.arc([695, 110, 1110, 455], 300, 65, fill=accent, width=30)
    elif theme.icon == "fuel":
        draw.rounded_rectangle([820, 160, 970, 410], radius=22, fill=fill, outline=accent, width=8)
        draw.rectangle([850, 195, 940, 270], fill="#0f172a")
        draw.line([970, 215, 1045, 280], fill=accent, width=12)
        draw.arc([1010, 260, 1085, 430], 270, 90, fill=accent, width=12)
    elif theme.icon == "wrench":
        draw.line([785, 420, 1015, 190], fill=fill, width=42)
        draw.line([785, 420, 1015, 190], fill=accent, width=16)
        draw.ellipse([965, 145, 1065, 245], outline=fill, width=28)
    elif theme.icon == "shield":
        draw.polygon([(900, 120), (1050, 180), (1010, 405), (900, 500), (790, 405), (750, 180)], fill=fill, outline=accent)
        draw.line([830, 300, 885, 358, 990, 245], fill=accent, width=16)
    else:
        draw.rounded_rectangle([790, 160, 1050, 340], radius=30, fill=fill, outline=accent, width=8)
        draw.ellipse([820, 365, 900, 445], fill=accent)
        draw.ellipse([940, 365, 1020, 445], fill=accent)


def draw_text(draw: ImageDraw.ImageDraw, title: str, theme: Theme) -> None:
    title_font = font(50, bold=True)
    small_font = font(30, bold=True)
    meta_font = font(24)
    title_lines = wrap_pixels(draw, title, title_font, 610, 4)

    draw.rounded_rectangle([64, 62, 330, 122], radius=30, fill=theme.accent)
    draw.text((92, 76), theme.name, fill="#06111f", font=small_font)
    y = 178
    for line in title_lines:
        draw.text((70, y), line, fill="#ffffff", font=title_font)
        y += 78
    draw.line([72, 500, 500, 500], fill=theme.accent, width=8)
    draw.text((72, 525), "Cartain.kr 자동차 실전 가이드", fill=theme.colors[2], font=meta_font)


def text_width(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.ImageFont) -> int:
    box = draw.textbbox((0, 0), text, font=text_font)
    return box[2] - box[0]


def wrap_pixels(
    draw: ImageDraw.ImageDraw,
    text: str,
    text_font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> list[str]:
    lines: list[str] = []
    current = ""
    tokens = re.findall(r"\S+\s*", text)
    for token in tokens:
        candidate = f"{current}{token}"
        if current and text_width(draw, candidate.rstrip(), text_font) > max_width:
            lines.append(current.rstrip())
            current = token.lstrip()
            if len(lines) == max_lines:
                break
        else:
            current = candidate
        while text_width(draw, current.rstrip(), text_font) > max_width and len(lines) < max_lines:
            split_at = max(1, len(current) - 1)
            while split_at > 1 and text_width(draw, current[:split_at].rstrip(), text_font) > max_width:
                split_at -= 1
            lines.append(current[:split_at].rstrip())
            current = current[split_at:].lstrip()
    if current and len(lines) < max_lines:
        lines.append(current.rstrip())
    if len(lines) == max_lines and text_width(draw, lines[-1], text_font) > max_width - 30:
        while lines[-1] and text_width(draw, f"{lines[-1]}...", text_font) > max_width:
            lines[-1] = lines[-1][:-1]
        lines[-1] = f"{lines[-1]}..."
    return lines


def render_thumbnail(post: dict[str, Any]) -> Path:
    slug = str(post.get("slug") or post["id"])
    title = str(post.get("title") or "")
    excerpt = str(post.get("excerpt") or "")
    theme = pick_theme(title, excerpt)

    image = Image.new("RGB", (WIDTH, HEIGHT), theme.colors[0])
    draw = ImageDraw.Draw(image)
    draw_gradient(draw, theme)
    draw.rectangle([0, 0, WIDTH, HEIGHT], outline=theme.accent, width=0)
    draw_theme_icon(draw, theme)
    draw_text(draw, title, theme)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / slug_filename(slug)
    image.save(out_path, "WEBP", quality=86, method=6)
    return out_path


def thumbnail_url_for(post: dict[str, Any]) -> str:
    slug = str(post.get("slug") or post["id"])
    return f"{SITE_URL}/generated-thumbnails/{slug_filename(slug)}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10, help="Maximum posts; 0 means all")
    parser.add_argument("--generate", action="store_true", help="Generate static WebP files")
    parser.add_argument("--update-db", action="store_true", help="Update thumbnail_url to static URLs")
    parser.add_argument("--all-posts", action="store_true", help="Use all admin posts instead of only missing thumbnails")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    posts = fetch_posts(args.limit, missing_only=not args.all_posts)
    print(f"Target posts: {len(posts)}")

    if args.generate:
        for index, post in enumerate(posts, 1):
            path = render_thumbnail(post)
            print(f"[{index}/{len(posts)}] generated {path.relative_to(ROOT)}")

    if args.update_db:
        ok = 0
        for index, post in enumerate(posts, 1):
            url = thumbnail_url_for(post)
            if update_thumbnail(str(post["id"]), url):
                ok += 1
                print(f"[{index}/{len(posts)}] updated {post.get('slug')}")
        print(f"Updated thumbnail_url: {ok}/{len(posts)}")

    if not args.generate and not args.update_db:
        for post in posts:
            print(f"- {post.get('slug')} | {thumbnail_url_for(post)}")


if __name__ == "__main__":
    main()
