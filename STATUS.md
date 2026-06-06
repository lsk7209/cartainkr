# Status | 마지막: 2026-05-15
## 현재 작업
사이트 최적화 완료 후 고품질 예약글 300개 추가 생성 완료
## 최근 변경
- 05-15: 자동차 비용·세금·보험·정비 주제 예약글 300개 추가, 총 글 753개
- 05-15: 마지막 예약일 2026-08-29 00:00 KST, IndexNow 507개 재제출
- 05-15: 유지비·보험료 관련 글 5개에 /calculator 내부링크 박스 추가
- 05-15: /calculator에 유지비 정의·계산 항목 비교표 추가, 모바일 렌더링 확인
- 05-15: GSC 저CTR 대응으로 /calculator 메타 title·description 검색어 앞배치
## TODO
- [x] 배포 후 https://www.cartain.kr → https://cartain.kr 영구 리다이렉트 확인
- [x] 배포 후 /sitemap.xml, /feed.xml Cache-Control 재확인
- [x] GSC sitemap 재제출 및 GA4/IndexNow 운영 확인
- [x] /calculator 검색 결과 CTR 개선용 메타 갱신 및 IndexNow 재제출
- [x] /calculator AEO용 정의·비교표 콘텐츠 보강 및 Lighthouse SEO 100 확인
- [x] 관련 글 5개 내부링크 추가, GSC sitemap·IndexNow·Naver IndexNow 재제출
- [x] 고품질 예약글 300개 생성 및 5시간 간격 예약 등록
- [x] AdSense 검토용 개인정보처리방침·이용약관·소개·문의 페이지 운영 200 확인
- [x] 법적 페이지 AdSense 서드파티 쿠키 Lighthouse 경고 제거
## 결정사항
- canonical 기준 도메인: https://cartain.kr 로 통일
- 본문 제목 처리: 콘텐츠 문구는 수정하지 않고 렌더링 태그만 h1→h2 조정
- AdSense 검토 대응: 광고로 오해될 수 있는 빈 placeholder 문구는 제거
- 광고 스크립트: 콘텐츠/도구 페이지에서만 로드하고 법적·문의·관리자 페이지는 제외
## 주의
- 로컬 build는 TURSO_URL/TURSO_TOKEN 없으면 글 상세 사전 렌더를 건너뜀
- package-lock.json 등 기존 미완료 변경과 다수 임시 파일은 이번 작업 범위 밖
