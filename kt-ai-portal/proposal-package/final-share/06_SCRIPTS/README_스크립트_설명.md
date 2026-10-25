# 스크립트 설명

## capture-proposal-screenshots-prod.js

production URL(`https://kai-platform-d0ae0.web.app`) 기준으로 주요 화면을 자동 캡처하는 Playwright 스크립트입니다. 접근 코드 `ictway`로 로그인한 뒤 Guest 또는 관리자 전용 플래그 모드로 각 메뉴를 촬영합니다.

## generate-proposal-ppt.py

화면 캡처 중심의 RFP 대응 PPT를 생성하는 python-pptx 스크립트입니다. 각 장표에 RFP ID, 요구사항명, 요구내용, 대응 화면, 구현 기능, 구현 수준, 후속 연동 범위를 포함합니다.

## generate-feature-flow-ppt.py

기능 흐름 중심의 RFP 대응 PPT를 생성하는 python-pptx 스크립트입니다. 사용자 흐름, 메뉴 구조, SFR별 기능 장표, 대표 업무흐름, 포털-플랫폼 연계 역할, 구현 수준/후속 로드맵을 포함합니다.

## smoke-check-demo-routes.mjs

production URL의 주요 route와 `/api/auth/guest/refresh` API가 200 응답을 반환하는지 확인하는 Node.js 스크립트입니다.

## full-audit-playwright.mjs

브라우저 기반 전수검증 스크립트입니다. 주요 메뉴 접근, 화면 렌더링, 권한 제어, 오류 발생 여부를 자동으로 검사합니다.
