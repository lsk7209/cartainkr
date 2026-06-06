"""
Backfill content-matched thumbnails for posts where thumbnail_url is empty.

Examples:
  python scripts/backfill_images.py --dry-run
  python scripts/backfill_images.py --limit 10
  python scripts/backfill_images.py --all --batch-size 100
"""

from __future__ import annotations

import argparse
import os
import time
from collections.abc import Iterable
from typing import Any

import requests

from generate_image import make_thumbnail, validate_runtime_config


BASE_URL = os.environ.get("CARTAIN_BASE_URL", "https://cartain.kr").rstrip("/")
DEFAULT_BATCH_SIZE = 100
REQUEST_TIMEOUT_SECONDS = 20
DEFAULT_SLEEP_SECONDS = 1.5


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is not set")
    return value


def auth_headers(content_type: bool = False) -> dict[str, str]:
    token = os.environ.get("CARTAIN_TOKEN") or os.environ.get("ADMIN_API_KEY")
    if not token:
        raise RuntimeError("CARTAIN_TOKEN or ADMIN_API_KEY is not set")
    headers = {"Authorization": f"Bearer {token.strip()}"}
    if content_type:
        headers["Content-Type"] = "application/json"
    return headers


def fetch_missing_posts(limit: int, offset: int) -> list[dict[str, Any]]:
    response = requests.get(
        f"{BASE_URL}/api/admin/posts",
        headers=auth_headers(),
        params={"thumbnail": "missing", "limit": limit, "offset": offset},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    posts = response.json()
    if not isinstance(posts, list):
        raise RuntimeError(f"Unexpected posts response: {posts}")
    return posts


def update_thumbnail(post_id: str, thumbnail_url: str) -> bool:
    payload = {"id": post_id, "thumbnail_url": thumbnail_url}
    response = requests.post(
        f"{BASE_URL}/api/admin/update-post",
        headers=auth_headers(content_type=True),
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return bool(response.json().get("success"))


def iter_missing_posts(batch_size: int, max_count: int, dry_run: bool) -> Iterable[dict[str, Any]]:
    emitted = 0
    offset = 0

    while True:
        fetch_limit = batch_size
        if max_count > 0:
            remaining = max_count - emitted
            if remaining <= 0:
                return
            fetch_limit = min(fetch_limit, remaining)

        posts = fetch_missing_posts(fetch_limit, offset)
        if not posts:
            return

        for post in posts:
            emitted += 1
            yield post
            if max_count > 0 and emitted >= max_count:
                return

        # Mutating mode always re-queries offset 0 because updated posts leave
        # the missing set. Dry-run mode uses normal pagination to inspect all.
        if dry_run:
            offset += len(posts)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10, help="Maximum posts to process; 0 means all")
    parser.add_argument("--all", action="store_true", help="Process every missing thumbnail")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--dry-run", action="store_true", help="List target posts without generating images")
    parser.add_argument("--sleep", type=float, default=DEFAULT_SLEEP_SECONDS)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    batch_size = max(1, args.batch_size)
    max_count = 0 if args.all else max(0, args.limit)
    posts = list(iter_missing_posts(batch_size, max_count, args.dry_run))
    total = len(posts)

    print(f"Missing-thumbnail posts: {total}")
    if args.dry_run:
        for post in posts:
            print(f"- {post.get('slug')} | {post.get('title')}")
        return
    validate_runtime_config()

    ok = 0
    fail = 0
    for index, post in enumerate(posts, 1):
        post_id = str(post["id"])
        slug = post.get("slug", "")
        title = post.get("title", "")
        excerpt = post.get("excerpt", "")

        print(f"[{index}/{total}] {slug}")
        try:
            thumbnail_url = make_thumbnail(title, excerpt)
            if not update_thumbnail(post_id, thumbnail_url):
                raise RuntimeError("Admin update returned success=false")
            print("  done\n")
            ok += 1
        except Exception as exc:
            print(f"  failed: {exc}\n")
            fail += 1

        if index < total:
            time.sleep(max(0, args.sleep))

    print(f"Backfill complete. success={ok}, failed={fail}, total={total}")
    if fail:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
