> 2026-10-04 최신 배포: 실제 Cloud SQL PostgreSQL에 MDR 연계용 임시 사전 6테이블·1,434행과 합성 업무 샘플 74행을 적재하고, 목록 페이지·장문 입력·집계·크레딧 조회를 보완했습니다. 공개 화면 59건·API 14개 검사 통과. [완료 보고서](docs/data-readiness-20261004/IMPLEMENTATION_REPORT.md), [55테이블 샘플 현황](docs/sample-data-20261004/SAMPLE_TABLE_COVERAGE.md), [기능 전수 점검](docs/sample-data-20261004/FEATURE_AUDIT.md). 접근코드는 `demo1234`이며, 기관 MDR·SSO·외부 실행·파일 저장소는 협의/연결 대상입니다. 현재 상태는 이 문서를 우선합니다.

> 2026-10-03 요구사항·UI/UX 종합 검토: [미비사항·팀 협의안](docs/requirements-review-20261003/REQUIREMENTS_GAP_REVIEW.md), [엑셀 협의 목록](docs/requirements-review-20261003/요구사항_UIUX_미비사항_협의목록_20261003.xlsx), [개선·배포 결과](docs/requirements-review-20261003/RELEASE_REPORT.md). 아래는 당시 검토 기록입니다.

> 2026-10-01 최신 배포: 디자인 4종 선택 복구, 실제 업무 집계·국방형 프로필·설정 이력, 프로젝트 UI 개선을 Cloud SQL·Cloud Run·Firebase Hosting에 반영했습니다. [배포 보고서](docs/customer-demo-20261001/DEPLOYMENT_REPORT.md), [검증 결과](docs/customer-demo-20261001/VALIDATION.md), [권한별 첫 화면·기능 개선](docs/customer-demo-20261001/IMPLEMENTATION_REPORT.md), [외부 연계 준비 상태](docs/customer-demo-20261001/INTEGRATION_STATUS.md). 아래 이전 단계의 기능·구현 목록보다 이 문서들을 우선합니다.

> 2026-09-24: 로그인·메인 4종 시안, 상단 앱 런처, 테넌트별 플랫폼 접근/개인화, 개발 관리자 API 콘솔을 추가했습니다. [구현·실행 안내](docs/portal-experience/IMPLEMENTATION.md), [시안 비교](docs/portal-experience/DESIGN_REVIEW.html), [검증](docs/portal-experience/VALIDATION.md), [Kimi Code 후속 프롬프트](docs/portal-experience/KIMI_FOLLOWUP_PROMPT.md).


> 33.2단계 UI/UX 디자인 시스템 정비(2026-07-30): 디자인 토큰/공통 컴포넌트/사이드바/대시보드/K-RMF/역할 UI/반응형 개선. 상세는 `docs/UI_UX_DESIGN_SYSTEM.md`, `docs/UI_UX_DESIGN_REVIEW.md`, `docs/UI_UX_BEFORE_AFTER.md` 참조.
# 국방지능형플랫폼포털 (K-Defense Intelligence Platform)

Backstage 기반의 국방 AI 데이터·모델·프로젝트·도구·크레딧 통합 운영 포털 PoC입니다.
- **최신 사전규격 반영**: 기능목록 155개 → 163개 확장 (27단계)

## 개요

국방지능형플랫폼포털은 국방 AI 데이터, 모델, 프로젝트를 하나의 포털에서 검색하고 관리하며, 크레딧, 반출/반입, K-RMF 증빙, 육해공군 멀티테넌트 관리까지 통합적으로 지원하는 것을 목표로 합니다.

## 기술 스택

- **Frontend**: Backstage (React + TypeScript)
- **Authentication**: Keycloak OIDC
- **Search**: OpenSearch
- **Data Governance**: OpenMetadata
- **Infra**: Docker Compose

## 주요 화면

| 메뉴 | 경로 | 그룹 | 관련 SFR | 설명 |
|------|------|------|----------|------|
| 통합 대시보드 | `/` | 포털 공통 | SFR-001, SFR-012 | 통합 대시보드, 요약 지표, 공지, Quick Links |
| 관리자 콘솔 | `/admin-console` | 관리/보안 | SFR-003~006 | 사용자/권한/RBAC/정책/감사/메뉴/프로그램 관리 |
| 요구사항 대응현황 | `/requirement-coverage` | 관리/보안 | SFR-001~021 | 메뉴/SFR/기능 단위 RFP 요구사항 대응 현황 (관리자 전용) |
| 플랫폼 API 연계현황 | `/platform-api-integration` | 관리/보안 | SFR-012/014/015/016/017/018/021 | 포털 ↔ 플랫폼 연계 설계안/API 후보 목록 (관리자 전용) |
| 업무흐름/연계 시나리오 | `/workflow-scenarios` | 관리/보안 | SFR-001/012/014/016/017/018/021 | 메뉴/사용자/플랫폼 관점 업무흐름 및 연계 시나리오 (관리자 전용) |
| 요구사항 진도표 (legacy) | `/requirement-progress` | 관리/보안 | SFR-001~021 | `/requirement-coverage` 별칭 (동일 화면) |
| K-RMF 증빙관리 | `/krmf-evidence` | 관리/보안 | SFR-002, SFR-004 | K-RMF 평가 증빙 자료 관리 |
| 서비스/도구 카탈로그 | `/service-catalog` | 플랫폼 연계 | SFR-007/008/014 | AI 개발 도구 카탈로그 |
| 반입·반출 승인 | `/export-approval` | 플랫폼 연계 | SFR-009~012 | 데이터 반입/반출 신청 및 승인 workflow |
| 통합검색 | `/integrated-search` | 플랫폼 연계 | SFR-014/015 | OpenSearch 기반 데이터/모델/문서 통합 검색 |
| 프로젝트/워크스페이스 | `/project-workspace` | 프로젝트 운영 | SFR-016/018 | 프로젝트/워크스페이스 등록 및 관리 |
| 크레딧 관리 | `/credit-manager` | 프로젝트 운영 | SFR-016~018 | 프로젝트별 크레딧 및 자원 사용량 관리 |
| 마이페이지 | `/my-page` | 사용자/조직 | SFR-019 | 사용자 개인 정보 및 활동 관리 |
| 환경설정 | `/environment-settings` | 사용자/조직 | SFR-020 | 시스템/보안/운영 설정 |
| 육해공군 관리 | `/tenant-management` | 사용자/조직 | SFR-021 | 육해공군 멀티테넌트 관리 |
| 제안 게시판 | `/proposal-board` | 사용자 지원 | SFR-013 | AI 아이디어 제안 및 승인/공지 |

## 실행 방법

1. 저장소 클론
2. `backstage-portal/.env.example`을 참고하여 `.env` 작성
3. Docker Compose로 인프라 기동:
   ```bash
   docker-compose up -d
   ```
4. 개발 서버 실행:
   ```bash
   cd backstage-portal
   ./scripts/start-dev.sh
   ```
5. 브라우저에서 `http://localhost:3000` 접속

## 주요 연동 URL

| 서비스 | URL | 비고 |
|--------|-----|------|
| Backstage Portal | http://localhost:3000 | 개발 서버 |
| Keycloak | http://localhost:8080 | OIDC 인증 |
| OpenSearch | http://localhost:9200 | 검색 엔진 |
| OpenSearch Dashboards | http://localhost:5601 | 검색 모니터링 |
| OpenMetadata | http://localhost:8585 | 메타데이터/거버넌스 |

## 데모 배포

- 데모 배포는 **Firebase Hosting + Cloud Run** 조합으로 준비되어 있습니다.
- 가이드: `docs/FIREBASE_DEMO_DEPLOYMENT.md`
- 체크리스트: `docs/FIREBASE_DEMO_CHECKLIST.md`
- 배포 이력: `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`
- 제안팀 검토용 PoC 데모에서는 접근코드 게이트(`PreviewAuthGate`)와 데모 배너(`DemoModeBanner`)가 적용됩니다.
- 29.1단계에서 Firebase Hosting에 요구사항 진도표 화면을 포함한 frontend를 재배포했습니다.
  - 데모 URL: `https://kai-platform-d0ae0.web.app`
  - 접근 코드: `ictway`
  - Firebase Web App 설정값은 환경변수로 주입하여 빌드했습니다.
- 29.2단계에서 Cloud Run backend를 최신 revision으로 재배포했습니다.
  - Cloud Run URL: `https://kt-ai-portal-demo-e2ik6gboua-du.a.run.app`
  - Revision: `kt-ai-portal-demo-00009-v6d`
  - `/api/auth/guest/refresh` 404 문제가 해소되었습니다.
- 30단계에서 관리자 전용 `요구사항 대응현황`과 `플랫폼 API 연계현황` 메뉴를 추가했습니다.
  - 기존 `/requirement-progress`는 `/requirement-coverage`와 동일한 화면으로 별칭 처리되었습니다.
  - 두 메뉴는 `visibleTo: 'admin'`과 `AdminOnlyGuard`로 일반 사용자에게 노출되지 않습니다.
- 31단계에서 관리자 전용 `업무흐름/연계 시나리오` 메뉴를 추가했습니다.
  - 7개 사용자/플랫폼 연계 시나리오와 사용자 여정을 시각화합니다.
  - 통합 대시보드에 관리자 전용 업무흐름/연계 정보 패널을 추가했습니다.
- 31.6단계에서 실제 기능 전수검증 및 결함 보완을 완료했습니다.
  - QA 보고서: `docs/STAGE_31_6_FULL_AUDIT_REPORT.md`
  - Playwright 전수검증 스크립트: `backstage-portal/scripts/full-audit-playwright.mjs` (실행 시 `AUDIT_ACCESS_CODE` 환경변수 필요)
  - Smoke test 스크립트: `scripts/smoke-check-demo-routes.mjs`
  - `/api/auth/guest/refresh` 브라우저 캐시 버스팅 적용
  - 통합검색 fallback 및 서비스 카탈로그/프로젝트/반출/제안/크레딧/관리자콘솔/마이페이지 등 mock/PoC 문구 최종 중립화
- 32단계에서 제안서/PPT용 화면 캡처 및 장표 패키징을 완료했습니다.
  - production URL 기준 21개 화면 재캡처
  - PPT 초안: `proposal-package/국방지능형플랫폼포털_RFP대응_발표자료_32단계.pptx`
  - 캡처 스크립트: `scripts/capture-proposal-screenshots-prod.js`
  - PPT 생성 스크립트: `scripts/generate-proposal-ppt.py`
- 32.1단계에서 Firebase Google 로그인 재배포 및 수동 검증을 완료했습니다.
  - 데모 URL: `https://kai-platform-d0ae0.web.app`
  - 접근 코드: `ictway`
  - Google 로그인 팝업/계정 선택/비밀번호 화면까지 도달 확인
  - `kyubeom@gmail.com` Google 로그인 완료 여부는 비밀번호/2FA로 인해 사용자 수동 확인 필요
  - `/api/auth/guest/refresh` 404는 Firebase Hosting edge stale cache로 분석; smoke test cache-buster 적용 후 17/17 통과
  - Firebase Console Google Provider/Authorized domains 수동 확인 필요

## 산출물 문서

- `docs/DOCUMENT_INDEX.md` — 전체 문서 인덱스
- `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md` — 견적용 기능목록 1~163 대응표
- `docs/MENU_FUNCTION_RELATIONSHIP_GUIDE.md` — 메뉴·기능·SFR 연계 가이드
- `docs/SCREEN_TO_RFP_MAPPING.md` — 화멸별 RFP 매핑표
- `docs/REQUIREMENT_SCREEN_COVERAGE.md` — 화면 기준 충족도 평가
- `docs/DEMO_SCRIPT.md` — 최종 데모 시나리오
- `docs/PROPOSAL_SCREENSHOT_CATALOG.md` — 제안서용 화면 캡처 목록
- `docs/SCREENSHOT_CAPTIONS.md` — 제안서 작성용 화면 캡션
- `docs/PROPOSAL_BODY_IMAGE_GUIDE.md` — 제안서 본문 삽입용 이미지/캡션 정리
- `docs/PROPOSAL_SUMMARY_TEXT.md` — 제안서 작성용 요약 문구
- `docs/FINAL_DELIVERABLES.md` — 최종 산출물 목록
- `docs/INTERNAL_LOGIC_BACKLOG.md` — 내부 로직 후속 개발 목록
- `docs/TECH_DEBT.md` — 기술부채 정리
- `docs/ARCHITECTURE.md` — 시스템 아키텍처
- `docs/REQUIREMENT_COVERAGE_ADMIN_GUIDE.md` — 요구사항 대응현황 관리자 가이드
- `docs/PLATFORM_API_INTEGRATION_PLAN.md` — 플랫폼 API 연계 설계 계획
- `docs/PORTAL_ROLE_AND_PLATFORM_BOUNDARY.md` — 포털과 플랫폼 역할/경계 정리
- `docs/WORKFLOW_SCENARIO_GUIDE.md` — 업무흐름/연계 시나리오 가이드
- `docs/USER_JOURNEY_AND_PLATFORM_FLOW.md` — 사용자 여정 및 플랫폼 연계 흐름
- `docs/PROPOSAL_EXPLANATION_MESSAGES.md` — 제안 발표용 설명 문구
- `docs/CHANGE_SUMMARY.md` — 단계별 변경 이력

## 화면 캡처

모든 캡처는 `docs/assets/final/`에 있습니다.

```text
01-portal-dashboard.png
02-integrated-search.png
03-project-workspace.png
04-export-approval.png
05-credit-manager.png
06-krmf-evidence.png
07-admin-console-user-management.png
08-admin-console-rbac-menu.png
09-admin-console-platform-ops-tools.png
09-admin-console-policy-audit.png
10-service-catalog.png
11-proposal-board.png
12-my-page.png
13-environment-settings.png
14-tenant-management.png
17-requirement-coverage.png
18-platform-api-integration.png
19-workflow-scenarios.png
09-keycloak-login.png
09-backstage-signin.png
```

## 현재 PoC 범위

- Backstage 기반 포털 UI 구축
- Keycloak OIDC 로그인 (Guest 로그인 포함)
- OpenSearch 통합검색 (proxy 연동)
- OpenMetadata 실행/API 검증
- 13개 주요 화면 mock 기반 구현 (관리자 전용 요구사항 대응현황, 플랫폼 API 연계현황 포함)
- 최신 사전규격 기능목록 163개 반영 및 관리자 전용 요구사항 진도표 구성

## 실제 연동 미구현 범위

- Keycloak Admin/Event API 연동
- 실제 DB/API 연동
- Kubernetes/OpenStack/CMP 연동
- OpenMetadata/OpenSearch 자동 동기화
- 반입/반출 파일 저장소 연동
- 크레딧 차감/자원 제한 enforcement
- 알림/메일/첨부파일 서비스
- 플랫폼 API 실제 연동(현재는 PoC 기준 설계안/후보 목록)

## 보안 등급

- 보안등급은 `공개` / `내부` / `비밀`로 통일합니다.
- 보안등급 오타는 소스 코드와 문서에서 모두 제거되었습니다.

## 32.2단계 기능흐름 발표자료

- `proposal-package/국방지능형플랫폼포털_기능흐름_RFP대응_발표자료_32_2단계.pptx` — 기능 흐름 중심 RFP 대응 발표자료(33장)
- `proposal-package/국방지능형플랫폼포털_발표자_스크립트_32_2단계.md` — 슬라이드별 발표자 스크립트
- `proposal-package/국방지능형플랫폼포털_쉽게_이해하는_기능흐름.md` — 사용자용 쉬운 기능 설명자료
- `scripts/generate-feature-flow-ppt.py` — 32.2 PPT 자동 생성 스크립트
- `docs/SCREENSHOT_CAPTIONS.md`, `docs/PROPOSAL_SCREENSHOT_CATALOG.md`, `docs/PROPOSAL_BODY_IMAGE_GUIDE.md` — 34단계 반영 화면 캡션/카탈로그/본문 삽입 가이드

## 33단계 최종 공유 패키지

- `proposal-package/국방지능형플랫폼포털_최종제안공유패키지_33단계.zip` — 최종 공유용 ZIP (34단계 내용 반영, 약 1.5MB, 65개 항목)
- `proposal-package/final-share/` — ZIP 낸부 구조 (README, PPT, 설명자료, 캡처, RFP매핑, QA보고서, 스크립트)
- `proposal-package/FINAL_PACKAGE_INDEX.md` — 최종 패키지 인덱스
- `proposal-package/최종공유_안낸문_33단계.md` — 공유 안낸문
- `scripts/verify-final-package.py` — 패키지 검증 스크립트

## 34단계: 33.1단계 UI 반영 화면 재캡처, PPT 보정, 최종 ZIP 갱신

- 33.1단계 UI 변경사항(시연 배너 제거, 외부 운영도구 관리자 전용 이동)을 반영하여 production URL 기준 20개 화면 재촬영
- `OpenMetadata`/`OpenSearch` 일반 장표 캡처 제거, `플랫폼 운영도구` 관리자 장표 추가
- 화면중심/기능흐름중심 PPT 이미지 교체 및 디자인 보정(슬라이드 번호, 푸터, 제목 바)
- `docs/PROPOSAL_BODY_IMAGE_GUIDE.md` 추가로 제안서 본문 삽입용 이미지/캡션 정리
- `final-share/` 패키지 갱신 및 최종 ZIP 재생성 (65개 항목, 1.5MB, 무결성 통과)
- 문서 인덱스/변경이력/WBS/기술부채/결정사항/README 갱신
- GitHub push 인증 문제는 사용자 직접 `gh auth login` 또는 PAT 갱신 후 처리 필요

## 제안서 자료 패키지

- `proposal-package/` 디렉터리에 제안서 초안 문서, 발표자료 초안, 견적서 초안, 화면 캡처, 압축 파일이 포함되어 있습니다.
- `docs/PROPOSAL_OUTLINE.md`, `docs/PROPOSAL_DRAFT.md`, `docs/PROPOSAL_SLIDE_DRAFT.md`, `docs/ESTIMATE_DRAFT.md`, `docs/RFP_MAPPING_JUSTIFICATION.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/RISK_RESPONSE_PLAN.md`를 참고하세요.

## GitHub Push 인증 이슈

현재 PAT 인증 문제로 `git push origin main`이 실패할 수 있습니다.  
로컬 커밋은 생성되며, 사용자가 직접 `gh auth login` 또는 PAT 갱신 후 push를 수행할 수 있습니다.  
GitHub token, password, secret 값은 로그나 문서에 기록하지 않습니다.

## 라이선스

내용
- `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md` — 최종 요구사항 역검증 보고서(SFR-001~SFR-021 매핑 포함)


## 33.1단계 UI 정리

- 화면 상단 `시연 환경입니다...` 안내 배너 제거
- `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리` 카드를 일반 사용자 화면에서 제거하고 관리자 콘솔 `플랫폼 운영도구` 탭으로 이동
- 서비스/도구 카탈로그의 `OpenMetadata` 항목을 관리자 전용으로 필터링
- 접근 코드 로그인 화면의 `검증 환경...` 문구 제거
- 화면에 노출되는 `샘플 데이터` 문구를 `예시 데이터`로 정정
- Firebase Hosting 재배포 완료: https://kai-platform-d0ae0.web.app

## 34단계 요약

- 33.1단계 UI 변경사항을 반영하여 20개 화면 재촬영 및 PPT 이미지 교체
- 기능흐름중심 PPT를 34장으로 보정하고 슬라이드 번호/푸터/제목바를 추가
- `PROPOSAL_BODY_IMAGE_GUIDE.md`를 작성하여 제안서 본문 삽입용 이미지/캡션 정리
- 최종 ZIP을 갱신하고 `verify-final-package.py`로 검증 완료
- GitHub push는 PAT 인증 문제로 사용자 직접 처리 필요
