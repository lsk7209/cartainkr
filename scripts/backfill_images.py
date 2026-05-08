"""
기존 포스트 thumbnail_url 백필 스크립트
thumbnail_url = null 인 글에 AI 이미지를 생성해 추가한다.

실행:
  python scripts/backfill_images.py            # 전체 백필
  python scripts/backfill_images.py --limit 10  # 최대 10개만
"""

import os
import sys
import time
import argparse
import requests
from generate_image import make_thumbnail

CARTAIN_TOKEN = os.environ["CARTAIN_TOKEN"]
BASE          = "https://www.cartain.kr"
AUTH          = {"Authorization": f"Bearer {CARTAIN_TOKEN}"}
AUTH_JSON     = {**AUTH, "Content-Type": "application/json"}


def get_posts_without_thumbnail(limit: int) -> list:
    """thumbnail_url 이 null인 포스트 목록 반환 (최신순)"""
    r = requests.get(f"{BASE}/api/admin/posts", headers=AUTH, timeout=15)
    r.raise_for_status()
    posts = r.json()
    null_posts = [p for p in posts if not p.get("thumbnail_url")]
    if limit:
        null_posts = null_posts[:limit]
    return null_posts


def update_thumbnail(post_id: str, thumbnail_url: str) -> bool:
    payload = {"id": post_id, "thumbnail_url": thumbnail_url}
    r = requests.post(
        f"{BASE}/api/admin/update-post",
        headers=AUTH_JSON,
        json=payload,
        timeout=15,
    )
    r.raise_for_status()
    return r.json().get("success", False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="처리할 최대 포스트 수 (0=전체)")
    args = parser.parse_args()

    posts = get_posts_without_thumbnail(args.limit)
    total = len(posts)
    print(f"🔍 thumbnail 없는 포스트 {total}개 발견\n")

    ok, fail = 0, 0
    for i, post in enumerate(posts, 1):
        pid   = post["id"]
        slug  = post["slug"]
        title = post.get("title", "")
        excerpt = post.get("excerpt", "")

        print(f"[{i}/{total}] {slug}")
        try:
            url = make_thumbnail(title, excerpt)
            update_thumbnail(pid, url)
            print(f"  ✅ 완료\n")
            ok += 1
        except Exception as e:
            print(f"  ❌ 실패: {e}\n")
            fail += 1

        # Replicate free tier 보호 — 글 사이 1.5초 대기
        if i < total:
            time.sleep(1.5)

    print(f"\n🎉 백필 완료 — 성공: {ok} / 실패: {fail} / 전체: {total}")


if __name__ == "__main__":
    main()
