#!/usr/bin/env python3
"""GSC(Search Console) 사이트맵 자동 제출 스크립트.

서비스 계정(id-ai-179@cursorai-451704.iam.gserviceaccount.com)으로 인증해
cartain.kr 속성에 sitemap.xml 을 제출하고 상태를 출력한다.

사용:
  python scripts/submit_sitemap_gsc.py
  python scripts/submit_sitemap_gsc.py --site https://cartain.kr/ --sitemap https://cartain.kr/sitemap.xml

전제: 서비스 계정이 해당 GSC 속성의 소유자(siteOwner)여야 함.
"""
import argparse
import json
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

DEFAULT_KEY = "D:/env/cursorai-451704-85a5abbe8eeb.json"
DEFAULT_SITE = "https://cartain.kr/"
DEFAULT_SITEMAP = "https://cartain.kr/sitemap.xml"
SCOPES = ["https://www.googleapis.com/auth/webmasters"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default=DEFAULT_KEY, help="서비스 계정 JSON 경로")
    ap.add_argument("--site", default=DEFAULT_SITE, help="GSC 속성 URL")
    ap.add_argument("--sitemap", default=DEFAULT_SITEMAP, help="사이트맵 URL")
    args = ap.parse_args()

    creds = service_account.Credentials.from_service_account_file(args.key, scopes=SCOPES)
    svc = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

    svc.sitemaps().submit(siteUrl=args.site, feedpath=args.sitemap).execute()
    g = svc.sitemaps().get(siteUrl=args.site, feedpath=args.sitemap).execute()

    status = "성공" if g.get("errors", "0") == "0" else "오류"
    print(f"[GSC] {args.sitemap} 제출 완료")
    print(f"  상태: {status} (errors={g.get('errors')}, warnings={g.get('warnings')})")
    print(f"  lastSubmitted: {g.get('lastSubmitted')}")
    print(f"  lastDownloaded: {g.get('lastDownloaded')} | isPending: {g.get('isPending')}")
    print(f"  contents: {json.dumps(g.get('contents'), ensure_ascii=False)}")

    return 0 if g.get("errors", "0") == "0" else 1


if __name__ == "__main__":
    sys.exit(main())
