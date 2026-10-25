# 국방지능형플랫폼포털 최종 공유 패키지

## 1. 패키지 목적

본 패키지는 국방지능형플랫폼포털 제안 활동을 위한 최종 공유 자료입니다. 제안팀 낸부 공유, 대표/PM 검토, 발표자 사전 학습, PPT 수작업 디자인 보정 전 원본 제공, RFP 대응 근거 확인, 화면 캡처 원본 보관, 향후 제안서 본문 작성 시 참고자료 제공을 목적으로 합니다.

## 2. 포함 산출물

| 디렉터리 | 내용 |
|----------|------|
| `01_PPT/` | 기능흐름 RFP 대응 발표자료, 화면 중심 RFP 대응 발표자료 |
| `02_GUIDES/` | 발표자 스크립트, 쉬운 기능 설명자료, 기능흐름 사용설명자료, 사용자/관리자/플랫폼 관계 가이드, 화면 캡션/카탈로그 |
| `03_SCREENSHOTS/` | production URL 기준 화면 캡처 20개 및 카탈로그/캡션 문서 |
| `04_RFP_MAPPING/` | 요구사항 추적표, 화면-RFP 매핑, API 연계 계획, 업무흐름 시나리오 등 |
| `05_QA_REPORTS/` | 전수검증 보고서, 배포/체크리스트, Google 로그인 점검 가이드 |
| `06_SCRIPTS/` | 캡처, PPT 생성, smoke test, 전수검증 스크립트 |
| `99_ARCHIVE_NOTE/` | 백업 및 아카이브 기록 |

## 3. 검증 환경 접속 정보

- **URL:** https://kai-platform-d0ae0.web.app
- **Access Code:** `ictway`
- **Google 관리자 로그인:** `kyubeom@gmail.com` 수동 확인 필요

## 4. 주요 PPT 파일

- `01_PPT/국방지능형플랫폼포털_최종_기능흐름_RFP대응_발표자료.pptx` (34장, 33.1단계 UI 반영)
  - 표지, 전체 체계, 사용자 흐름, 메뉴 구조, RFP 대응 총괄
  - SFR별 기능 장표, 관리자 추적 기능 장표
  - 4개 대표 업무흐름, 포털-플랫폼 연계 역할
  - 구현 수준/후속 로드맵, 마무리
- `01_PPT/국방지능형플랫폼포털_화면중심_RFP대응_발표자료_초안.pptx`
  - 화면 캡처 중심의 초안 발표자료

## 5. 기능 흐름 설명자료

- `02_GUIDES/국방지능형플랫폼포털_쉽게_이해하는_기능흐름.md`
- `02_GUIDES/국방지능형플랫폼포털_기능흐름_사용설명자료.md`
- `02_GUIDES/PORTAL_USER_FLOW_GUIDE.md`
- `02_GUIDES/PORTAL_FEATURE_USAGE_GUIDE.md`
- `02_GUIDES/PORTAL_ADMIN_FEATURE_GUIDE.md`
- `02_GUIDES/PORTAL_PLATFORM_RELATIONSHIP_GUIDE.md`
- `02_GUIDES/PROPOSAL_BODY_IMAGE_GUIDE.md`
- `02_GUIDES/국방지능형플랫폼포털_발표자_스크립트_32_2단계.md`

## 6. 화면 캡처 목록

`03_SCREENSHOTS/`에 20개 PNG 파일과 `PROPOSAL_SCREENSHOT_CATALOG.md`, `SCREENSHOT_CAPTIONS.md`가 포함되어 있습니다. 캡처는 2026-07-13 기준 production URL에서 재촬영되었으며, 33.1단계 UI 변경사항(시연 배너 제거, 외부 운영도구 관리자 전용 이동)이 반영되었습니다.

## 7. RFP 대응 근거 자료

`04_RFP_MAPPING/`에 다음 자료가 포함되어 있습니다.

- `FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`
- `FINAL_REQUIREMENT_VALIDATION_REPORT.md`
- `SCREEN_TO_RFP_MAPPING.md`
- `RFP_MAPPING_JUSTIFICATION.md`
- `REQUIREMENT_COVERAGE_ADMIN_GUIDE.md`
- `PLATFORM_API_INTEGRATION_PLAN.md`
- `WORKFLOW_SCENARIO_GUIDE.md`
- `USER_JOURNEY_AND_PLATFORM_FLOW.md`
- `PROPOSAL_EXPLANATION_MESSAGES.md`

## 8. QA/검증 자료

`05_QA_REPORTS/`에 다음 자료가 포함되어 있습니다.

- `STAGE_31_6_FULL_AUDIT_REPORT.md`
- `STAGE_31_6_AUDIT_RESULTS.md`
- `FULL_FUNCTION_QA_REPORT.md`
- `STAGE_31_5_QA_REPORT.md`
- `FIREBASE_DEMO_DEPLOYMENT_LOG.md`
- `FIREBASE_DEMO_CHECKLIST.md`
- `FIREBASE_GOOGLE_LOGIN_TROUBLESHOOTING.md`

## 9. 현재 구현 수준

- 19개 핵심 화면 UI/UX 구현 완료 (촬영용 화면 구성은 20개)
- 관리자 전용 기능(요구사항 대응현황, 플랫폼 API 연계현황, 업무흐름/연계 시나리오) 포함
- OpenSearch proxy, OpenMetadata UI, Keycloak OIDC 연동 확인
- 사용자/프로젝트/반출/크레딧/카탈로그 등은 샘플 데이터 기반 화면 검증 완료
- 접근 코드 로그인 및 Google 로그인 초기 흐름 확인

## 10. 후속 연동 범위

- 실제 DB/API 연동
- Keycloak Admin API 연동
- Kubernetes/OpenStack/CMP 연동
- OpenMetadata/OpenSearch 자동 동기화
- 반입·반출 파일 저장소 연동
- 크레딧 차감 및 자원 제한 enforcement
- 알림/메일/첨부파일 서비스
- 플랫폼 API 실제 연동(현재는 설계안/후보 목록 기반)

## 11. 사용 시 주의사항

- 본 패키지는 제안 및 검토용입니다.
- Firebase apiKey, appId, secret, PAT, service account json 등 민감 정보는 포함하지 않았습니다.
- Google 관리자 로그인 완료는 `kyubeom@gmail.com` 계정으로 별도 수동 확인이 필요합니다.
- PPT 디자인은 python-pptx 기본 레이아웃이므로 PowerPoint에서 추가 보정할 수 있습니다.
- 화면 캡처 및 PPT 본문에는 검증 환경을 암시하는 부적합한 문구를 사용하지 않았습니다.

## 12. GitHub push 및 인증 관련 참고

현재 로컬 저장소에 32.1~34단계 커밋이 쌓여 있으나, PAT 인증 문제로 GitHub push가 실패할 수 있습니다. 사용자가 직접 `gh auth login` 또는 PAT 갱신 후 `git push origin main`을 수행해야 합니다.
