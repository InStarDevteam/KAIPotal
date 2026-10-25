# 최종 제안 패키지 인덱스

## 1. 최종 ZIP 파일

- `proposal-package/국방지능형플랫폼포털_최종제안공유패키지_33단계.zip` (34단계 내용 반영, 2026-07-13 갱신)

## 2. PPT 자료

- `final-share/01_PPT/국방지능형플랫폼포털_최종_기능흐름_RFP대응_발표자료.pptx` (34장, 33.1단계 UI 반영)
- `final-share/01_PPT/국방지능형플랫폼포털_화면중심_RFP대응_발표자료_초안.pptx`

## 3. 기능 설명자료

- `final-share/02_GUIDES/국방지능형플랫폼포털_발표자_스크립트_32_2단계.md`
- `final-share/02_GUIDES/국방지능형플랫폼포털_쉽게_이해하는_기능흐름.md`
- `final-share/02_GUIDES/국방지능형플랫폼포털_기능흐름_사용설명자료.md`
- `final-share/02_GUIDES/PORTAL_USER_FLOW_GUIDE.md`
- `final-share/02_GUIDES/PORTAL_FEATURE_USAGE_GUIDE.md`
- `final-share/02_GUIDES/PORTAL_ADMIN_FEATURE_GUIDE.md`
- `final-share/02_GUIDES/PORTAL_PLATFORM_RELATIONSHIP_GUIDE.md`
- `final-share/02_GUIDES/SCREENSHOT_CAPTIONS.md`
- `final-share/02_GUIDES/PROPOSAL_BODY_IMAGE_GUIDE.md`
- `final-share/03_SCREENSHOTS/PROPOSAL_SCREENSHOT_CATALOG.md`

## 4. 화면 캡처

- `final-share/03_SCREENSHOTS/*.png` (20개, 33.1단계 UI 반영 재촬영)
- `final-share/03_SCREENSHOTS/PROPOSAL_SCREENSHOT_CATALOG.md`
- `final-share/03_SCREENSHOTS/SCREENSHOT_CAPTIONS.md`

## 5. RFP 대응 자료

- `final-share/04_RFP_MAPPING/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`
- `final-share/04_RFP_MAPPING/FINAL_REQUIREMENT_VALIDATION_REPORT.md`
- `final-share/04_RFP_MAPPING/SCREEN_TO_RFP_MAPPING.md`
- `final-share/04_RFP_MAPPING/RFP_MAPPING_JUSTIFICATION.md`
- `final-share/04_RFP_MAPPING/REQUIREMENT_COVERAGE_ADMIN_GUIDE.md`
- `final-share/04_RFP_MAPPING/PLATFORM_API_INTEGRATION_PLAN.md`
- `final-share/04_RFP_MAPPING/WORKFLOW_SCENARIO_GUIDE.md`
- `final-share/04_RFP_MAPPING/USER_JOURNEY_AND_PLATFORM_FLOW.md`
- `final-share/04_RFP_MAPPING/PROPOSAL_EXPLANATION_MESSAGES.md`

## 6. QA/검증 자료

- `final-share/05_QA_REPORTS/STAGE_31_6_FULL_AUDIT_REPORT.md`
- `final-share/05_QA_REPORTS/STAGE_31_6_AUDIT_RESULTS.md`
- `final-share/05_QA_REPORTS/FULL_FUNCTION_QA_REPORT.md`
- `final-share/05_QA_REPORTS/STAGE_31_5_QA_REPORT.md`
- `final-share/05_QA_REPORTS/FIREBASE_DEMO_DEPLOYMENT_LOG.md`
- `final-share/05_QA_REPORTS/FIREBASE_DEMO_CHECKLIST.md`
- `final-share/05_QA_REPORTS/FIREBASE_GOOGLE_LOGIN_TROUBLESHOOTING.md`

## 7. 자동화 스크립트

- `final-share/06_SCRIPTS/capture-proposal-screenshots-prod.js`
- `final-share/06_SCRIPTS/generate-proposal-ppt.py`
- `final-share/06_SCRIPTS/generate-feature-flow-ppt.py`
- `final-share/06_SCRIPTS/smoke-check-demo-routes.mjs`
- `final-share/06_SCRIPTS/full-audit-playwright.mjs`
- `final-share/06_SCRIPTS/README_스크립트_설명.md`

## 8. 제외한 파일

- 임시/백업 파일: `*_backup.pptx`, `*.tmp`, `*.bak`, `*.log`
- 개발 산출물: `node_modules/`, `.git/`, `dist/`, `build/`, `.cache/`
- 민감 정보: `서비스 계정 키 JSON 파일`, `*.pem`, `*.key`, `.env`, `.env.*`
- 시스템 파일: `.DS_Store`

## 9. 사용 순서

1. `final-share/00_README/README_최종공유본.md`를 먼저 읽습니다.
2. `final-share/02_GUIDES/국방지능형플랫폼포털_쉽게_이해하는_기능흐름.md`로 전체 맥락을 파악합니다.
3. `final-share/01_PPT/`의 PPT를 확인합니다.
4. `final-share/02_GUIDES/국방지능형플랫폼포털_발표자_스크립트_32_2단계.md`로 발표 연습을 합니다.
5. 필요시 `final-share/03_SCREENSHOTS/`의 원본 PNG와 `04_RFP_MAPPING/`의 매핑 자료를 참고합니다.
6. QA/검증 자료는 `05_QA_REPORTS/`에서 확인합니다.

## 10. 34단계 반영 내용

- 33.1단계 UI 변경사항(시연 배너 제거, 외부 운영도구 관리자 전용 이동)을 반영하여 화면 재촬영
- `OpenMetadata`/`OpenSearch` 일반 장표 캡처 제거, `플랫폼 운영도구` 관리자 장표 추가
- PPT 이미지 교체 및 디자인 보정(제목 바, 푸터, 글꼴 통일)
- `PROPOSAL_BODY_IMAGE_GUIDE.md` 추가로 제안서 본문 삽입용 이미지/캡션 정리
- 최종 ZIP 갱신(용량 약 1.5MB, 65개 항목)

## 11. 다음 단계

- 제안서 본문 작성 시 이미지/문구 활용
- Google 관리자 로그인 최종 확인
- GitHub push 인증 처리
