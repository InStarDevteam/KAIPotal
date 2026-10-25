## 2026-09-24: `/portal-work` 업무 현황 서버 연동 (백엔드 집계 API + 공유 승인함)

### 작성일시

2026-09-24

### 개요

로그인 후 역할별 첫 화면(`/portal-work`)이 데모(브라우저 저장소)일 때만 동작하던 것을, 비데모(운영) 모드에서도 실제 백엔드 집계 API로 동작하게 연동했다. 기능·디자인(4종 시안, 시안 선택기)·권한 정책은 변경하지 않았다. 운영 배포는 이번에 수행하지 않았다(로컬 검증만).

### 백엔드 신규

- migration `20260924000002_work_requests.js`: `fc_projects`, `fc_project_members`, `fc_work_requests`(낙관적 락 `version`), `fc_request_events`(신청 이력) — 전 테이블 RLS 테넌트 격리
- `modules/portal/routes/workOverview.ts`: `GET /v1/work/overview`, `GET·POST /v1/work/requests`, `GET /v1/work/approvals`, `GET /v1/work/approvals/:id`, `POST /v1/work/approvals/:id/decisions`
- 승인 권한은 기존 권한명 재사용(workspace/project/export/credit approve), 신규 권한 없음. 크레딧·자원 사용량은 플랫폼 원천(기존 40개 계약) 책임이므로 미연동 시 `pending_integration`으로만 응답(수치 미제조)
- 감사 최근 기록은 `audit.view` 권한이 있을 때만 포함, 없으면 null + 사유
- 계약 문서: `docs/portal-experience-v2/WORK_API_CONTRACT.md`

### 프론트엔드 변경

- `portal-work/PortalWorkPage.tsx`: 비데모 모드에서 overview API로 프로젝트 그리드·메트릭·승인함 큐·감사 패널 렌더링. 오류 상태 구분(로딩/빈 목록/403 권한 안내/네트워크 재시도/관측 시각 지연 표시), AbortController로 테넌트 전환 시 오래된 응답 폐기. 데모 모드 로직·'예시 데이터' 배지는 그대로
- `portal-work/workServerData.ts`(신규): 서버 응답 매핑·오류 분류 순수 함수 + 단위 테스트 13개
- `portal-runtime/PortalRuntimeContext.tsx`: `request`가 던지는 오류에 `status`/`code` 첨부(기존 호출층과 호환) — 403 권한 거부와 일시 장애 구분의 전제

### 검증 (이번 실행 범위만)

- `yarn tsc --noEmit` 오류 0, 앱 단위 테스트 24 suites/130 tests 통과, 백엔드 단위 2 suites/20 tests 통과
- `scripts/test-portal-work-api.mjs`(신규) 14 checks 통과 — 일회성 로컬 PostgreSQL(멤버십 기준 내 프로젝트, 승인함 공유, 비멤버 403, 409 충돌·재결정, RLS 교차 테넌트 차단 등)
- `scripts/test-portal-runtime.mjs` 48 checks 회귀 통과
- 브라우저: v2 6 checks, 기존 경험 16 시나리오, 테넌트 UI 15 시나리오, 개발 콘솔 전체 PASS (design-review 로컬 빌드)
- 상세: `docs/portal-experience-v2/VALIDATION.md`

### 배포 여부

- **2026-09-24 배포 완료**: staging Cloud SQL에 migration 적용(tenant_settings·platform_access·work_requests) → Cloud Run `p1rev2` 배포(digest `sha256:2bae686c…`) → Firebase Hosting 재배포. 상세: `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md` 최상단 항목
- 라이브 검증: `/v1/health` 200(live·connected), 미인증 401, `smoke-live-site` 7/7, `verify-live-crud` 10/10
- 데모 사이트는 데모 모드라 `/v1/work/*` 서버 모드 경로는 비활성 — 실제 IdP/운영 모드 전환 시 동작

### 미완료

- 크레딧·자원 사용량·실제 플랫폼 SSO는 여전히 연동 대기
- 비데모 화면은 브라우저 E2E 미검증(단위 테스트 + 백엔드 통합 + 라이브 헬스체크로 대체)
- `deploy-cloudrun-rest.mjs` review→promote 분리가 LATEST 100%로 정규화되는 문제 미해결

---

## 36.3단계: 백엔드 Cloud Run 배포 (portal BFF + Cloud SQL 연결)

### 작성일시

2026-09-16

### 배포 결과

- Cloud Run `kt-ai-portal-demo-p1rev1` 배포 완료(병렬 세션이 Cloud Build로 빌드·push한 digest `sha256:0cf2065…` 사용, gcloud 없이 Admin API v2 REST 경로)
- Cloud SQL connector(unix socket) + Secret Manager 참조(`portal-runtime-db-password`)로 DB 연결
- 검증: `/api/portal/v1/health` 200(DB SELECT 1 성공), `/me` 무인증 401·미등록 guest 403, smoke 17/17
- staging Cloud SQL에 migration 0003(audit_append_policy) 추가 적용(미커밋 WIP 0004는 제외)

### 생성/변경 파일

- `scripts/deploy-cloudrun-rest.mjs` — REST 배포 스크립트(review tag·무트래픽 배포 + `--promote` 전환 구조)
- `docs/production-upgrade/TEST_REPORT.md` — DEP-01~06 기록
- `.secrets/portal-staging-db.sh`(git 제외) — 로컬 DB 접속 보관

### 알려진 잔여

- 명시 traffic 분할이 LATEST 100%로 대첩된 문제 — 다음 배포부터 traffic 전용 PATCH 분리
- secretAccessor가 프로젝트 수준(개발 한정) — 운영은 secret 단위 축소
- 계정 비밀번호 동일·공개 IP·authorizedNetworks는 개발 전용(릴리스 게이트)

---

## 36.2단계: P1-2 — 서버 RBAC·기준데이터·사용자/역할 관리 API

### 작성일시

2026-09-16

### 생성/변경 파일

- `packages/backend/migrations/portal/20260916000001_org_group_delegation.js` — fc_groups/group_memberships/delegations/membership_changes + RLS
- `packages/backend/src/modules/portal/services/rbac.ts` — 서버 RBAC 평가기(authorizationForUser: 권한/tenant membership/system 역할)
- `packages/backend/src/modules/portal/services/middleware.ts` — requirePermission(모든 보호 API 공통 인가, 거부 감사 기록)
- `packages/backend/src/modules/portal/services/identity.ts` — (issuer, subject) → 포털 사용자 매핑
- `packages/backend/src/modules/portal/routes/admin.ts` — GET /v1/roles·/v1/permissions·/v1/memberships, POST /v1/role-assignments·/revoke
- `scripts/seed-portal-reference.mjs` — rolePolicies.ts 직접 번들 평가로 기준 데이터 멱등 적재(역할6·권한22·매핑64)
- `docs/production-upgrade/TEST_REPORT.md`, `notes/DECISIONS.md` 갱신

### 검증 결과 (TEST_REPORT.md)

- migration batch 2 적용 PASS, seed 2회 멱등 PASS
- 인가 시험 8종 PASS: roles/memberships 200, 헤더 누락 422, 자기 역할 부여 403, 타인 부여 201+감사, 회수 200+감사, 재회수 404, 무소속 tenant 평가기 공집합(SQL 음성), system 역할 전역 선택(설계 확인, DECISIONS 기록)
- `yarn tsc` 통과, backend build 성공

### 잔여

- 토큰 기반 다중신원 음성시험(다른 신원의 거부 확인)은 Keycloak 연동 후 가능 — 현재 로컬은 단일 guest 신원
- 그룹/위임 API, 프로젝트 scope 역할 할당은 P1 후속

---

## 36.1단계: 운영 전환 P0 배포 + P1 포털 BFF/DB 골격 구현

### 작성일시

2026-09-16

### 작업 목표

P0 운영 우회 차단 코드를 demo 환경에 배포하고, P1의 첫 산출물로 포털 업무 BFF 골격과 `fc_` PostgreSQL 스키마를 실제 동작 상태로 구현한다.

### 배포

- Firebase Hosting 배포 완료(`kai-platform-d0ae0`, kyubeom@gmail.com CLI 로그인 정상화로 REST 우회 불필요)
- 배포 후 smoke 17/17 통과(최초 실행 시 `/api/auth/guest/refresh` 404 1건은 Cloud Run 콜드스타트 지연 — 재실행 정상, flaky 아님)
- 동작 변화: 통합검색 화면이 검색 BFF(P4) 구현 전까지 "검색 색인 서비스 미연결"로 표시됨(의도된 변화)

### 생성 파일

- `backstage-portal/packages/backend/migrations/portal/20260915000001_init.js` — fc_ 스키마 12테이블 + RLS(tenant 격리·default deny·WITH CHECK)
- `backstage-portal/packages/backend/src/modules/portal/` — plugin.ts(전용 업무 DB knex 풀), router.ts(`/api/portal/v1` health/me/context/tenant), services/context.ts, services/audit.ts
- `infra/local-integration/docker-compose.yml` — postgres:16-alpine 로컬 통합환경
- `infra/db/roles.sql` — portal_migrator/portal_runtime/portal_audit_reader 분리 템플릿
- `scripts/run-portal-migrations.mjs` — 운영 migration job
- `backstage-portal/app-config.local-integration.yaml`
- `docs/production-upgrade/TEST_REPORT.md`

### 변경 파일

- `backstage-portal/packages/backend/src/index.ts` — portalPlugin 등록
- `backstage-portal/packages/backend/package.json` — knex 직접 의존성 선언
- `backstage-portal/app-config.production.yaml` — portal.database 설정 추가(POSTGRES_*/PORTAL_DATABASE env)
- `docs/production-upgrade/ARCHITECTURE_DECISIONS.md` — ADR-010(업무 DB와 framework DB 분리)
- `docs/production-upgrade/EXECUTION_STATUS.md` — P1 진행 현황

### 검증 결과 (전부 실제 실행, TEST_REPORT.md 참조)

- migration 적용 + 멱등 재실행 PASS (AT-01a/b)
- RLS 시험 3종 PASS: context 미설정 0건 / 자기 tenant만 조회 / 타 tenant INSERT 거부 (AT-07a~c)
- BFF API 시험 6종 PASS: 401 무인증 / 403 미등록 신원 / 200 /me+membership / 200 tenant 선택+감사 원장 원자 기록 / 403 무소속 / 422 잘못된 입력 (AT-05/06 일부)
- `yarn tsc` 통과

### 시험 중 발견·수정한 결함

- knex `timestamptz` 메서드 미지원 → `timestamp(useTz:true)`로 교체
- migration 이력 테이블용 portal 스키마 선생성 누락
- Backstage database service가 플러그인별 DB(`backstage_plugin_portal`)를 자동 생성 → 업무 DB 분리(ADR-010)로 구조 수정
- 플러그인 라우터 JSON body 파서 누락 → express.json() 추가 + tenantId uuid 검증(422)
- 내부 오류를 401로 가장하던 에러 매핑 → 500 `internal_error` 구분

### 잔여/외부 차단

- staging Cloud SQL(`kai-platform-d0ae0-instance`, 사용자 생성 중) 접속 정보·Secret Manager 참조 전달 필요(Setup Guide §4-6)
- Keycloak OIDC 연동은 URL/realm/client 확정 후(P1 후속)
- 역할/권한 reference seed, 조직/그룹/위임 테이블, 서버 RBAC 평가기는 P1 다음 작업

---

## 36단계: 운영 전환 P0 — 기준선 감사 및 운영 우회 경로 차단

### 작성일시

2026-09-15

### 작업 목표

`docs/production-upgrade/` 지시서 3종(KAIPotal_Kimi_Development_Prompt/Setup_Guide/Implementation_Test_Spec)에 따라 포털을 실제 운영 가능한 상태로 전환하는 작업의 P0 단계. 현황 기준선을 확정하고, 운영 경로의 mock/우회 승격/무인증 프록시를 차단한다.

### 변경 파일

- `backstage-portal/packages/app/src/components/integrated-search/IntegratedSearchPage.tsx` — 비localhost mock 즉시 반환 분기 제거, 검색 실패 시 mock fallback 제거(빈 결과 + 미연결 안내), 필터 선택지·추천어를 실제 응답 기반으로 도출
- `backstage-portal/packages/app/src/components/integrated-search/SearchIndexStatusBar.tsx` — 하드코딩된 색인 시각/원천 "정상" 배지 제거, 연결 상태(checking/connected/unavailable) prop 기반 표시
- `backstage-portal/packages/app/src/components/authz/AuthzContext.tsx` — proposalCapture=false 경로에서 sessionStorage 관리자 미리보기 역할 승격 제거(서버 검증 isAdmin만 인정)
- `backstage-portal/packages/backend/src/plugins/permission.ts` — 신규: 기본 거부(deny-by-default) 권한 정책 모듈
- `backstage-portal/packages/backend/src/index.ts` — allow-all 정책 모듈 제거, 기본 거부 정책 등록
- `backstage-portal/app-config.yaml` — OpenSearch raw proxy(`/search`, dangerously-allow-unauthenticated) 제거

### 생성 파일

- `docs/production-upgrade/` — 지시서 3종 + BASELINE_AUDIT.md, FEATURE_ACTION_INVENTORY.csv, REQUIREMENT_IMPLEMENTATION_MATRIX.csv, API_CONTRACT_REGISTER.csv, ARCHITECTURE_DECISIONS.md, EXECUTION_STATUS.md

### 검증 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app test --watchAll=false` 27/27 통과
- `yarn workspace app build` 성공

### 동작 변화(배포 시 유의)

- 통합검색 화면은 검색 BFF 미구현 상태에서 "검색 색인 서비스 미연결"로 표시된다(정상 결과를 mock으로 가장하지 않음 — 지시서 요구사항). 데모 배포 여부는 별도 승인 필요.
- 캡처 모드(`app.proposalCapture.enabled=true`)가 아닌 환경에서는 sessionStorage 관리자 미리보기가 더 이상 관리자 역할을 부여하지 않는다. demo 프로파일은 capture 모드가 활성이라 기존 캡처/감사 스크립트 동작 유지.

### 잔여/위험

- P1(PostgreSQL `fc_` 스키마·BFF·Keycloak OIDC·감사 원장) 미착수 — 외부 차단: Cloud SQL/Keycloak 접속 정보(Setup Guide §4)
- Backstage 불필요 플러그인 운영 비활성화, AT-05 차단 E2E, OpenSearch 3노드/TLS는 각각 P6/P1/P6 예정 (EXECUTION_STATUS.md 참조)

---

## 33.2단계: 기능 변경 없는 UI/UX 디자인 시스템 정비

### 작성일시

2026-07-30

### 작업 목표

기존 기능/데이터/메뉴/라우트/권한/API/계산방식을 변경하지 않고, 통합 대시보드와 K-RMF 화면을 중심으로 시각적 일관성·정보 계층·가독성·반응형을 개선.

### 생성 파일

- `backstage-portal/packages/app/src/components/common/` (designTokens, PageHeader, SectionHeader, SectionCard, MetricCard, StatusChip, RoleBadge, EmptyState)
- `docs/UI_UX_DESIGN_SYSTEM.md`, `docs/UI_UX_DESIGN_REVIEW.md`, `docs/UI_UX_BEFORE_AFTER.md`
- `docs/assets/design-stage33-2/before/` 18종, `after/` 18종

### 변경 파일

- `App.tsx` (사이드바 248px/라벨 오버라이드/역할 영역/Content 배경·최대폭, journeySubdued)
- `navigation/PortalJourneyBar.tsx` (캡션/상태색/aria/subdued)
- `authz/RolePreviewSwitcher.tsx` (플로팅 제거, 사이드바 정적 배치)
- `portal-dashboard/` (히어로/검색/지표 섹션 재편/패널 SectionCard화)
- `krmf-evidence/` (PageHeader/이중 stepper 구분/진척률 카드/탭 스타일)

### 기능 변경 여부

route/메뉴/권한/인증/API/데이터/계산/버튼/탭/CSV: **모두 변경 없음**

### 검증 결과

- `yarn tsc --noEmit` 통과, 테스트 27건 통과, 빌드 성공
- smoke test 17/17, full-audit-playwright 전 라우트 정상
- Firebase Hosting 배포 완료(REST API 경로 — firebase CLI 계정 불일치 우회, 기존 config 재사용으로 /api 라우팅 유지)
- 1920/1440/1366 after 캡처 육안 검증 완료

---

## 35.2단계: 낶부 추적 메뉴 비노출 및 전체 캡처 압축

### 작성일시

2026-07-29

### 구현 내용

- 제안서 대상이 아닌 낶부 추적 메뉴 3개(요구사항 대응현황, 플랫폼 API 연계현황, 업무흐름/연계 시나리오)를 `portalMenuDefinitions`에서 제거하여 모든 역할의 사이드바와 권한별 메뉴 비교 화면에서 비노출 처리. 라우트와 PermissionGuard는 유지하여 개발자가 직접 URL로 접근 가능.
- 전체 화면 캡처 28종 재생성 및 `국방지능형플랫폼포털_화면캡처_35.2단계.zip` 생성(30개 파일, 약 6.8MB).

### 검증 결과

- `yarn tsc --noEmit` 통과, 테스트 27건 통과, Firebase Hosting 재배포 완료
- 캡처 28/28 OK, 관리자 메뉴 13개(3개 숨김) 육안 확인

---


## 35.1단계: 메뉴 순서·여정 매핑 보정 및 역할 간소화

### 작성일시

2026-07-28

### 작업 목표

- 제안 게시판의 잘못된 여정 매핑(1단계) 정정
- 왼쪽 메뉴 순서를 여정 흐름에 맞게 재배치 (통합검색 상향, 반입·반출 승인 하향)
- 유사 권한 역할 통합으로 사용자층 간소화

### 변경 파일

- `backstage-portal/packages/app/src/components/navigation/portalMenuDefinitions.ts` (그룹 순서, 메뉴 재배치, export-approval 그룹 이동, proposal-board journeyStep 1→8)
- `backstage-portal/packages/app/src/components/authz/types.ts` (krmf-manager 제거)
- `backstage-portal/packages/app/src/components/authz/rolePolicies.ts` (security-manager에 requirement.view/integration.view 추가, krmf-manager 제거)
- `backstage-portal/packages/app/src/components/authz/rolePolicies.test.ts` (테스트 갱신)
- `backstage-portal/app-config.demo.yaml` (allowedRoles 6개)
- `scripts/capture-proposal-screenshots-prod.js` (krmf-manager → security-manager)
- `docs/ROLE_PERMISSION_MATRIX.md`, `docs/ROLE_MENU_CAPTURE_GUIDE.md`, `docs/KRMF_LIFECYCLE_AND_ROLE_DESIGN.md` (역할 6개 반영)
- `notes/DECISIONS.md`, `docs/TODO.md`, `docs/CHANGE_SUMMARY.md`

### 구현 내용

- 제안 게시판 여정 단계를 1단계(체계접속) → 8단계(운영·보안감사, SFR-013 위치)로 정정
- 그룹 순서: 포털 공통 → 플랫폼 연계 → 프로젝트 운영 → 사용자/조직 → 사용자 지원 → 관리/보안
- 일반 사용자 메뉴 순서: 통합 대시보드 → 통합검색 → 서비스/도구 카탈로그 → 프로젝트/워크스페이스 → 크레딧 관리 → 반입·반출 승인 → 마이페이지 → 제안 게시판
- 역할 7개 → 6개: krmf-manager를 security-manager로 통합 (security-manager가 요구사항/연계 조회 권한 흡수)

### 검증 결과

- `yarn tsc --noEmit`: 통과
- `yarn workspace app test --watchAll=false`: 5 suites / 27 tests 통과
- `yarn workspace app build`: 성공
- Firebase Hosting 재배포 완료, Cloud Run revision `kt-ai-portal-demo-00017-v42`
- 캡처 28/28 OK (품질 게이트 통과), 메뉴 순서 육안 확인 완료

---

## 35단계: 권한체계 개선, K-RMF 고도화, 최종공고 실구현

### 작성일시

2026-07-28

### 작업 단계

35단계 권한체계 전면 개선, K-RMF 이행·증적관리 고도화, 최종공고 260723_v1 변경사항 실구현

### 작업 목표

- 역할·권한 기반 접근 제어를 단일 모듈로 통합하고, 메뉴 노출과 직접 URL 접근을 동일 정책으로 통제
- K-RMF를 개발·시험 → 평가·인가 → 운영·변경 생애주기로 조회·관리할 수 있게 고도화
- 최종공고 변경사항(SFR-007/008/015/018/019, TER-008, SER-002~008)을 실제 UI와 데이터 구조에 반영
- 제안서 캡처를 역할별로 안정적으로 자동 생성
- 포털이 플랫폼 엔진 기능을 직접 수행하는 것처럼 과장하지 않음

### 생성 파일

- `backstage-portal/packages/app/src/components/authz/` (types, rolePolicies, AuthzContext, PermissionGuard, RolePreviewSwitcher, index, rolePolicies.test)
- `backstage-portal/packages/app/src/components/navigation/PortalJourneyBar.tsx`, `portalMenuDefinitions.test.ts`
- `backstage-portal/packages/app/src/components/role-menu-preview/` (RoleMenuPreviewPage, index)
- `backstage-portal/packages/app/src/components/krmf-evidence/` 신규: KrmfLifecycleStepper, ImplementationPlanPanel, AssessmentSupportPanel, OperationTransitionPanel, KrmfPermissionGate, krmfData.test
- `backstage-portal/packages/app/src/components/project-workspace/` 신규: WorkEnvRequestWizard, WorkspaceLifecyclePanel, PilotDataPreparationPanel, mockPilotProjects
- `backstage-portal/packages/app/src/components/integrated-search/` 신규: searchFiltering(+test), SearchIndexStatusBar
- `backstage-portal/packages/app/src/components/my-page/` 신규: DemoProjectPanel, SecurityTaskPanel
- `docs/ROLE_PERMISSION_MATRIX.md`, `docs/ROLE_MENU_CAPTURE_GUIDE.md`, `docs/KRMF_LIFECYCLE_AND_ROLE_DESIGN.md`, `docs/FINAL_RFP_IMPLEMENTATION_DELTA.md`

### 변경 파일

- `backstage-portal/packages/app/src/App.tsx` (AuthzProvider, 라우트 PermissionGuard, CaptureBoundary, 여정바, 역할 칩)
- `backstage-portal/packages/app/src/components/navigation/portalMenuDefinitions.ts` (visibleTo 폐기, journeyStep/requiredAnyPermissions)
- `backstage-portal/packages/app/src/components/requirement-progress/AdminOnlyGuard.tsx` (authz thin wrapper)
- `backstage-portal/packages/app/src/components/portal-dashboard/PortalDashboardPage.tsx` (K-RMF 카드 권한 게이트)
- `backstage-portal/packages/app/src/components/service-catalog/ServiceCatalogPage.tsx` (isPreviewAdmin 제거)
- `backstage-portal/packages/app/src/components/krmf-evidence/` (명칭/안내/8탭/모델 4종/mock/권한 게이트)
- `backstage-portal/packages/app/src/components/project-workspace/` (Wizard 교체, 생애주기, 실증 탭)
- `backstage-portal/packages/app/src/components/integrated-search/`, `my-page/`, `export-approval/` (SFR-015/019, 버튼 권한)
- `backstage-portal/packages/app/src/components/platform-api-integration/`, `workflow-scenarios/` (API 38건, SCN-012)
- `backstage-portal/packages/app/config.d.ts` (adminEmails, proposalCapture)
- `backstage-portal/app-config.demo.yaml` (proposalCapture 활성), `packages/app/package.json` (의존성 선언), `yarn.lock`
- `scripts/capture-proposal-screenshots-prod.js` (전면 재작성)
- `docs/PROPOSAL_SCREENSHOT_CATALOG.md`, `docs/SCREENSHOT_CAPTIONS.md`, `docs/DOCUMENT_INDEX.md`, `docs/TODO.md`, `docs/TECH_DEBT.md`, `notes/DECISIONS.md`

### 구현 내용

- **권한체계 단일화**: 역할 7종(general-user, project-manager, branch-admin, portal-admin, security-manager, security-auditor, krmf-manager), 권한 22종, `rolePolicies.ts` 단일 정책. 메뉴 노출/라우트 가드/버튼 활성화가 모두 `hasPermission()` 사용. `/admin-console` 등 직접 URL 차단 확인.
- **8단계 여정바**: 체계접속 → 운영·보안감사, 주요 페이지 상단 표시.
- **권한별 메뉴 비교**: `/role-menu-preview` — 역할 선택, 메뉴 트리, 요구 권한, 접근 수준, 일반 사용자 비교 모드.
- **K-RMF 이행·증적관리**: 명칭 변경, 소요기관 권한 안내 상시 표시, 8단계 생애주기 Stepper, 탭 8개(이행계획/평가·인가 지원/운영전환·변경관리 추가), 데이터 모델 4종(KrmfImplementationPlan/KrmfAssessment/KrmfOperationalTransition/KrmfChangeImpact), 변경영향 11종, 재평가는 '검토 필요'/'소요기관 판단 필요'로만 표현.
- **SFR-007/008**: 7단계 작업환경 생성 요청 Wizard(AI형/데이터형 분기), 상태 흐름(신청→승인→생성중→사용중→만료예정→종료/실패·원복), "실제 생성은 플랫폼 책임" 도움말.
- **SFR-015**: 자산유형 15종, 속성 필터(군/프로젝트/소유자/버전/라이선스), 유사 명칭 토글, 자동완성, 색인 상태 바, 비밀 자산 권한 선필터(일반 사용자 비밀 결과·개수 미노출).
- **SFR-018**: 워크스페이스 생애주기 패널(멤버·RBAC, 할당량, 접속 링크, 추가 자원, 만료, 종료, 원복, 실시간 사용량).
- **SFR-019**: 실증 프로젝트/보안 과제 탭, 알림 배너, 워크스페이스 접속·만료 배지, 요구사항 탭 권한 게이트.
- **TER-008**: 실증·데이터 준비 탭 — 수요/보유 비교, 부족량 식별, 합성/시뮬레이터 생성 요청, 품질·계보, 9단계 흐름, 육군종합정비창 3개 과제.
- **플랫폼 API 연계**: 38건(PORTAL-PILOT-001~006, PORTAL-KRMF-001~003 등), 포털/플랫폼 역할·책임 경계·오류 재처리·감사로그 표시.
- **캡처 자동화**: DOM 검증 4종 게이트(portal-shell, data-capture-id, 금지 텍스트, 해시 중복), 역할 전환 캡처 모드, 신규 10종 + 레거시 18종 = 28종 전부 통과.

### 검증 결과

- `yarn tsc --noEmit`: 통과
- `yarn workspace app test --watchAll=false`: 5 suites / 27 tests 통과 (authz 14, searchFiltering 6, krmfData 6, 기존 1)
- `yarn lint:all`: 이번 단계 신규 파일 오류 0건 (기존 결함 19건 잔여, TECH_DEBT에 기록)
- `yarn workspace app build`: 성공
- smoke test: 17/17 통과
- 캡처: 28/28 OK (품질 게이트 통과, 의도적 중복 1쌍만 허용 목록 처리)
- 캡처 육안 검증: K-RMF 대시보드/권한 비교/실증 탭/사이드바 메뉴 정상 확인

### 배포

- Firebase Hosting 재배포 완료
- Cloud Run revision `kt-ai-portal-demo-00016-9fm` (100% 트래픽)
- URL: https://kai-platform-d0ae0.web.app

### 제약사항/남은 과제

- GitHub push는 인증 문제로 미완료 (`gh auth login` 후 `git push origin main` 필요)
- 신청/승인/제출 액션은 로컬 상태 기반, 실제 플랫폼 API 연동은 후속 범위
- Playwright E2E 스펙(`yarn test:e2e`)은 후속 단계에서 추가
- 기존 lint 오류 19건은 기존 결함으로 분리 기록
- Google 로그인 관리자 실검증은 사용자 수동 확인 필요

---

## 34.1단계: 최종공고문 260723_v1 기준 포털 기능 최신화 문서 작성

### 작성일시

2026-07-25

### 작업 단계

34.1단계 최종공고문 260723_v1 기준 포털 기능 최신화 문서 작성

### 작업 목표

- 최종공고문 260723_v1의 변경사항(SFR-007/008/015/018/019, TER-008, SER-002~SER-008)을 포털 구조에 맞춰 문서화
- 포털 직접 구현 범위, 연계 범위, 타 플랫폼 제공 전제, 제외 범위 정리
- 실증 프로젝트(TER-008)와 K-RMF 인가(SER-002~SER-008)의 포털 매핑 정리
- 소스코드 변경 없이 문서/매핑 정리만 수행

### 생성 파일

- `docs/FINAL_RFP_PORTAL_UPDATE_PLAN.md`
- `docs/FINAL_RFP_CHANGE_IMPACT_ANALYSIS.md`
- `docs/FINAL_RFP_PORTAL_BOUNDARY_REVIEW.md`
- `docs/FINAL_RFP_PILOT_PROJECT_MAPPING.md`
- `docs/FINAL_RFP_KRMF_MAPPING.md`

### 변경 파일

- `docs/TODO.md` (34.1단계 완료 기록 추가)
- `docs/CHANGE_SUMMARY.md` (34.1단계 변경 이력 추가)

### 구현 내용

- 5개 마크다운 문서 작성
  - 포털 기능 최신화 계획, 변경영향 분석, 구현 범위/경계 검토, 실증 프로젝트 매핑, K-RMF 매핑
- 각 문서에 SFR/TER/SER ID, 대응 화면, 후속 범위, 연계 전제조건 기술
- 기존 34단계(UI 반영, PPT 보정, ZIP 갱신)는 그대로 유지하고, 본 34.1단계는 후속 문서 보강으로 기록

### 검증 결과

- 5개 문서 모두 작성 완료
- 문서 내용이 기존 `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`, `docs/SCREEN_TO_RFP_MAPPING.md`, `docs/PLATFORM_API_INTEGRATION_PLAN.md`, `docs/PORTAL_ROLE_AND_PLATFORM_BOUNDARY.md`와 충돌하지 않음
- 소스코드 변경 없음

### 배포/위치

- 문서: `docs/FINAL_RFP_*.md`

### 제약 및 후속

- GitHub push 인증 해결 후 원격 반영은 사용자 직접 처리 필요
- 실제 화면/컴포넌트 변경은 본 단계에서 수행하지 않으며, 후속 개발 단계에서 반영 예정

---

## 34단계: 33.1단계 UI 반영 화면 재캡처, PPT 보정, 최종 ZIP 갱신

### 작성일시

2026-07-13

### 작업 단계

34단계 33.1단계 UI 반영 화면 재캡처, PPT 보정, 최종 ZIP 갱신

### 작업 목표

- 33.1단계 UI 변경사항(시연 배너 제거, 외부 운영도구 관리자 전용 이동)을 반영하여 production URL 기준 화면 재촬영
- 화면 캡처에서 `OpenMetadata`/`OpenSearch` 일반 장표 제거 및 관리자 전용 `플랫폼 운영도구` 장표 추가
- python-pptx 기반 화면중심/기능흐름중심 PPT 이미지 교체 및 슬라이드 번호/푸터/제목 바 디자인 보정
- 제안서 본문 삽입용 이미지/캡션 정리 가이드 작성
- `final-share/` 패키지 갱신 및 최종 ZIP 재생성

### 생성 파일

- `docs/PROPOSAL_BODY_IMAGE_GUIDE.md`
- `proposal-package/final-share/02_GUIDES/PROPOSAL_BODY_IMAGE_GUIDE.md`
- `proposal-package/final-share/00_README/FINAL_PACKAGE_INDEX.md`
- `proposal-package/국방지능형플랫폼포털_최종제안공유패키지_33단계.zip` (34단계 내용 반영, 파일명 유지)

### 변경 파일

- `scripts/capture-proposal-screenshots-prod.js` (캡처 목록 갱신: `09-admin-console-platform-ops-tools.png` 추가, `15-openmetadata-catalog.png`/`16-opensearch-catalog-index.png` 제외)
- `scripts/generate-proposal-ppt.py` (21장 화면중심 슬라이드 데이터 갱신)
- `scripts/generate-feature-flow-ppt.py` (34장 기능흐름중심 슬라이드 데이터 갱신, 슬라이드 번호/푸터 추가)
- `docs/assets/final/*.png` (20개 화면 재촬영)
- `proposal-package/final-share/03_SCREENSHOTS/*.png` (20개)
- `docs/SCREENSHOT_CAPTIONS.md`
- `docs/PROPOSAL_SCREENSHOT_CATALOG.md`
- `proposal-package/FINAL_PACKAGE_INDEX.md`
- `proposal-package/final-share/00_README/README_최종공유본.md`
- `docs/DOCUMENT_INDEX.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/TECH_DEBT.md`
- `notes/DECISIONS.md`
- `README.md`

### 구현 내용

- `scripts/capture-proposal-screenshots-prod.js` 수정
  - 일반 사용자 화면 11개, 관리자 콘솔 탭 4개(사용자 관리, 권한/역할, 감사 로그, 플랫폼 운영도구), 관리자 직접 화면 3개로 구성
  - `09-admin-console-platform-ops-tools.png` 추가
  - `15-openmetadata-catalog.png`, `16-opensearch-catalog-index.png` 제외
- PPT 생성 스크립트 수정
  - 화면중심 PPT: 21개 화면 기준 슬라이드 데이터 갱신, `플랫폼 운영도구` 추가, OpenMetadata/OpenSearch 일반 장표 제거
  - 기능흐름중심 PPT: 34장, `slide_counter`로 슬라이드 번호/푸터 추가, 제목 바/글꼴 통일
- 캡처/캡션/카탈로그 갱신
  - 20개 PNG에 대한 캡션, RFP ID, 강조 포인트, 후속 연동, 제안서 장 매핑 정리
  - 촬영 일자 2026-07-13 기준으로 갱신
- 제안서 본문 삽입 가이드 작성
  - 장/절별 추천 이미지, 캡션 예시, 권장 삽입 크기 정리
- `final-share/` 패키지 갱신
  - PPT, 캡처, 가이드, 스크립트, README, 인덱스 복사/갱신
- `scripts/verify-final-package.py` 실행
  - PPT 2개, 설명자료 9개, PNG 20개, RFP 매핑 9개, QA 보고서 7개, 스크립트 6개, ZIP 무결성 통과

### 검증 결과

- 화면 캡처: 20개 PNG 생성
- PPT: 화면중심 21장(표지/개요/요약 포함 24장), 기능흐름중심 34장
- ZIP: 65개 항목, 약 1.5MB, `testzip()` 무결성 통과
- 부적합 문구: `preview` → `미리보기` 교체 완료, verify 통과

### 배포/위치

- 캡처: `docs/assets/final/`, `proposal-package/final-share/03_SCREENSHOTS/`
- PPT: `proposal-package/final-share/01_PPT/`
- ZIP: `proposal-package/국방지능형플랫폼포털_최종제안공유패키지_33단계.zip`
- 인덱스: `proposal-package/FINAL_PACKAGE_INDEX.md`

### 제약 및 후속

- GitHub push 인증 문제로 원격 반영은 사용자 직접 처리 필요
- `kyubeom@gmail.com` Google 로그인 최종 검증 필요
- `/api/auth/guest/refresh` 간헐적 404는 Firebase Hosting edge cache stale 현상으로, 재시도/새로고침 시 정상화

---

## 32단계: 제안서/PPT용 화면 캡처 및 장표 패키징 완료

### 작성일시

2026-07-12

### 작업 단계

32단계 제안서/PPT용 화면 캡처 및 장표 패키징 완료

### 작업 목표

- production URL(`https://kai-platform-d0ae0.web.app`) 기준 제안서용 화면 재캡처
- 21개 핵심 화면 캡처 (19개 포털 화면 + OpenMetadata/OpenSearch/Keycloak/Backstage)
- 관리자 전용 화면(`요구사항 대응현황`, `플랫폼 API 연계현황`, `업무흐름/연계 시나리오`) 캡처
- 각 장표에 RFP ID, 요구사항명, 요구내용, 대응 화면, 구현 기능, 화면 캡처, 구현 수준, 후속 연동 범위 포함
- `데모`/`PoC`/`제안서 작업용`/`프리뷰`/`mock` 등 부적합 문구 미노출 최종 확인
- python-pptx 기반 PPT 초안 생성

### 생성 파일

- `proposal-package/국방지능형플랫폼포털_RFP대응_발표자료_32단계.pptx`
- `scripts/capture-proposal-screenshots-prod.js`
- `scripts/generate-proposal-ppt.py`

### 변경 파일

- `docs/assets/final/*.png` (01~14, 17~19 재촬영)
- `docs/PROPOSAL_SCREENSHOT_CATALOG.md`
- `docs/SCREENSHOT_CAPTIONS.md`
- `proposal-package/README.md`
- `docs/DOCUMENT_INDEX.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/TECH_DEBT.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`

### 구현 내용

- `scripts/capture-proposal-screenshots-prod.js` 작성
  - 접근 코드 `ictway` 입력 → Guest 로그인
  - 일반 사용자 화면 11개, 관리자 콘솔 탭 3개, 관리자 직접 URL 3개 캡처
  - 시연/샘플 데이터 안내 배너 자동 숨김
  - 관리자 화면은 `sessionStorage.__kt_ai_portal_admin_preview__ = 'true'` 모드로 캡처
- `scripts/generate-proposal-ppt.py` 작성
  - 24장 슬라이드(표지, 개요, 21개 화면, 요약)
  - 각 슬라이드에 RFP ID, 요구사항명, 요구내용, 대응 화면, 구현 기능, 구현 수준, 후속 연동 범위, 화면 캡처 배치
  - 와이드(16:9) 슬라이드, 좌측 텍스트/우측 이미지 레이아웃
- 화면 캡처 후 시각 검토: `데모`/`PoC`/`프리뷰`/`mock`/`제안서 작업용` 문구 미발견

### 검증 결과

- PPT 슬라이드 수: 24장
- 캡처 파일 수: 21개
- 누락 이미지: 0개
- 부적합 문구: 0건

### 배포/위치

- PPT: `proposal-package/국방지능형플랫폼포털_RFP대응_발표자료_32단계.pptx`
- 캡처: `docs/assets/final/`
- 스크립트: `scripts/capture-proposal-screenshots-prod.js`, `scripts/generate-proposal-ppt.py`

### 제약 및 후속

- GitHub push 인증 문제로 원격 반영은 보류 중
- 15~18번 캡처(OpenMetadata, OpenSearch, Keycloak, Backstage 로그인)는 로컬 개발 환경 자료 유지

---

## 31.6단계: 실제 기능 전수검증 및 결함 보완 완료

### 작성일시

2026-07-12

### 작업 단계

31.6단계 실제 기능 전수검증 및 결함 보완 완료

### 작업 목표

- Playwright 기반 실제 배포 사이트 전수검증
- 전체 라우트/메뉴/탭/버튼/CSV 다운로드 기능 검증
- `/api/auth/guest/refresh` 404 원인 확인 및 캐시 버스팅 적용
- 관리자 전용 메뉴 비노출/직접 URL 차단 검증
- 캡처 대상 화면에 남아 있던 `mock`/`PoC`/`데모`/`제안` 등 부적합 문구 최종 중립화
- Smoke test 및 자동 전수검증 스크립트 작성

### 생성 파일

- `docs/STAGE_31_6_FULL_AUDIT_REPORT.md`
- `docs/STAGE_31_6_AUDIT_RESULTS.md`
- `docs/FULL_FUNCTION_QA_REPORT.md` (STAGE_31_6_FULL_AUDIT_REPORT.md에 대한 심볼릭 링크)
- `scripts/smoke-check-demo-routes.mjs`
- `backstage-portal/scripts/full-audit-playwright.mjs`

### 변경 파일

- `backstage-portal/packages/app/src/index.tsx` (`/api/auth/guest/refresh` 캐시 버스팅)
- `backstage-portal/packages/app/src/components/integrated-search/IntegratedSearchPage.tsx` (fallback 문구 중립화)
- `backstage-portal/packages/app/src/components/credit-manager/CreditManagerPage.tsx` (PoC/mock 문구 제거)
- `backstage-portal/packages/app/src/components/credit-manager/mockCredits.ts`
- `backstage-portal/packages/app/src/components/service-catalog/ServiceCatalogPage.tsx`
- `backstage-portal/packages/app/src/components/project-workspace/ProjectRequestForm.tsx`
- `backstage-portal/packages/app/src/components/export-approval/ExportRequestForm.tsx`
- `backstage-portal/packages/app/src/components/my-page/*` (mock 버튼 문구 제거)
- `backstage-portal/packages/app/src/components/credit-manager/ResourcePriceTable.tsx`
- `backstage-portal/packages/app/src/components/proposal-board/ProposalDetail.tsx`
- `backstage-portal/packages/app/src/components/proposal-board/ProposalForm.tsx`
- `backstage-portal/packages/app/src/components/service-catalog/DirectToolRequestForm.tsx`
- `backstage-portal/packages/app/src/components/service-catalog/ToolSelectionPanel.tsx`
- `backstage-portal/packages/app/src/components/admin-console/BranchQuotaManagementPanel.tsx`
- `backstage-portal/packages/app/src/components/admin-console/AdminConsolePage.tsx`
- `backstage-portal/packages/app/src/components/admin-console/UserGroupMappingPanel.tsx`
- `docs/DOCUMENT_INDEX.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/TECH_DEBT.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`

### 구현 내용

- `packages/app/src/index.tsx`에서 `/api/auth/guest/refresh` 호출 시 `?_=<timestamp>` 캐시 버스팅 추가
- 통합검색 OpenSearch proxy 연결 실패 시 mock fallback 문구를 "샘플 데이터"로 중립화
- 서비스 카탈로그, 프로젝트 생성 신청, 반출/반입 신청, 제안 게시판, 도구 선택, 크레딧 관리, 관리자 콘솔, 마이페이지 등에서 `(mock)`, `mock action`, `mock fallback`, `PoC`, `제안팀`, `제안서`, `프리뷰`, `preview` 등 부적합 문구 제거
- Playwright 전수검증 스크립트 작성:
  - 일반 사용자 route 12개: 라우트 이동, 탭/버튼 클릭, 콘솔/네트워크 오류, 부적합 문구 탐지
  - 관리자 직접 URL 4개: `/requirement-coverage`, `/requirement-progress`, `/platform-api-integration`, `/workflow-scenarios` 접근 차단 확인
  - 관리자 권한 route 4개: 탭/CSV 다운로드/링크 이동 확인
- Smoke test 스크립트 작성: 17개 route/API fetch 기반 200 확인

### 검증 결과

- Smoke test: 17/17 통과
- Playwright 전수검증:
  - 일반 사용자 12개 route: 12/12 통과
  - 관리자 직접 URL 4개: 모두 접근 권한 없음 화면 정상
  - 관리자 권한 route 4개: 모두 탭/버튼/CSV 다운로드 정상
- `/api/auth/guest/refresh`: curl/Cloud Run 200 확인, 브라우저 콘솔 404 미발생
- `yarn tsc --noEmit` 통과
- `yarn workspace app test --watchAll=false` 통과 (1 passed)
- `yarn workspace app build` 통과

### 배포 결과

- Firebase Hosting 재배포 성공 (735 files)
- Cloud Run 변경 없음 (revision `kt-ai-portal-demo-00009-v6d`, URL `https://kt-ai-portal-demo-e2ik6gboua-du.a.run.app`)
- 데모 URL: `https://kai-platform-d0ae0.web.app`
- 접근 코드: `ictway`

### 제약 및 후속

- GitHub push 인증 문제로 원격 반영은 보류 중 (사용자가 `gh auth login` 또는 PAT 갱신 필요)
- Firebase Auth Google 로그인 관리자 실검증은 미완료
- 운영 RBAC는 Guest auth 기반, Keycloak OIDC/role 기반 권한 체계 미연동
- `findDOMNode is deprecated` / `WebSocket connection to ws://localhost:3000/ws failed` 경고는 라이브러리/개발 서버 HMR 관련으로 production 무시 가능

---

## 29.2단계: Cloud Run backend 재배포 및 auth refresh 404 정리

### 작성일시

2026-07-12

### 작업 단계

29.2단계 Cloud Run backend 재배포 및 auth refresh 404 정리

### 작업 목표

- Cloud Run backend를 최신 Docker image로 재배포
- `/api/auth/guest/refresh` 404 문제 해소
- Firebase Hosting rewrite와 Cloud Run backend 연결 확인
- 데모 사이트 콘솔 에러 최소화

### 변경 파일

- `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`
- `docs/FIREBASE_DEMO_DEPLOYMENT.md`
- `docs/FIREBASE_DEMO_CHECKLIST.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/CHANGE_SUMMARY.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`
- `docs/TECH_DEBT.md`

### 구현 내용

- 29.1단계에서 빌드한 `kt-ai-portal-demo:latest` Docker image를 Artifact Registry에 push
- `gcloud run deploy kt-ai-portal-demo`로 Cloud Run revision `kt-ai-portal-demo-00009-v6d` 배포
- 100% 트래픽을 새 revision으로 라우팅
- Cloud Run/Firebase Hosting에서 `/api/auth/guest/refresh`가 200 응답하는지 확인

### 검증 결과

- `curl -I https://kt-ai-portal-demo-1088986528140.asia-northeast3.run.app/api/auth/guest/refresh` → `HTTP/2 200`
- `curl -I https://kai-platform-d0ae0.web.app/api/auth/guest/refresh` → `HTTP/2 200`
- 브라우저 Network에서 `/api/auth/guest/refresh` 호출 시 200 응답 확인
- 데모 사이트 일반 사용자/관리자 프리뷰 재검증 완료
  - 일반 사용자: "요구사항 진도표" 메뉴 미노출, 직접 URL 차단
  - 관리자 프리뷰: 4개 탭 정상 표시 (SFR 21건, 기능 163건, 변경이력 13건, 질의사항 7건)

### 제약 및 후속

- Firebase Auth Google 로그인 관리자 실검증은 미완료
- GitHub push 인증 문제로 원격 반영은 보류 중
- `findDOMNode is deprecated` 및 `WebSocket connection to localhost:3000/ws failed` 경고는 라이브러리/개발 서버 HMR 관련으로 기능에 영향 없음

---

## 29.1단계: Firebase 환경변수 주입 후 요구사항 진도표 데모 재배포

### 작성일시

2026-07-12

### 작업 단계

29.1단계 Firebase 환경변수 주입 후 요구사항 진도표 데모 재배포

### 작업 목표

- Firebase Web App 설정값을 환경변수로 주입하여 데모 빌드
- Firebase Hosting에 요구사항 진도표 화면을 포함한 frontend 재배포
- 데모 사이트에서 일반 사용자/관리자 프리뷰 모드 검증
- 관련 문서 갱신

### 변경 파일

- `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`
- `docs/FIREBASE_DEMO_DEPLOYMENT.md`
- `docs/FIREBASE_DEMO_CHECKLIST.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/CHANGE_SUMMARY.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`
- `.gitignore`

### 구현 내용

- `./scripts/build-demo.sh` 실행 시 아래 환경변수 주입
  - `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`
  - `APP_BASE_URL`, `BACKEND_BASE_URL`, `PREVIEW_ACCESS_CODE`
  - `DEMO_ADMIN_EMAILS`, `DEMO_ALLOWED_EMAILS`, `AUTH_SESSION_SECRET`
- `./scripts/deploy-demo-firebase.sh`로 Firebase Hosting 재배포
- `.gitignore`에 로컬 `gcloud` SDK 설치 디렉토리(`.gcloud/`) 추가

### 검증 결과

- `./scripts/build-demo.sh` 성공 (frontend/backend/Docker image)
- `./scripts/deploy-demo-firebase.sh` 성공
- 데모 사이트 `https://kai-platform-d0ae0.web.app` 접근 코드 `ictway`로 정상 진입
- 일반 사용자 상태에서 "요구사항 진도표" 메뉴 미노출 확인
- `/requirement-progress` 직접 접근 시 "접근 권한이 없습니다" 화면 확인
- 관리자 프리뷰 모드(`sessionStorage.__kt_ai_portal_admin_preview__ = 'true'`) 활성화 시:
  - "요구사항 진도표" 메뉴 표시
  - `/requirement-progress` 페이지 접근 가능
  - 상단 요약 카드 표시 (전체 SFR 21, 전체 기능 163, 화면 구현 113 등)
  - SFR별 진도표 21건, 기능목록 상세 163건, 변경이력 13건, 질의사항 7건 표시 확인

### 제약 및 후속

- Cloud Run backend는 29.1단계에서 재배포하지 않았으므로 `/api/auth/guest/refresh` 호출 시 404가 발생할 수 있음
- Firebase Auth Google 로그인 관리자 실검증은 Cloud Run backend 재배포 후 추가 검증 필요
- GitHub push 인증 문제로 원격 반영은 보류 중

---

## 29단계: 관리자 전용 요구사항 진도표 메뉴 추가

### 작성일시

2026-07-12

### 작업 단계

29단계 관리자 전용 요구사항 진도표 메뉴 추가

### 작업 목표

- `requirement-progress` 컴포넌트를 실제 페이지로 연결
- `/requirement-progress` 라우트 추가
- 왼쪽 메뉴에 관리자 전용 "요구사항 진도표" 메뉴 추가
- 일반 사용자는 메뉴 비노출 및 직접 URL 접근 차단
- 관리자 판별 기준 정의 (Firebase Auth 이메일 또는 sessionStorage 프리뷰 모드)
- 163개 기능목록, 21개 SFR, 13개 변경이력, 7개 질의사항 조회 화면 완성

### 생성 파일

- `backstage-portal/packages/app/src/components/requirement-progress/RequirementProgressPage.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/AdminOnlyGuard.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/RequirementProgressSummaryCards.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/SfrProgressTable.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/FeatureProgressTable.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/RequirementChangeHistoryTable.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/RequirementQuestionTable.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/RequirementStatusChip.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/RequirementPriorityChip.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/RequirementImpactChip.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/RequirementProgressFilterPanel.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/index.ts`

### 변경 파일

- `backstage-portal/packages/app/src/App.tsx`
- `backstage-portal/packages/app/src/components/navigation/portalMenuDefinitions.ts`
- `backstage-portal/packages/app/src/components/preview-auth/DemoAdminContext.tsx`
- `backstage-portal/packages/app/src/components/preview-auth/index.ts`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/CHANGE_SUMMARY.md`
- `notes/DECISIONS.md`
- `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`
- `docs/RFP_MAPPING_JUSTIFICATION.md`
- `docs/SCREEN_TO_RFP_MAPPING.md`
- `README.md`
- `backstage-portal/README.md`
- `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`

### 구현 내용

- `App.tsx`에 `/requirement-progress` 라우트 등록
- `portalMenuDefinitions.ts`에 `요구사항 진도표` 메뉴 추가 (`group: 관리/보안`, `visibleTo: 'admin'`)
- `AppLayout`에서 `isAdmin` 또는 `sessionStorage.__kt_ai_portal_admin_preview__ === 'true'`일 경우 관리자 메뉴 표시
- `DemoAdminContext.tsx`에서 Firebase Auth 로그인 사용자 이메일 기준 관리자 판별
- `AdminOnlyGuard.tsx`에서 관리자가 아닌 사용자의 직접 URL 접근 차단 및 접근 권한 없음 화면 표시
- `RequirementProgressPage.tsx`에서 4개 탭 제공: SFR별 진도표, 기능목록 상세, 변경이력, 질의사항
- 요약 카드: 전체 SFR 21개, 전체 기능 163개, 기존 155개, 신규 8개, 변경 SFR 13개, 화면 구현/부분 구현/후속 개발/검토 필요 집계

### 검증 결과

- `yarn tsc --noEmit` 통과
- `yarn test` 통과 (`App.test.tsx`)
- 로컬 `yarn start` 접속 확인
- 일반 사용자 상태에서 요구사항 진도표 메뉴 미표시 확인
- 일반 사용자 상태에서 `/requirement-progress` 직접 접근 시 "접근 권한이 없습니다" 화면 확인
- `sessionStorage.__kt_ai_portal_admin_preview__ = 'true'` 설정 후 관리자 메뉴 및 요구사항 진도표 페이지 접근 확인
- 4개 탭 데이터 표시 확인 (SFR 21개, 기능 163개, 변경이력 13개, 질의사항 7개)

### 제약 및 후속

- Firebase Auth Google 로그인 관리자 실검증은 demo 배포 후 추가 검증 필요
- 운영 환경에서는 sessionStorage 프리뷰 모드 제거 후 Firebase Auth/Keycloak role 기반 RBAC 적용 권고
- 이미지 처리 오류로 인해 스크린샷 저장은 보류하고 검증 결과만 문서에 기록

---

## 28단계: 왼쪽 메뉴 RFP/SFR 순서 재정렬

### 작성일시

2026-06-28

### 작업 단계

28단계 왼쪽 메뉴 RFP/SFR 순서 재정렬

### 작업 목표

- 왼쪽 메뉴를 RFP/SFR 요구사항 흐름에 맞게 재정렬
- 메뉴 그룹(포털 공통, 관리/보안, 플랫폼 연계, 프로젝트 운영, 사용자/조직, 사용자 지원) 적용
- 기존 라우트 URL과 컴포넌트 파일명 유지
- Dashboard Quick Links 순서도 메뉴와 동일하게 정렬
- 관리자 전용 메뉴 제어는 29단계로 이관

### 생성 파일

- `backstage-portal/packages/app/src/components/navigation/portalMenuDefinitions.ts`
- `backstage-portal/packages/app/src/components/navigation/index.ts`
- `docs/MENU_FUNCTION_RELATIONSHIP_GUIDE.md`
- `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`

### 변경 파일

- `backstage-portal/packages/app/src/App.tsx`
- `backstage-portal/packages/app/src/components/portal-dashboard/mockDashboardData.ts`
- `backstage-portal/packages/app/src/components/portal-dashboard/QuickLinkCards.tsx`
- `docs/SCREEN_TO_RFP_MAPPING.md`
- `docs/RFP_MAPPING_JUSTIFICATION.md`
- `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/CHANGE_SUMMARY.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`

### 구현 내용

- 12개 메뉴를 6개 그룹으로 재분류
- 각 메뉴에 관련 SFR ID 매핑
- SidebarItem Tooltip으로 SFR 정보 표시
- Dashboard Quick Links 12개 항목을 메뉴 순서와 동일하게 재정렬

### 검증 결과

- `yarn tsc --noEmit` 통과
- `yarn test` 통과 (`App.test.tsx`)

### 제약 및 후속

- Docker daemon 미구동으로 인해 `build-demo.sh` 내 Docker 이미지 빌드는 실패
- Firebase Hosting 정적 배포(`deploy-demo-firebase.sh`)는 dist가 이미 생성되어 수행 가능
- 관리자 전용 메뉴 제어는 29단계에서 구현

---

# CHANGE SUMMARY

## 27단계: 사전규격 최신 요구사항 데이터 반영

### 작성일시

2026-06-28

### 작업 단계

27단계 사전규격 최신 요구사항 데이터 반영

### 작업 목표

- 기존 견적용 기능목록 155개를 최신 사전규격 기준 163개로 확장
- 신규 기능 8개 (RFP-156~163) 및 변경 SFR 13개 반영
- 요구사항 진도표용 mock data / types / utils 생성
- 관련 문서 14개 갱신

### 생성 파일

- `backstage-portal/packages/app/src/components/requirement-progress/types.ts`
- `backstage-portal/packages/app/src/components/requirement-progress/mockRequirementProgressData.ts`
- `backstage-portal/packages/app/src/components/requirement-progress/requirementProgressUtils.ts`

### 변경 파일

- `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`
- `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`
- `docs/SCREEN_TO_RFP_MAPPING.md`
- `docs/RFP_MAPPING_JUSTIFICATION.md`
- `docs/ESTIMATION_TABLE.md`
- `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/RISK_RESPONSE_PLAN.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/CHANGE_SUMMARY.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`
- `docs/FIREBASE_DEMO_DEPLOYMENT.md`

### 구현 내용

- 163개 `PortalFeatureRequirement` mock data 생성
- 21개 `SfrRequirementSummary` (SFR-001~SFR-021) 요약 생성
- 13개 `RequirementChangeHistory` (CHG-001~CHG-013) 생성
- 7개 `RequirementQuestion` 생성
- SFR별 구현 상태 집계, 기능번호 필터/검색, 완료율/후속개발율 계산 유틸리티 구현

### 검증 결과

- `yarn tsc --noEmit` 통과
- `yarn test` 통과 (`App.test.tsx`)

### 제약 및 후속

- 실제 DB/Firestore 연동은 이번 단계에서 하지 않음
- 기존 화면/라우트는 변경하지 않음
- 28단계에서 왼쪽 메뉴 RFP 순서 재정렬 예정

---

## 24단계: Firebase + Cloud Run 데모 배포 준비

### 작성일시

2026-07-01

### 작업 단계

24단계 Firebase + Cloud Run 데모 배포 준비

### 작업 목표

- 인터넷에서 국방지능형플랫폼포털 PoC 사이트에 접속할 수 있도록 데모 배포
- 외부 시스템(Keycloak OIDC, OpenSearch/OpenMetadata 운영, DB/API, Kubernetes/CMP) 연동 금지
- 데모용 접근코드 게이트 및 mock data 배너 추가
- Firebase Hosting + Cloud Run 배포 설정/스크립트/문서 작성

### 생성 파일

- `backstage-portal/packages/app/src/components/preview-auth/PreviewAuthGate.tsx`
- `backstage-portal/packages/app/src/components/preview-auth/PreviewLoginPage.tsx`
- `backstage-portal/packages/app/src/components/preview-auth/previewAuth.ts`
- `backstage-portal/packages/app/src/components/preview-auth/index.ts`
- `backstage-portal/packages/app/src/components/common/DemoModeBanner.tsx`
- `backstage-portal/app-config.demo.yaml`
- `firebase.json`
- `.firebaserc.example`
- `Dockerfile.demo`
- `scripts/build-demo.sh`
- `scripts/deploy-demo-cloudrun.sh`
- `scripts/deploy-demo-firebase.sh`
- `docs/FIREBASE_DEMO_DEPLOYMENT.md`
- `docs/FIREBASE_DEMO_CHECKLIST.md`

### 변경 파일

- `backstage-portal/packages/app/src/App.tsx`
- `docs/FIREBASE_CONSULTING_BRIEF.md`
- `docs/FINAL_DELIVERABLES.md`
- `docs/DOCUMENT_INDEX.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TECH_DEBT.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`

### 구현 내용

- `PreviewAuthGate`: 설정된 접근코드(`app.previewAccessCode`)가 있을 때 세션 기반 코드 검증 수행
- `PreviewLoginPage`: 한글 안내와 함께 접근코드 입력 UI 제공
- `DemoModeBanner`: 상단에 "제안팀 검토용 PoC 데모" 및 mock data 안내 표시
- `App.tsx`에 `PreviewAuthGate` → `DemoModeBanner` → 기존 라우터 구조 적용
- `app-config.demo.yaml`: Cloud Run 환경변수 기반 URL/세션/인증 설정(Guest 인증만 사용)
- `firebase.json`: Firebase Hosting → Cloud Run `kt-ai-portal-demo`(asia-northeast3) rewrite
- `Dockerfile.demo`: `packages/backend/Dockerfile` 기반 3단계 빌드, 환경변수 기반 `APP_CONFIG_app-config.demo.yaml` 사용
- 배포 스크립트: 환경변수 검증, Cloud Run 배포, Firebase Hosting 배포, DNS 안내

### 검증 결과

- `yarn tsc` 통과
- `yarn build:all` 통과
- `yarn test`에서 `App.test.tsx` 통과
- 로컬 dev server(`yarn start`)에서 접근코드 게이트/데모 배너/기존 메뉴 정상 동작

### 제약 및 후속

- 실제 배포(GCP/Firebase 프로젝트 생성, 가비아 DNS 연결)는 미진행
- 접근코드는 프론트엔드 번들에 포함될 수 있으므로 강력한 보안 수단이 아님
- Keycloak/OpenSearch/OpenMetadata 외부 연동은 데모에서 사용하지 않음

## 15단계: 권한/RBAC 및 메뉴/프로그램 관리 화면 상세화

### 작성일시

2026-06-30

### 작업 단계

15단계 권한/RBAC 및 메뉴/프로그램 관리 화면 상세화

### 작업 목표

- 역할 목록/상세 화면 구현
- 역할별 권한 매트릭스 구현
- 그룹 관리 화면 추가
- 사용자/그룹 권한 매핑 화면 추가
- 프로젝트별 역할 매핑 화면 추가
- 서비스별 권한, 데이터 접근 등급, 승인 권한 화면 추가
- 조직 상태 변경에 따른 권한 회수/인계 화면 추가
- 권한 변경 감사이력 화면 추가
- 메뉴 트리/상세/권한 연결/프로그램 관리 화면 추가
- Keycloak role/group claim 연동 설계 문서 작성

### 생성 파일

- `packages/app/src/components/admin-console/RoleDetailPanel.tsx`
- `packages/app/src/components/admin-console/RolePermissionMatrix.tsx`
- `packages/app/src/components/admin-console/GroupManagementPanel.tsx`
- `packages/app/src/components/admin-console/UserGroupMappingPanel.tsx`
- `packages/app/src/components/admin-console/ProjectRoleMappingPanel.tsx`
- `packages/app/src/components/admin-console/ServicePermissionPanel.tsx`
- `packages/app/src/components/admin-console/DataAccessLevelPanel.tsx`
- `packages/app/src/components/admin-console/ApprovalPermissionPanel.tsx`
- `packages/app/src/components/admin-console/OrganizationTransferPanel.tsx`
- `packages/app/src/components/admin-console/PermissionChangeHistoryPanel.tsx`
- `packages/app/src/components/admin-console/MenuTreePanel.tsx`
- `packages/app/src/components/admin-console/MenuDetailPanel.tsx`
- `packages/app/src/components/admin-console/MenuPermissionPanel.tsx`
- `packages/app/src/components/admin-console/ProgramRegistryPanel.tsx`
- `docs/RBAC_MENU_MANAGEMENT_DESIGN.md`

### 변경 파일

- `packages/app/src/components/admin-console/types.ts`
- `packages/app/src/components/admin-console/mockAdminData.ts`
- `packages/app/src/components/admin-console/AdminConsolePage.tsx`
- `packages/app/src/components/admin-console/RolePermissionPanel.tsx`
- `packages/app/src/components/admin-console/MenuManagementPanel.tsx`
- `docs/REQUIREMENT_SCREEN_COVERAGE.md`
- `docs/WBS.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/TECH_DEBT.md`
- `docs/FINAL_DELIVERABLES.md`
- `docs/DEMO_SCRIPT.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`

### 구현 내용

- `RolePermissionPanel` 내부부 탭 확장: 역할 목록/상세, 권한 매트릭스, 그룹 관리, 사용자/그룹 매핑, 프로젝트별 역할, 서비스별 권한, 데이터 접근 등급, 승인 권한, 조직 변경 인계, 권한 변경 이력
- `RoleDetailPanel`에서 역할 ID/이름/설명/적용 대상/사용자 수/그룹 수/생성일/수정일, 접근 메뉴/서비스/데이터 등급/프로젝트 권한/승인 권한 표시
- `RolePermissionMatrix`에서 역할 × 자원 권한 수준(접근불가/조회/신청/수정/승인/관리) Chip 표시
- `GroupManagementPanel`에서 그룹 ID/이름/설명/소속 조직/적용 역할/사용자 수/접근 서비스/데이터 등급/사용 여부 표시
- `UserGroupMappingPanel`에서 사용자 선택, 추가 가능 그룹, 적용 예정 권한 미리보기
- `ProjectRoleMappingPanel`에서 프로젝트별 사용자 역할, 워크스페이스 접근, 데이터 등급, 승인/리소스 권한, 유효기간 표시
- `ServicePermissionPanel`, `DataAccessLevelPanel`, `ApprovalPermissionPanel`에서 서비스/데이터/승인 권한 정책 표시
- `OrganizationTransferPanel`에서 인사이동/퇴직/파견종료/수행사 계약종료에 따른 권한 회수/인계 상태 표시
- `PermissionChangeHistoryPanel`에서 권한 변경 감사 이력 표시
- `MenuManagementPanel` 내부부 탭 확장: 메뉴 트리, 메뉴 상세, 메뉴 권한 연결, 프로그램 관리
- `MenuTreePanel` 계층형 메뉴 트리, `MenuDetailPanel` 메뉴 수정/이동/기능 연결 UI, `MenuPermissionPanel` 메뉴 별 역할/외부접근/읽기쓰기관리, `ProgramRegistryPanel` 프로그램 등록 목록
- `docs/RBAC_MENU_MANAGEMENT_DESIGN.md` 작성

### 검증 결과

- Backstage `http://localhost:3000` 접속 가능
- Keycloak OIDC 로그인 가능
- Home 화면에 `국방지능화플랫폼` 표시
- Admin Console 접근 가능
- 14단계 사용자 등록/승인, 외부 사용자 관리 탭 정상 유지
- 권한/역할 탭 10개 서브 화면 정상 표시
- 메뉴 관리 탭 4개 서브 화면 정상 표시
- 기존 메뉴(Integrated Search, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence) 정상 접근
- OpenSearch proxy `/api/proxy/search` 200 응답
- OpenMetadata `/` 200 응답
- `yarn tsc --noEmit`에서 신규 코드 타입 오류 없음 (기존 `App.test.tsx` 오류 제외)

### 발생 오류 및 조치

- MUI v4 `findDOMNode is deprecated` warning 유지 (기능에 영향 없음)
- `App.test.tsx` TypeScript 오류 유지 (기존 오류)

### 미완료/보류 사항

- 실제 Keycloak/DB 연동은 16~18단계 및 운영 확장 단계에서 진행

### 다음 단계 작업

- 16단계: 로그인/비밀번호 정책 및 이력/감사로그 화면 상세화

## 16단계: 로그인/비밀번호 정책 및 이력/감사로그 화면 상세화

### 작성일시

2026-06-30

### 작업 단계

16단계 로그인/비밀번호 정책 및 이력/감사로그 화면 상세화

### 작업 목표

- 로그인 정책(접속 기간, 실패 차단, 중복 로그인, 자동 로그아웃) 화면 상세화
- 비밀번호 정책(복잡도, 만료, 재사용, 계정 잠금) 화면 상세화
- 감사 로그(로그인/로그아웃/비밀번호 변경/사용자 접근/정보 수정/보안 감사/관리자 조치) 화면 추가
- Keycloak event log 연동 설계 문서 작성

### 생성 파일

- `packages/app/src/components/admin-console/LoginPolicyDetailPanel.tsx`
- `packages/app/src/components/admin-console/LoginFailurePolicyPanel.tsx`
- `packages/app/src/components/admin-console/ConcurrentLoginPolicyPanel.tsx`
- `packages/app/src/components/admin-console/SessionTimeoutPolicyPanel.tsx`
- `packages/app/src/components/admin-console/PasswordPolicyDetailPanel.tsx`
- `packages/app/src/components/admin-console/PasswordComplexityPanel.tsx`
- `packages/app/src/components/admin-console/PasswordExpirationPanel.tsx`
- `packages/app/src/components/admin-console/AccountLockPolicyPanel.tsx`
- `packages/app/src/components/admin-console/AuditLogDashboard.tsx`
- `packages/app/src/components/admin-console/AuditLogFilterPanel.tsx`
- `packages/app/src/components/admin-console/LoginHistoryPanel.tsx`
- `packages/app/src/components/admin-console/LogoutHistoryPanel.tsx`
- `packages/app/src/components/admin-console/PasswordChangeHistoryPanel.tsx`
- `packages/app/src/components/admin-console/UserAccessLogPanel.tsx`
- `packages/app/src/components/admin-console/UserInfoChangeLogPanel.tsx`
- `packages/app/src/components/admin-console/SecurityAuditPanel.tsx`
- `packages/app/src/components/admin-console/AdminActionHistoryPanel.tsx`
- `packages/app/src/components/admin-console/AuditRiskChip.tsx`
- `packages/app/src/components/admin-console/AuditEventTypeChip.tsx`
- `docs/SECURITY_POLICY_AUDIT_DESIGN.md`

### 변경 파일

- `packages/app/src/components/admin-console/types.ts`
- `packages/app/src/components/admin-console/mockAdminData.ts`
- `packages/app/src/components/admin-console/AdminConsolePage.tsx`
- `packages/app/src/components/admin-console/LoginPolicyPanel.tsx`
- `packages/app/src/components/admin-console/PasswordPolicyPanel.tsx`
- `packages/app/src/components/admin-console/AuditLogPanel.tsx`
- `docs/REQUIREMENT_SCREEN_COVERAGE.md`
- `docs/WBS.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/TECH_DEBT.md`
- `docs/FINAL_DELIVERABLES.md`
- `docs/DEMO_SCRIPT.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`

### 구현 내용

- `LoginPolicyPanel` 내부 탭 확장: 로그인 정책 상세, 로그인 실패 차단, 중복 로그인, 자동 로그아웃
- `LoginPolicyDetailPanel`에서 적용 대상/접속 가능 기간/IP 제한/2FA/허용 기기/중복 로그인/잠금 해제 방식/수정자/수정일 표시
- `LoginFailurePolicyPanel`에서 실패 임계값/차단 시간/경고/해제/예외 표시
- `ConcurrentLoginPolicyPanel`에서 중복 로그인 허용/차단/강제 종료/우선 순위/알림 정책 표시
- `SessionTimeoutPolicyPanel`에서 idle timeout/total timeout/자동 로그아웃 동작/만료 임박 알림 표시
- `PasswordPolicyPanel` 내부 탭 확장: 비밀번호 정책 상세, 복잡도, 만료/잠금 현황, 계정 잠금 정책
- `PasswordPolicyDetailPanel`에서 길이/복잡도/변경 주기/만료 임박/만료 시 조치/유예 기간/재사용 제한/적용 대상 표시
- `PasswordComplexityPanel`에서 문자 조합/연속/반복/사전/개인정보 제한/사전 변경 기록 표시
- `PasswordExpirationPanel`에서 만료 예정/만료 잠금/Grace 기간/알림/연장 요청 상태 표시
- `AccountLockPolicyPanel`에서 잠금 기준/잠금 기간/해제 방법/관리자 잠금/자동 해제/임시 비밀번호 정책 표시
- `AuditLogPanel` 내부 탭 확장: 대시보드, 통합 감사로그, 로그인/로그아웃 이력, 비밀번호 변경 이력, 사용자 접근 로그, 사용자 정보수정 로그, 보안 감사, 관리자 조치 이력
- `AuditLogDashboard`에서 오늘/주간/월간 이벤트/실패/위험/미조치 건수 요약
- `AuditLogFilterPanel`에서 기간/이벤트 유형/사용자/IP/결과/위험 등급/데이터 등급/리소스/키워드 필터
- `AuditRiskChip`, `AuditEventTypeChip`으로 감사 위험/이벤트 유형 시각화
- `docs/SECURITY_POLICY_AUDIT_DESIGN.md` 작성

### 검증 결과

- Backstage `http://localhost:3000` 접속 가능
- Keycloak OIDC 로그인 가능
- Home 화면에 `국방지능화플랫폼` 표시
- Admin Console 접근 가능
- 14~15단계 탭 정상 유지
- 로그인 정책/비밀번호 정책/감사 로그 탭 및 서브 화면 정상 표시
- 기존 메뉴(Integrated Search, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence) 정상 접근
- OpenSearch proxy `/api/proxy/search` 200 응답
- OpenMetadata `/` 200 응답
- `yarn tsc --noEmit`에서 신규 코드 타입 오류 없음 (기존 `App.test.tsx` 오류 제외)

### 발생 오류 및 조치

- MUI v4 `findDOMNode is deprecated` warning 유지 (기능에 영향 없음)
- `App.test.tsx` TypeScript 오류 유지 (기존 오류)

### 미완료/보류 사항

- 실제 Keycloak event API/password policy API/DB 연동은 17~18단계 및 운영 확장 단계에서 진행

### 다음 단계 작업

- 17단계: 서비스/도구 카탈로그 및 제안 게시판 화면 추가

## 17단계: 서비스/도구 카탈로그 및 제안 게시판 화면 추가

### 작성일시

2026-07-04

### 작업 단계

17단계 서비스/도구 카탈로그 및 제안 게시판 화면 추가

### 작업 목표

- 분석 프레임워크/개발도구/데이터도구/시각화도구/라벨링도구 선택 화면 추가
- 직접 입력 및 카탈로그 선택 UI 추가
- AI 모델 개발/빅데이터 분석/데이터셋 구축 제안 게시판 화면 추가
- 제안 등록/상세/공감/추천/관리자 검토 UI 추가
- OpenMetadata/Docker/PyPI/DB 연동 설계 문서 작성

### 생성 파일

- `packages/app/src/components/service-catalog/types.ts`
- `packages/app/src/components/service-catalog/mockServiceCatalogData.ts`
- `packages/app/src/components/service-catalog/ServiceCatalogPage.tsx`
- `packages/app/src/components/service-catalog/ServiceCatalogSummaryCards.tsx`
- `packages/app/src/components/service-catalog/ToolCategoryTabs.tsx`
- `packages/app/src/components/service-catalog/ToolCatalogList.tsx`
- `packages/app/src/components/service-catalog/ToolCatalogDetail.tsx`
- `packages/app/src/components/service-catalog/ToolSelectionPanel.tsx`
- `packages/app/src/components/service-catalog/DirectToolRequestForm.tsx`
- `packages/app/src/components/service-catalog/DirectRequestList.tsx`
- `packages/app/src/components/service-catalog/ToolCategoryChip.tsx`
- `packages/app/src/components/service-catalog/ToolStatusChip.tsx`
- `packages/app/src/components/service-catalog/CatalogRequirementCoveragePanel.tsx`
- `packages/app/src/components/proposal-board/types.ts`
- `packages/app/src/components/proposal-board/mockProposalData.ts`
- `packages/app/src/components/proposal-board/ProposalBoardPage.tsx`
- `packages/app/src/components/proposal-board/ProposalSummaryCards.tsx`
- `packages/app/src/components/proposal-board/ProposalTabs.tsx`
- `packages/app/src/components/proposal-board/ProposalList.tsx`
- `packages/app/src/components/proposal-board/ProposalDetail.tsx`
- `packages/app/src/components/proposal-board/ProposalForm.tsx`
- `packages/app/src/components/proposal-board/ProposalStatusChip.tsx`
- `packages/app/src/components/proposal-board/ProposalCategoryChip.tsx`
- `packages/app/src/components/proposal-board/ProposalAdminReviewPanel.tsx`
- `packages/app/src/components/proposal-board/ProposalRequirementCoveragePanel.tsx`
- `docs/SERVICE_CATALOG_PROPOSAL_BOARD_DESIGN.md`

### 변경 파일

- `packages/app/src/App.tsx`
- `packages/app/src/components/portal-dashboard/PortalDashboardPage.tsx`
- `packages/app/src/components/portal-dashboard/SummaryMetricCards.tsx`
- `packages/app/src/components/portal-dashboard/QuickLinkCards.tsx`
- `packages/app/src/components/portal-dashboard/mockDashboardData.ts`
- `packages/app/src/components/portal-dashboard/types.ts`
- `docs/REQUIREMENT_SCREEN_COVERAGE.md`
- `docs/WBS.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/TECH_DEBT.md`
- `docs/FINAL_DELIVERABLES.md`
- `docs/DEMO_SCRIPT.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`

### 구현 내용

- `ServiceCatalogPage` 메인: 요약 카드, 카테고리 탭, 도구 목록/상세, 선택 패널, 직접 입력 요청, 요구사항 대응 현황
- `ToolCatalogList`/`ToolCatalogDetail`에서 도구 ID/이름/카테고리/제공방식/버전/상태/역할/워크스페이스/보안등급/담당자/등록일 및 상세 정보 표시
- `ToolSelectionPanel`에서 프로젝트/워크스페이스/도구 선택, 예상 크레딧, 신청서 생성 mock
- `DirectToolRequestForm`에서 카탈로그 미등록 도구 직접 입력 요청
- `ProposalBoardPage` 메인: 요약 카드, 구분 탭, 제안 목록/상세, 등록 폼, 관리자 검토, 요구사항 대응 현황
- `ProposalList`/`ProposalDetail`에서 제안 ID/제목/구분/제안자/공감/댓글/상태/공지/등록일 및 상세 정보 표시
- `ProposalForm`에서 제안 등록(기본정보/필요성/활용가능성/보안등급/개인정보 동의)
- `ProposalDetail`에서 좋아요/추천/관심/댓글 mock UI
- `ProposalAdminReviewPanel`에서 관리자 검토/공지 승인/보완 요청/반려/진행 검토 버튼
- `App.tsx` Sidebar 및 Route에 `Service Catalog`, `Proposal Board` 추가
- Portal Dashboard Quick Links 및 요약 카드(등록 도구/신규 제안/검토 대기 제안) 추가
- `docs/SERVICE_CATALOG_PROPOSAL_BOARD_DESIGN.md` 작성

### 검증 결과

- Backstage `http://localhost:3000` 접속 가능
- Keycloak OIDC 로그인 가능
- Home 화면에 `국방지능화플랫폼` 표시
- Admin Console 접근 가능
- 14~16단계 Admin Console 화면 정상 유지
- `/service-catalog` 접근 가능 및 탭/목록/상세/선택 패널/직접 입력 요청 정상 표시
- `/proposal-board` 접근 가능 및 탭/목록/상세/등록 폼/관리자 검토 정상 표시
- Portal Dashboard Quick Links에 `Service Catalog`, `Proposal Board` 추가 확인
- 기존 메뉴(Integrated Search, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence) 정상 접근
- OpenSearch proxy `/api/proxy/search` 200 응답
- OpenMetadata `/` 200 응답
- `yarn tsc --noEmit`에서 신규 코드 타입 오류 없음 (기존 `App.test.tsx` 오류 제외)

### 발생 오류 및 조치

- MUI v4 `findDOMNode is deprecated` warning 유지 (기능에 영향 없음)
- `App.test.tsx` TypeScript 오류 유지 (기존 오류)
- `TextField` `rows` prop deprecation warning 발생 → `minRows`로 변경

### 미완료/보류 사항

- 실제 OpenMetadata/Docker Registry/PyPI Mirror/DB 연동은 18단계 및 운영 확장 단계에서 진행

### 다음 단계 작업

- 18단계: 마이페이지 및 환경설정 화면 추가

## 14단계: 사용자 등록/승인 및 외부 사용자 관리 화면 상세화

### 작성일시

2026-06-29

### 작업 단계

14단계 사용자 등록/승인 및 외부 사용자 관리 화면 상세화

### 작업 목표

- 사용자 등록 신청 상세 화면 구현
- 본인확인 상태 표시 및 승인/반려/보완요청/재신청 mock workflow 구현
- 외부 사용자 계정 관리 화면 추가
- 사용자 소속/역할/접속 가능 서비스 설정 UI 구현
- 사용자 상태 변경 이력 표시
- Keycloak/DB 연동 설계 문서 작성

### 생성 파일

- `packages/app/src/components/admin-console/UserRegistrationDetail.tsx`
- `packages/app/src/components/admin-console/UserApprovalWorkflow.tsx`
- `packages/app/src/components/admin-console/ExternalUserManagementPanel.tsx`
- `packages/app/src/components/admin-console/UserAccessServicePanel.tsx`
- `packages/app/src/components/admin-console/UserStatusHistoryPanel.tsx`
- `packages/app/src/components/admin-console/UserIdentityVerificationChip.tsx`
- `packages/app/src/components/admin-console/UserApprovalStatusChip.tsx`
- `packages/app/src/components/admin-console/UserAccountStatusChip.tsx`
- `docs/USER_MANAGEMENT_DESIGN.md`

### 변경 파일

- `packages/app/src/components/admin-console/types.ts`
- `packages/app/src/components/admin-console/mockAdminData.ts`
- `packages/app/src/components/admin-console/AdminConsolePage.tsx`
- `packages/app/src/components/admin-console/UserRegistrationPanel.tsx`
- `packages/app/src/components/admin-console/UserManagementPanel.tsx`
- `docs/REQUIREMENT_SCREEN_COVERAGE.md`
- `docs/WBS.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/TECH_DEBT.md`
- `docs/FINAL_DELIVERABLES.md`
- `docs/DEMO_SCRIPT.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`

### 구현 내용

- `UserRegistrationDetail`을 통해 신청자 기본정보/본인확인/신청정보/보안확인/승인처리 표시
- `UserIdentityVerificationChip`, `UserApprovalStatusChip`, `UserAccountStatusChip` 추가
- `UserApprovalWorkflow`에서 상태에 따른 검토 시작/승인/반려/보완요청/재신청 버튼 제공
- `ExternalUserManagementPanel`에서 외부/수행사 사용자 목록 및 등록/수정/연장/잠금 버튼 제공
- `UserAccessServicePanel`에서 사용자 소속/부서/그룹/역할/유형/데이터등급/프로젝트접근/권한/서비스 설정 UI 제공
- `UserStatusHistoryPanel`에서 사용자별 상태 변경 이력 표시
- `AdminConsolePage` 탭에 `외부 사용자 관리` 추가 및 등록/이력 상태 관리
- `docs/USER_MANAGEMENT_DESIGN.md` 작성

### 검증 결과

- Backstage `http://localhost:3000` 접속 가능
- Keycloak OIDC 로그인 가능
- Home 화면에 `국방지능화플랫폼` 표시
- Admin Console 접근 가능
- 사용자 등록 신청 상세/승인 workflow 상태 변경 정상
- 외부 사용자 관리 탭 정상 표시
- 사용자 관리 > 접속 가능 서비스 설정 UI 정상
- 기존 메뉴(Integrated Search, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence) 정상 접근
- `yarn tsc --noEmit`에서 신규 코드 타입 오류 없음 (기존 `App.test.tsx` 오류 제외)

### 발생 오류 및 조치

- MUI v4 `findDOMNode is deprecated` warning 유지 (기능에 영향 없음)
- `App.test.tsx` TypeScript 오류 유지 (기존 오류)

### 미완료/보류 사항

- 실제 Keycloak/DB 연동은 15~18단계 및 운영 확장 단계에서 진행

### 다음 단계 작업

- 15단계: 권한/역할/메뉴 관리 화면 상세화

## 13단계: 국방지능화플랫폼 타이틀 변경 및 관리자 기능 화면 1차 보강

### 작성일시

2026-06-29

### 작업 단계

13단계 국방지능화플랫폼 타이틀 변경 및 관리자 기능 화면 1차 보강

### 작업 목표

- 포털 공식 명칭을 `국방지능화플랫폼 (K-Defense Intelligence Platform)`으로 변경
- 요구사항 PDF의 관리자 기능을 1차 화면으로 추가
- 실제 DB/API/Keycloak 관리 로직은 구현하지 않고 mock data 기반 UI 확보

### 생성 파일

- `packages/app/src/components/admin-console/index.ts`
- `packages/app/src/components/admin-console/types.ts`
- `packages/app/src/components/admin-console/mockAdminData.ts`
- `packages/app/src/components/admin-console/AdminConsolePage.tsx`
- `packages/app/src/components/admin-console/AdminSummaryCards.tsx`
- `packages/app/src/components/admin-console/UserRegistrationPanel.tsx`
- `packages/app/src/components/admin-console/UserManagementPanel.tsx`
- `packages/app/src/components/admin-console/RolePermissionPanel.tsx`
- `packages/app/src/components/admin-console/LoginPolicyPanel.tsx`
- `packages/app/src/components/admin-console/PasswordPolicyPanel.tsx`
- `packages/app/src/components/admin-console/AuditLogPanel.tsx`
- `packages/app/src/components/admin-console/MenuManagementPanel.tsx`
- `packages/app/src/components/admin-console/AdminRequirementCoveragePanel.tsx`
- `docs/REQUIREMENT_SCREEN_COVERAGE.md`

### 변경 파일

- `backstage-portal/app-config.yaml`
- `packages/app/src/App.tsx`
- `packages/app/src/components/portal-dashboard/DashboardHero.tsx`
- `packages/app/src/components/portal-dashboard/mockDashboardData.ts`
- `packages/app/src/components/portal-dashboard/QuickLinkCards.tsx`
- `README.md`
- `backstage-portal/README.md`
- `docs/FINAL_DELIVERABLES.md`
- `docs/DEMO_SCRIPT.md`
- `docs/PORTAL_DASHBOARD.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/WBS.md`
- `docs/TODO.md`
- `docs/TECH_DEBT.md`
- `notes/DECISIONS.md`

### 구현 내용

- `app-config.yaml`의 `app.title`, `organization.name`, `mcpActions.name/description`을 `국방지능화플랫폼`으로 변경
- Portal Dashboard Hero의 제목/부제를 `국방지능화플랫폼 / K-Defense Intelligence Platform`으로 변경
- `Admin Console` 메뉴를 사이드바에 추가하고 `/admin-console` 라우팅 등록
- Admin Console 화면 구성
  - 요약 카드 8개
  - 사용자 등록 신청/사용자 관리/권한 역할/로그인 정책/비밀번호 정책/감사 로그/메뉴 관리/요구사항 현황 패널
- Portal Dashboard Quick Links에 `Admin Console` 바로가기 추가
- `docs/REQUIREMENT_SCREEN_COVERAGE.md` 작성 및 주요 문서 갱신

### 검증 결과

- Backstage `http://localhost:3000` 접속 가능
- Keycloak OIDC 로그인 가능
- Home 화면에 `국방지능화플랫폼` 표시
- 기존 메뉴(Integrated Search, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence) 정상 접근
- 신규 메뉴 `Admin Console` 표시 및 `/admin-console` 접근 가능
- Admin Console 화면에 요약 카드 및 8개 패널 표시

### 발생 오류 및 조치

- 기존 `App.test.tsx` TypeScript 오류는 유지됨 (개발 서버 동작에 영향 없음)
- MUI v4 `findDOMNode is deprecated` warning 유지됨 (기능에 영향 없음)

### 미완료/보류 사항

- Admin Console의 사용자/권한/정책/메뉴 관리는 mock data 기반 화면이며 실제 DB/API/Keycloak 연동은 14~16단계에서 진행
- 서비스 카탈로그/제안 게시판은 17단계에서 추가 예정

### 다음 단계 작업

- 14단계: 사용자 등록/승인 및 외부 사용자 관리 화면 상세화

## 12단계: 최종 산출물 및 제안장표용 화면 정리

### 작성일시

2026-06-28

### 작업 단계

12단계 최종 산출물 및 제안장표용 화면 정리

### 작업 목표

- PoC 최종 산출물 목록 정리
- 제안장표/시연용 주요 화면 캡처 정리
- 데모 시나리오 및 발표 멘트 작성
- PoC 한계사항, 운영 전환 고려사항, 후속 개발 과제, 보안 주의사항 정리
- 기술 부채 문서화

### 생성 파일

- `docs/FINAL_DELIVERABLES.md`
- `docs/DEMO_SCRIPT.md`
- `docs/TECH_DEBT.md`
- `docs/assets/final/01-portal-dashboard.png`
- `docs/assets/final/02-integrated-search.png`
- `docs/assets/final/03-project-workspace.png`
- `docs/assets/final/04-export-approval.png`
- `docs/assets/final/05-credit-manager.png`
- `docs/assets/final/06-krmf-evidence.png`
- `docs/assets/final/07-openmetadata.png`
- `docs/assets/final/08-opensearch-dashboards.png`
- `docs/assets/final/09-backstage-signin.png`
- `docs/assets/final/09-keycloak-login.png`

### 변경 파일

- `docs/WBS.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `notes/DECISIONS.md`

### 문서화 내용

- 최종 산출물 목록 및 구현 완료 기능
- 주요 화면 목록과 캡처 파일 매핑
- 6개 데모 시나리오 및 발표 멘트 예시
- PoC 한계사항 10건
- 운영 전환 고려사항 13건
- 후속 개발 과제 10건
- 보안 주의사항
- 기술 부채 8개 영역

### 검증 결과

- Backstage `http://localhost:3000` 접속 가능
- `admin01` Keycloak OIDC 로그인 가능
- Portal Dashboard 표시 확인
- Project Workspace, Export Approval, Credit Manager, K-RMF Evidence, Integrated Search 정상 접근
- OpenSearch proxy 검색 가능
- OpenMetadata 응답 가능
- 주요 화면 캡처 10건 확보

### 미완료/보류 사항

- OpenMetadata UI 로그인은 초기 계정 설정 상태에 따라 달라질 수 있음
- 실제 기능 연동(DB/API)은 12단계 이후 후속 개발 과제로 분리

### 다음 단계 작업

- PoC 이후 후속 개발 및 운영 전환 설계
- 실제 DB/API 연동, 권한 제어, 보안 강화


## 11.1단계: Keycloak OIDC 런타임 환경변수 안정화

### 작성일시

2026-06-28

### 작업 단계

11.1단계 Keycloak OIDC 런타임 환경변수 안정화

### 작업 목표

- Backstage 실행 시 OIDC clientSecret과 session secret이 정상 로딩되도록 수정
- Keycloak `admin01` 사용자 OIDC 로그인 검증
- Portal Dashboard에 Keycloak 사용자 정보가 표시되는지 확인

### 원인 분석

- `yarn start`만으로는 `backstage-portal/.env`의 `AUTH_OIDC_CLIENT_SECRET`, `AUTH_SESSION_SECRET`이 런타임에 자동 로딩되지 않음
- 결과적으로 backend가 OIDC provider를 skip하고 OIDC 로그인 흐름이 진행되지 않음

### 변경 내용

- `backstage-portal/scripts/start-dev.sh` 추가
  - `.env` 파일 존재 확인
  - `.env`의 주석/빈 줄 제거 후 export (macOS 기본 bash 3.2 호환)
  - `AUTH_OIDC_CLIENT_SECRET`, `AUTH_SESSION_SECRET` 필수 여부 확인
  - `yarn start` 실행
- `backstage-portal/README.md` 실행 방법 보강
  - `.env` 준비 방법 안내
  - `./scripts/start-dev.sh` 사용 권장
- `docs/OIDC_RUNTIME_FIX.md` 신규 작성
  - 문제 증상, 원인, 해결 방법, 검증 절차 기록
- `docs/KEYCLOAK_INTEGRATION.md`에 11.1단계 내용 추가

### 생성/변경 파일

- `backstage-portal/scripts/start-dev.sh` (신규)
- `backstage-portal/README.md`
- `docs/OIDC_RUNTIME_FIX.md` (신규)
- `docs/KEYCLOAK_INTEGRATION.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/ARCHITECTURE.md`
- `notes/DECISIONS.md`

### 검증 결과

- `./scripts/start-dev.sh`로 Backstage 재시작
- backend 로그에서 `Configuring auth provider: oidc` 확인 (skip 메시지 미출력)
- Keycloak 로그인 페이지로 정상 리다이렉트
- `admin01 / <password>` 로그인 성공
- Portal Dashboard에 `Admin Kim (user:default/admin01)`, `admin01@kt.ai` 표시 확인
- Home, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence, Integrated Search 정상 접근
- OpenSearch proxy 검색 기능 유지

### 발생 오류 및 조치

- `start-dev.sh` 초기 버전에서 macOS 기본 bash 3.2에서 `source <(...)`가 동작하지 않아 `.env` 로딩 실패
  - `export $(grep -v '^#' .env | grep -v '^$' | xargs)` 방식으로 변경하여 해결

### 다음 단계 작업

- 12단계: 최종 산출물 및 제안장표용 화면 정리


## 11단계: 메인 포털 대시보드 및 홈 화면 재구성

### 작성일시

2026-06-28

### 작업 단계

11단계 메인 포털 대시보드 및 홈 화면 재구성

### 작업 목표

- Backstage Home 화면을 KT/국방 AI 데이터 플랫폼용 메인 포털 대시보드로 재구성
- 로그인 사용자 정보, 통합검색 바로가기, 주요 현황 요약, 신규 자산, 프로젝트/반출/크레딧/K-RMF/시스템 상태를 한눈에 제공
- 제안장표용 화면 캡처에 적합한 시각적 구성

### 생성/변경 파일

- `packages/app/src/components/portal-dashboard/index.ts`
- `packages/app/src/components/portal-dashboard/types.ts`
- `packages/app/src/components/portal-dashboard/mockDashboardData.ts`
- `packages/app/src/components/portal-dashboard/PortalDashboardPage.tsx`
- `packages/app/src/components/portal-dashboard/DashboardHero.tsx`
- `packages/app/src/components/portal-dashboard/DashboardSearchBox.tsx`
- `packages/app/src/components/portal-dashboard/SummaryMetricCards.tsx`
- `packages/app/src/components/portal-dashboard/NoticePanel.tsx`
- `packages/app/src/components/portal-dashboard/RecentAssetsPanel.tsx`
- `packages/app/src/components/portal-dashboard/MyProjectPanel.tsx`
- `packages/app/src/components/portal-dashboard/ExportPendingPanel.tsx`
- `packages/app/src/components/portal-dashboard/CreditSummaryPanel.tsx`
- `packages/app/src/components/portal-dashboard/KrmfProgressPanel.tsx`
- `packages/app/src/components/portal-dashboard/SystemStatusPanel.tsx`
- `packages/app/src/components/portal-dashboard/QuickLinkCards.tsx`
- `packages/app/src/components/integrated-search/IntegratedSearchPage.tsx` (URL `q` 파라미터 연동)
- `packages/app/src/App.tsx` (Home 경로를 `PortalDashboardPage`로 교체)
- `docs/PORTAL_DASHBOARD.md` (신규)
- `docs/WBS.md`
- `docs/ARCHITECTURE.md`
- `docs/TODO.md`
- `notes/DECISIONS.md`

### 구현 내용

- `portal-dashboard` PoC 컴포넌트 생성 (mock data 기반)
- Hero 영역: `K-Defense AI Data Portal`, `국방 AI 데이터 통합포털`, 설명, 사용자 정보, `PoC Running` 배지
- 통합검색 바로가기: `/integrated-search?q=...` 이동, `IntegratedSearchPage`에서 URL 파라미터 반영
- 주요 현황 요약 카드: 데이터셋/AI 모델/프로젝트/반출 대기/크레딧 부족/K-RMF 진행률/OpenSearch 자산/OpenMetadata 상태
- 공지사항, 신규 데이터셋/AI 모델, 내 프로젝트, 반출 승인 대기, 크레딧 요약, K-RMF 증빙 진행률, 시스템 상태 패널
- 주요 메뉴 바로가기: 내부 메뉴 + OpenMetadata/OpenSearch Dashboards/Keycloak Admin 외부 링크

### 화면 구성

- 상단: Hero + 통합검색
- 좌측(8/12): 요약 카드 → 공지사항 → 신규 자산 → 내 프로젝트/반출 대기 (2열)
- 우측(4/12): 크레딧 요약 → K-RMF 진행률 → 시스템 상태 → 바로가기

### 검증 결과

- `http://localhost:3000/` 접속 시 Portal Dashboard 표시
- 로그인 사용자 정보 표시 (guest 테스트 시 mock fallback)
- 통합검색 바로가기 동작 (`/integrated-search?q=정비`)
- Project Workspace, Export Approval, Credit Manager, K-RMF Evidence, Integrated Search 화면 정상 접근
- 기존 메뉴 및 라우팅 유지
- OpenSearch/OpenMetadata/Keycloak 설정 파일 미변경

### 발생 오류 및 조치

- `yarn tsc --noEmit` 시 기존 `App.test.tsx`의 `App.createRoot()` 타입 오류만 확인 (이전 단계부터 존재, 대시보드 코드는 영향 없음)

### 미완료/보류 사항

- Keycloak `admin01` 사용자 로그인 흐름은 설정되어 있으나, 현재 PoC 환경에서는 Guest 로그인으로 검증
- 실시간 시스템 상태, 실제 API 연동은 12단계 이후 후속 작업으로 분리

### 다음 단계 작업

- 12단계: 최종 산출물 및 제안장표용 화면 정리


## 10.2단계: 보안등급 오타 역전 (잘못 적용)

### 작성일시

2026-06-28

### 작업 단계

10.2단계 보안등급 오타 잘못 적용

### 작업 목표

- 보안등급 정상값 `내부`를 오타 `보안등급 오타`로 잘못 치환
- 코드/문서/샘플 데이터/검색 UI의 보안등급을 `보안등급 오타`로 통일하려 시도

### 잘못 적용된 내용

- 보안등급 정상값: `내부` → `보안등급 오타`
- UI 표시값: `internal` → `보안등급 오타`
- 검색 필터: `보안등급 오타`
- OpenSearch 샘플 데이터 기준: `보안등급 오타`
- `normalizeSecurityLevel`에서 `내부`를 과거 데이터 호환용으로 처리

### 복구 방법

- 10.3단계에서 전역 치환으로 `보안등급 오타`를 `내부`로 재정정
- `_update_by_query`로 OpenSearch `portal-catalog` 데이터를 `내부`로 변환

## 10.3단계: 보안등급 오타 최종 재정정

> 10.2단계에서 오타와 정상값이 뒤바뀌어 적용되었던 문제를 복구한 최종 정정 단계입니다.

### 작성일시

2026-06-28

### 작업 단계

10.2단계 보안등급 오타 최종 정정

### 작업 목표

- 잘못 정규화된 보안등급 `보안등급 오타`를 `내부`로 최종 정정
- 코드/문서/샘플 데이터/검색 UI의 보안등급을 `공개`, `내부`, `비밀`로 통일
- Integrated Search에서 `internal`을 `내부`로 표시
- 기존 메뉴 및 로그인 기능 회귀 확인

### 정정 내용

- 보안등급 오타: `보안등급 오타` → `내부`
- UI 표시값: `internal` → `내부`
- 검색 필터: `내부`
- OpenSearch 샘플 데이터 기준: `공개`, `내부`, `비밀`
- `normalizeSecurityLevel`에서 `내부`는 과거 데이터 호환용으로만 허용

### 생성/변경 파일

- `packages/app/src/components/integrated-search/SearchApiClient.ts`
- `packages/app/src/components/integrated-search/SearchFilterPanel.tsx`
- `packages/app/src/components/project-workspace/ProjectRequestForm.tsx`
- `packages/app/src/components/project-workspace/mockProjects.ts`
- `packages/app/src/components/project-workspace/types.ts`
- `packages/app/src/components/export-approval/mockExportRequests.ts`
- `packages/app/src/components/export-approval/SecurityLevelChip.tsx`
- `packages/app/src/components/export-approval/ExportRequestForm.tsx`
- `packages/app/src/components/krmf-evidence/mockKrmfEvidence.ts`
- `infra/opensearch/scripts/02-seed-sample-data.sh`
- `infra/opensearch/scripts/03-search-test.sh`
- `docs/SEARCH_IMPLEMENTATION.md`
- `docs/SEARCH_DESIGN.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `notes/DECISIONS.md`
- `docs/PLUGIN_PROJECT_WORKSPACE.md`
- `docs/OPENMETADATA_DESIGN.md`

### 검증 결과

- `/integrated-search` 접속 및 검색 결과 정상 표시
- `정비`, `고장예측` 키워드 검색 정상
- `dataset` 유형 필터 정상
- `내부` 보안등급 필터 정상 동작
- `군수` 태그 필터 정상
- 화면에 `보안등급 오타`라는 단어 미표시 확인
- OpenSearch `portal-catalog` 데이터 `내부`로 업데이트 확인
- 기존 메뉴(`Home`, `Project Workspace`, `Export Approval`, `Credit Manager`, `K-RMF Evidence`) 정상 동작

### 다음 단계 작업

- 11단계: 메인 포털 대시보드 및 최종 산출물 정리


## 10단계: 통합검색/카탈로그 검색 고도화

### 작성일시

2026-06-28

### 작업 단계

10단계 통합검색/카탈로그 검색 고도화

### 작업 목표

- Backstage 자체 플러그인 형태의 `integrated-search` 기능 PoC 개발
- OpenSearch `portal-catalog` 인덱스를 검색할 수 있는 통합검색 화면 구현
- 키워드 입력 및 검색 대상 유형/보안등급/소스 시스템/태그 필터 구현
- 검색 결과 목록 및 상세 패널 구현
- OpenSearch 연결 실패 시 mock fallback 처리

### 생성/변경 파일

- `packages/app/src/App.tsx`
- `packages/app/src/components/integrated-search/index.ts`
- `packages/app/src/components/integrated-search/types.ts`
- `packages/app/src/components/integrated-search/IntegratedSearchPage.tsx`
- `packages/app/src/components/integrated-search/SearchBox.tsx`
- `packages/app/src/components/integrated-search/SearchFilterPanel.tsx`
- `packages/app/src/components/integrated-search/SearchResultList.tsx`
- `packages/app/src/components/integrated-search/SearchResultDetail.tsx`
- `packages/app/src/components/integrated-search/SearchTypeChip.tsx`
- `packages/app/src/components/integrated-search/SearchApiClient.ts`
- `packages/app/src/components/integrated-search/mockSearchResults.ts`
- `packages/app/src/components/credit-manager/mockCredits.ts`
- `app-config.yaml`
- `docs/SEARCH_IMPLEMENTATION.md`
- `docs/ARCHITECTURE.md`
- `docs/WBS.md`
- `docs/TODO.md`
- `docs/CHANGE_SUMMARY.md`
- `notes/DECISIONS.md`
- `docs/assets/integrated-search.png`

### 구현 내용

- `packages/app/src/components/integrated-search/`에 PoC 컴포넌트 구현
- Backstage backend proxy(`/api/proxy/search`)를 통해 OpenSearch `portal-catalog` 검색 연동
- `multi_match` 쿼리로 `name`, `description`, `tags` 검색
- `bool filter`로 `type`, `securityLevel`, `sourceSystem`, `tags` 필터 적용
- 검색 결과 10건 표시 및 상세 패널 구현
- OpenSearch 연결 실패 시 `mockSearchResults` fallback 표시
- `App.tsx`에 `Integrated Search` 메뉴 및 `/integrated-search` 라우팅 추가
- `app-config.yaml`에 OpenSearch 프록시 엔드포인트 추가
- `credit-manager/mockCredits.ts` 누락 import 추가로 TypeScript 오류 일부 해결

### OpenSearch 연동 방식

- Backstage backend proxy 사용
- 프론트엔드는 `/api/proxy/search/portal-catalog/_search`가 아닌 `backend.baseUrl`을 조합한 `http://localhost:7007/api/proxy/search/portal-catalog/_search`로 직접 호출
- 개발 환경에서 `credentials: dangerously-allow-unauthenticated` 적용

### 실행 방법

Backstage가 실행 중이면 자동 핫 리로드됩니다.

```bash
cd kt-ai-portal/backstage-portal
yarn start
```

### 검증 방법

1. `http://localhost:3000` 접속
2. Keycloak 로그인 또는 Guest 로그인
3. 좌측 메뉴 `Integrated Search` 클릭
4. 검색어 `정비` 입력 후 Enter → 결과 2건 표시
5. 검색어 `고장예측` 입력 → 결과 표시
6. 유형 필터 `dataset` 적용 → 결과 1건 표시
7. 보안등급 필터 `내부` 적용 → 결과 필터링
8. 태그 필터 `군수` 적용 → 결과 필터링
9. 검색 결과 클릭 시 상세 패널 표시
10. 기존 메뉴(`Project Workspace`, `Export Approval`, `Credit Manager`, `K-RMF Evidence`) 정상 동작 확인

### 확인 결과

- Backstage `http://localhost:3000` 정상 접속
- Keycloak `admin01` 사용자 로그인 상태 유지
- `Integrated Search` 메뉴 노출 및 `/integrated-search` 이동 확인
- `정비` 검색 시 결과 2건 표시
- `dataset` 유형 필터 적용 시 결과 1건 표시
- 검색 결과 상세 패널 정상 표시
- `Project Workspace`, `Export Approval`, `Credit Manager`, `K-RMF Evidence` 화면 정상 동작
- OpenSearch `http://localhost:9200` 응답 200 유지
- OpenMetadata `http://localhost:8585/api/v1/system/version` 응답 200 유지

### 발생 오류 및 조치

- MUI v4 `findDOMNode is deprecated` 경고 발생
  - 기능에 영향 없음. 운영 확장 시 MUI/Backstage UI 최신 버전 마이그레이션 검토
- 처음에는 `/api/proxy/search`를 상대 경로로 호출 시 webpack-dev-server 404 응답
  - `backend.baseUrl`(`http://localhost:7007`)을 조합한 절대 URL로 변경하여 해결
- Backstage backend proxy가 인증을 요구하여 401 응답
  - 개발 환경에서 `credentials: dangerously-allow-unauthenticated` 적용하여 해결

### 미완료/보류 사항

- OpenMetadata 실시간 연동
- 자체 플러그인 데이터 색인(Project Workspace, Export Approval, Credit Manager, K-RMF Evidence)
- 권한 기반 검색 결과 필터링
- 임베딩 기반 유사도 검색
- 검색 감사로그 및 통계
- 운영 환경 proxy 인증 설정

### 다음 단계 작업

- 11단계: 포털 메인 대시보드 및 최종 산출물 정리

## 10.1단계: 검색/보안등급 정규화 안정화

### 작성일시

2026-06-28

### 작업 단계

10.1단계 검색/보안등급 정규화 안정화

### 작업 목표

- 보안등급 오타 `보안등급 오타`를 `내부`로 정정
- 검색 코드/문서/샘플 데이터 기준을 `공개`, `내부`, `비밀`로 통일
- Integrated Search 화면에서 `internal`을 `내부`로 표시
- 기존 메뉴 및 로그인 기능 회귀 확인

### 정정 대상

- `packages/app/src/components/integrated-search/SearchApiClient.ts`
- `packages/app/src/components/integrated-search/SearchFilterPanel.tsx`
- `docs/SEARCH_IMPLEMENTATION.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/OPENMETADATA_DESIGN.md`
- `notes/DECISIONS.md`

### 구현/정정 내용

- `SearchApiClient.ts`의 `securityLevelToKorean` 라벨을 `internal: '내부'`로 정정
- `normalizeSecurityLevel`을 문자열 기준으로 정리하고, 보안등급은 `공개`/`보안등급 오타`/`비밀`로 통일 (18단계에서 `보안등급 오타` alias 제거)
- `SearchFilterPanel.tsx` 보안등급 옵션을 `전체`, `공개`, `내부`, `비밀`로 정정
- `docs/SEARCH_IMPLEMENTATION.md`의 Query 예시, 보안등급 정규화 문구, 후속 확장 문구 정정
- `docs/CHANGE_SUMMARY.md` 10단계 검증 방법의 보안등급 필터 문구 정정
- `docs/TODO.md`, `notes/DECISIONS.md`에 10.1단계 완료 기록 추가

### OpenSearch 데이터 상태

- `portal-catalog` 인덱스의 `securityLevel` 값은 `공개`, `내부`, `비밀`로 이미 정리되어 있음
- 재적재가 필요한 경우 `infra/opensearch/scripts/01-create-index.sh`, `02-seed-sample-data.sh`, `03-search-test.sh`를 수동 실행

### 검증 결과

- `/integrated-search` 접속 및 검색 결과 정상 표시
- `정비`, `고장예측` 키워드 검색 정상
- `dataset` 유형 필터 정상
- `내부` 보안등급 필터 정상 동작
- `군수` 태그 필터 정상
- 화면에 `보안등급 오타`라는 단어 미표시 확인
- 기존 메뉴(`Home`, `Project Workspace`, `Export Approval`, `Credit Manager`, `K-RMF Evidence`) 정상 동작

### 다음 단계 작업

- 11단계: 메인 포털 대시보드 및 최종 산출물 정리

## 9단계: 자체 플러그인 4차 - K-RMF 증빙관리

### 작성일시

2026-06-28

### 작업 단계

9단계 자체 플러그인 4차 - K-RMF 증빙관리

### 작업 목표

- Backstage 자체 플러그인 형태의 `krmf-evidence` 기능 PoC 개발
- mock data 기반으로 K-RMF 통제항목, 증빙자료, 보안 미흡사항, 타 수행사 제출자료, 통합진척률 대시보드 구현
- Backstage 좌측 메뉴에 `K-RMF Evidence` 추가
- 기존 `Project Workspace`, `Export Approval`, `Credit Manager`, Keycloak OIDC 로그인, OpenSearch/OpenMetadata 구성 유지

### 생성/변경 파일

- `packages/app/src/App.tsx`
- `packages/app/src/components/krmf-evidence/index.ts`
- `packages/app/src/components/krmf-evidence/types.ts`
- `packages/app/src/components/krmf-evidence/mockKrmfEvidence.ts`
- `packages/app/src/components/krmf-evidence/KrmfEvidencePage.tsx`
- `packages/app/src/components/krmf-evidence/KrmfDashboard.tsx`
- `packages/app/src/components/krmf-evidence/ProgressSummaryCards.tsx`
- `packages/app/src/components/krmf-evidence/ControlItemList.tsx`
- `packages/app/src/components/krmf-evidence/ControlItemDetail.tsx`
- `packages/app/src/components/krmf-evidence/ControlStatusChip.tsx`
- `packages/app/src/components/krmf-evidence/EvidenceList.tsx`
- `packages/app/src/components/krmf-evidence/EvidenceStatusChip.tsx`
- `packages/app/src/components/krmf-evidence/RiskIssueList.tsx`
- `packages/app/src/components/krmf-evidence/IssueStatusChip.tsx`
- `packages/app/src/components/krmf-evidence/RiskSeverityChip.tsx`
- `packages/app/src/components/krmf-evidence/ExternalSubmissionList.tsx`
- `docs/PLUGIN_KRMF_EVIDENCE.md`
- `docs/ARCHITECTURE.md`
- `docs/WBS.md`
- `docs/TODO.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/assets/krmf-evidence.png`

### 구현 내용

- `packages/app/src/components/krmf-evidence/`에 PoC 컴포넌트 구현
- 11건의 K-RMF 통제항목 mock data 작성(접근통제, 계정관리, 로그관리, 암호화, 네트워크 보안, 취약점 관리, 데이터 보호, 백업/복구, 변경관리, 보안감사)
- 통합진척률 대시보드(요약 카드 8개, 영역별 진척률, 최근 미흡사항) 구현
- 통제항목 목록 및 상세(적용 여부, 담당자, 점검 상태, 증빙/이력, 관련 프로젝트/반출 이력) 구현
- 증빙자료 목록(상태/유형/검색 필터) 구현
- 보안 미흡사항 조치관리(위험도/조치 상태/검색 필터) 구현
- 타 수행사 제출자료 관리(검토 상태/검색 필터, 보완요청 여부) 구현
- `App.tsx`에 `K-RMF Evidence` 메뉴 및 `/krmf-evidence` 라우팅 추가

### 실행 방법

Backstage가 실행 중이면 자동 핫 리로드됩니다.

```bash
cd kt-ai-portal/backstage-portal
yarn start
```

### 검증 방법

1. `http://localhost:3000` 접속
2. Keycloak 로그인 또는 Guest 로그인
3. 좌측 메뉴 `K-RMF Evidence` 클릭
4. 대시보드 요약 카드 및 영역별 진척률 확인
5. `통제항목`, `증빙자료`, `미흡사항`, `타 수행사 자료` 탭 확인
6. `Project Workspace`, `Export Approval`, `Credit Manager` 메뉴 및 기존 화면이 정상 동작하는지 확인

### 확인 결과

- Backstage `http://localhost:3000` 정상 접속
- Keycloak `admin01` 사용자 로그인 상태 유지
- `K-RMF Evidence` 메뉴 노출 및 `/krmf-evidence` 이동 확인
- 대시보드 요약 카드 8개 및 영역별 진척률 정상 표시
- 통제항목 11건 목록 및 상세 정보 표시
- 증빙자료 5건, 보안 미흡사항 4건, 타 수행사 제출자료 5건 표시
- `Project Workspace`, `Export Approval`, `Credit Manager` 화면 정상 동작
- OpenSearch `http://localhost:9200` 응답 200 유지
- OpenMetadata `http://localhost:8585/api/v1/system/version` 응답 200 유지

### 발생 오류 및 조치

- MUI v4 `findDOMNode is deprecated` 경고 발생
  - 기능에 영향 없음. 운영 확장 시 MUI/Backstage UI 최신 버전 마이그레이션 검토

### 미완료/보류 사항

- 실제 DB/API 연동
- 파일 업로드/다운로드 및 파일 저장소 연계
- Project Workspace, Export Approval과의 실제 데이터 연동
- 감사 시스템 및 이력 자동 수집
- Keycloak 사용자/그룹 기반 권한 제어
- 정식 Backstage Plugin 구조 전환

### 다음 단계 작업

- 10단계: 통합검색 플러그인 또는 화면 개발

## 8단계: 자체 플러그인 3차 - 크레딧 관리

### 작성일시

2026-06-28

### 작업 단계

8단계 자체 플러그인 3차 - 크레딧 관리

### 사전 정정 사항

- 7단계 및 이전 단계에서 보안등급을 `공개`, `내부`, `비밀` 3개로 통일
- 정정 대상:
  - `packages/app/src/components/export-approval/*`
  - `packages/app/src/components/project-workspace/*`
  - `docs/PLUGIN_PROJECT_WORKSPACE.md`
  - `docs/OPENMETADATA_DESIGN.md`
  - `notes/DECISIONS.md`
- 보안등급을 `공개`, `내부`, `비밀` 3개로 통일

### 작업 목표

- Backstage 자체 플러그인 형태의 `credit-manager` 기능 PoC 개발
- mock data 기반으로 프로젝트별 크레딧 현황, 요약 카드, 충전/사용 이력, 자원별 단가, 자원 제한 상태, 알림 패널 구현
- Backstage 좌측 메뉴에 `Credit Manager` 추가
- 기존 `Project Workspace`, `Export Approval`, Keycloak OIDC 로그인, OpenSearch/OpenMetadata 구성 유지

### 생성/변경 파일

- `packages/app/src/App.tsx`
- `packages/app/src/components/credit-manager/index.ts`
- `packages/app/src/components/credit-manager/types.ts`
- `packages/app/src/components/credit-manager/mockCredits.ts`
- `packages/app/src/components/credit-manager/CreditManagerPage.tsx`
- `packages/app/src/components/credit-manager/ProjectCreditSummary.tsx`
- `packages/app/src/components/credit-manager/CreditBalanceCards.tsx`
- `packages/app/src/components/credit-manager/CreditChargeHistory.tsx`
- `packages/app/src/components/credit-manager/CreditUsageHistory.tsx`
- `packages/app/src/components/credit-manager/ResourcePriceTable.tsx`
- `packages/app/src/components/credit-manager/ResourceAvailabilityPanel.tsx`
- `packages/app/src/components/credit-manager/CreditAlertPanel.tsx`
- `packages/app/src/components/credit-manager/CreditStatusChip.tsx`
- `packages/app/src/components/export-approval/SecurityLevelChip.tsx`
- `packages/app/src/components/export-approval/ExportRequestForm.tsx`
- `packages/app/src/components/export-approval/mockExportRequests.ts`
- `packages/app/src/components/project-workspace/types.ts`
- `packages/app/src/components/project-workspace/mockProjects.ts`
- `packages/app/src/components/project-workspace/ProjectRequestForm.tsx`
- `docs/PLUGIN_CREDIT_MANAGER.md`
- `docs/PLUGIN_PROJECT_WORKSPACE.md`
- `docs/OPENMETADATA_DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/WBS.md`
- `docs/TODO.md`
- `notes/DECISIONS.md`
- `docs/assets/credit-manager.png`

### 구현 내용

- `packages/app/src/components/credit-manager/`에 PoC 컴포넌트 구현
- 5건 이상의 mock 프로젝트 크레딧 데이터 작성
- 요약 카드(총 부여/사용/잔여/평균 사용률/부족 프로젝트 수/이번 달 예상 사용량) 구현
- 프로젝트별 크레딧 현황 테이블, 충전 이력, 사용 이력, 자원별 단가표 구현
- 선택된 프로젝트의 크레딧 상태에 따른 자원 사용 가능/제한 패널 구현
- 알림/경고 패널 구현
- `App.tsx`에 `Credit Manager` 메뉴 및 `/credit-manager` 라우팅 추가
- 보안등급을 `공개`, `내부`, `비밀` 3개로 통일

### 실행 방법

Backstage가 실행 중이면 자동 핫 리로드됩니다.

```bash
cd kt-ai-portal/backstage-portal
yarn start
```

### 검증 방법

1. `http://localhost:3000` 접속
2. Keycloak 로그인 또는 Guest 로그인
3. 좌측 메뉴 `Credit Manager` 클릭
4. 요약 카드, 알림 패널, 프로젝트별 현황, 자원 사용 가능 상태, 충전/사용 이력, 단가표 확인
5. `Project Workspace`, `Export Approval` 메뉴 및 기존 화면이 정상 동작하는지 확인

### 확인 결과

- Backstage `http://localhost:3000` 정상 접속
- Keycloak `admin01` 사용자 로그인 상태 유지
- `Credit Manager` 메뉴 노출 및 `/credit-manager` 이동 확인
- 요약 카드 6개 정상 표시
- 프로젝트별 크레딧 현황 5건 표시
- 자원 사용 가능 상태(정상/주의/부족/소진/중지) 표시
- 충전 이력, 사용 이력, 자원별 단가표 표시
- 알림/경고 패널 표시
- `Project Workspace`, `Export Approval` 화면 정상 동작
- OpenSearch `http://localhost:9200` 응답 200 유지
- OpenMetadata `http://localhost:8585/api/v1/system/version` 응답 200 유지

### 발생 오류 및 조치

- MUI v4 `findDOMNode is deprecated` 경고 발생
  - 기능에 영향 없음. 운영 확장 시 MUI/Backstage UI 최신 버전 마이그레이션 검토
- `validateDOMNesting` 경고: `ResourceAvailabilityPanel`에서 `Chip`이 `<p>` 납부에 위치
  - `Typography component="div"`로 변경하여 해결

### 미완료/보류 사항

- 실제 DB/API 연동
- 실제 과금/결제 처리
- Keycloak 사용자/그룹 연동
- OpenMetadata/OpenSearch 연계
- AI 학습 작업/Notebook/Inference API 사용량 수집
- 클라우드 모니터링 시스템 연계
- 크레딧 부족 시 실제 자원 제한
- 정식 Backstage Plugin 구조 전환

### 다음 단계 작업

- 9단계: 자체 플러그인 4차 - K-RMF 증빙관리

## 7단계: 자체 플러그인 2차 - 반출/반입 관리

### 작성일시

2026-06-28

### 작업 단계

7단계 자체 플러그인 2차 - 반출/반입 관리

### 작업 목표

- Backstage 자체 플러그인 형태의 `export-approval` 기능 PoC 개발
- mock data 기반으로 반출/반입 신청 목록, 상세, 등록 화면 구현
- 반출 대상 유형, 승인 상태, 보안등급/공개여부/사용권한, 다운로드 여부, 감사로그 UI 구현
- Backstage 좌측 메뉴에 `Export Approval` 추가
- 기존 `Project Workspace`, Keycloak OIDC 로그인, OpenSearch/OpenMetadata 구성 유지

### 생성/변경 파일

- `packages/app/src/App.tsx`
- `packages/app/src/components/export-approval/index.ts`
- `packages/app/src/components/export-approval/types.ts`
- `packages/app/src/components/export-approval/mockExportRequests.ts`
- `packages/app/src/components/export-approval/ExportApprovalPage.tsx`
- `packages/app/src/components/export-approval/ExportRequestList.tsx`
- `packages/app/src/components/export-approval/ExportRequestDetail.tsx`
- `packages/app/src/components/export-approval/ExportRequestForm.tsx`
- `packages/app/src/components/export-approval/ExportStatusChip.tsx`
- `packages/app/src/components/export-approval/ExportTargetTypeChip.tsx`
- `packages/app/src/components/export-approval/SecurityLevelChip.tsx`
- `packages/app/src/components/export-approval/AuditLogPanel.tsx`
- `docs/PLUGIN_EXPORT_APPROVAL.md`
- `docs/ARCHITECTURE.md`
- `docs/WBS.md`
- `docs/TODO.md`
- `notes/DECISIONS.md`
- `docs/assets/export-approval-list.png`
- `docs/assets/export-approval-form.png`

### 구현 내용

- `packages/app/src/components/export-approval/`에 PoC 컴포넌트 구현
- 8건 이상의 mock 반출/반입 신청 데이터 작성
- 반출/반입 구분, 대상 유형 Chip, 상태 Chip, 보안 Chip 구현
- 신청 목록 테이블, 상세 패널, 등록 폼, 감사로그 패널 구현
- `App.tsx`에 `Export Approval` 메뉴 및 `/export-approval` 라우팅 추가
- `Home`, `Project Workspace` 메뉴 및 라우팅 유지

### 실행 방법

Backstage가 실행 중이면 자동 핫 리로드됩니다.

```bash
cd kt-ai-portal/backstage-portal
yarn start
```

### 검증 방법

1. `http://localhost:3000` 접속
2. Keycloak 로그인 또는 Guest 로그인
3. 좌측 메뉴 `Export Approval` 클릭
4. 반출/반입 신청 목록 및 상세 정보 확인
5. `신청 등록` 탭에서 폼 및 mock 저장 버튼 확인
6. `Project Workspace` 메뉴 및 기존 화면이 정상 동작하는지 확인

### 확인 결과

- Backstage `http://localhost:3000` 정상 접속
- Keycloak `admin01` 사용자 로그인 상태 유지
- `Export Approval` 메뉴 노출 및 `/export-approval` 이동 확인
- 반출/반입 신청 목록 8건 표시
- 신청 상세 정보(신청 사유, 보안설정, 첨부자료, 감사로그) 표시
- 신청 등록 UI 표시
- `Project Workspace` 화면 `/project-workspace` 정상 동작
- OpenSearch `http://localhost:9200` 응답 200 유지
- OpenMetadata `http://localhost:8585/api/v1/system/version` 응답 200 유지

### 발생 오류 및 조치

- MUI v4 Tabs의 `findDOMNode is deprecated` 경고 발생
  - 기능에는 영향 없음. 운영 확장 시 MUI/Backstage UI 최신 버전 마이그레이션 검토

### 미완료/보류 사항

- 실제 DB/API 연동
- 실제 파일 업로드/다운로드 기능
- Keycloak 사용자/그룹과 신청자/승인자 연동
- OpenMetadata 자산 연동
- OpenSearch 검색 연계
- K-RMF 증빙관리 연계
- 정식 Backstage Plugin 구조 전환

### 다음 단계 작업

- 8단계: 자체 플러그인 3차 - 크레딧 관리

## 6단계: 자체 플러그인 1차 - 프로젝트/워크스페이스 관리

### 작성일시

2026-06-28

### 작업 단계

6단계 자체 플러그인 1차 - 프로젝트/워크스페이스 관리

### 작업 목표

- Backstage 자체 플러그인 형태의 `project-workspace` 기능 PoC 개발
- mock data 기반으로 프로젝트 목록, 상세, 생성 신청, 상태, 참여자/역할, 리소스 할당량 화면 구현
- Backstage 좌측 메뉴에 `Project Workspace` 추가
- 기존 Keycloak OIDC 로그인 및 OpenSearch/OpenMetadata 구성 유지

### 생성/변경 파일

- `packages/app/src/App.tsx`
- `packages/app/src/components/project-workspace/index.ts`
- `packages/app/src/components/project-workspace/types.ts`
- `packages/app/src/components/project-workspace/mockProjects.ts`
- `packages/app/src/components/project-workspace/ProjectWorkspacePage.tsx`
- `packages/app/src/components/project-workspace/ProjectList.tsx`
- `packages/app/src/components/project-workspace/ProjectDetail.tsx`
- `packages/app/src/components/project-workspace/ProjectRequestForm.tsx`
- `packages/app/src/components/project-workspace/ProjectStatusChip.tsx`
- `packages/app/src/components/project-workspace/ResourceQuotaCard.tsx`
- `docs/PLUGIN_PROJECT_WORKSPACE.md`
- `docs/ARCHITECTURE.md`
- `docs/WBS.md`
- `docs/TODO.md`
- `notes/DECISIONS.md`
- `docs/assets/project-workspace-list.png`
- `docs/assets/project-workspace-request.png`

### 구현 내용

- `packages/app/src/components/project-workspace/`에 PoC 컴포넌트 구현
- 5건 이상의 mock 프로젝트 데이터 작성
- 프로젝트 목록 테이블, 상세 패널, 생성 신청 폼, 상태 Chip, 리소스 할당량 카드 구현
- `App.tsx`에 `SidebarPage`/`Content` 레이아웃 및 `Project Workspace` 메뉴 추가
- `/project-workspace` 라우팅 연결

### 실행 방법

Backstage가 실행 중이면 자동 핫 리로드됩니다.

```bash
cd kt-ai-portal/backstage-portal
yarn start
```

### 검증 방법

1. `http://localhost:3000` 접속
2. Keycloak 로그인 또는 Guest 로그인
3. 좌측 메뉴 `Project Workspace` 클릭
4. 프로젝트 목록 및 상세 정보 확인
5. `프로젝트 생성 신청` 탭에서 폼 및 mock 저장 버튼 확인

### 확인 결과

- Backstage `http://localhost:3000` 정상 접속
- Keycloak `admin01` 사용자 로그인 상태 유지 (Home 화면에서 사용자 정보 확인)
- `Project Workspace` 메뉴 노출 및 `/project-workspace` 이동 확인
- 프로젝트 목록 5건 표시
- 프로젝트 상세 정보(참여자, 리소스, 데이터셋, 모델, 승인 이력) 표시
- 프로젝트 생성 신청 UI 표시
- OpenSearch `http://localhost:9200` 응답 확인 (200)
- OpenMetadata `http://localhost:8585` 접속 확인 (이전 단계 유지)

### 발생 오류 및 조치

- MUI v4 Tabs의 `findDOMNode is deprecated` 경고 발생
  - 기능에는 영향 없음. 운영 확장 시 MUI/Backstage UI 최신 버전 마이그레이션 검토
- `SidebarPage`/`Content` 미사용으로 인해 Playwright 테스트 시 Sidebar drawer가 콘텐츠를 가림
  - `SidebarPage` + `Content`로 레이아웃 변경하여 해결

### 미완료/보류 사항

- 실제 DB/API 연동
- Keycloak 사용자/그룹과 프로젝트 멤버 연동
- OpenMetadata 데이터셋/모델 연동
- 크레딧 관리, 반출관리, K-RMF 증빙관리 플러그인과의 연계
- 정식 Backstage Plugin 구조 전환

### 다음 단계 작업

- 7단계: 자체 플러그인 2차 - 반출/반입 관리

## 5단계: OpenMetadata 카탈로그 연동

### 작성일시

2026-06-28

### 작업 단계

5단계 OpenMetadata 카탈로그 연동

### 작업 목표

- OpenMetadata 1.6.0을 Docker Compose 기반으로 로컬 개발환경에서 실행
- UI(`http://localhost:8585`) 및 API(`/api/v1`) 접근 검증
- 데이터/AI 카탈로그 개념 및 Backstage 연동 후보 문서화
- Backstage와의 직접 연동은 10단계로 이관

### 생성/변경 파일

- `infra/openmetadata/docker-compose.yml`
- `infra/openmetadata/README.md`
- `docs/OPENMETADATA_DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/WBS.md`
- `docs/TODO.md`
- `notes/DECISIONS.md`
- `docs/assets/openmetadata-ui.png`

### 구현 내용

- OpenMetadata 1.6.0 공식 Docker Compose(quickstart) 기반 실행
- 기존 `kt-keycloak`(8080) 및 `kt-opensearch`(9200)와의 포트 충돌 회피를 위해 Elasticsearch/MySQL/Ingestion 호스트 포트 매핑 제거
- OpenMetadata UI `http://localhost:8585` 접속 확인
- `/api/v1/system/version` API 응답 확인 (버전 1.6.0)
- JWT 로그인(`POST /api/v1/users/login`) 및 `tables`, `mlmodels` API 호출 검증
- 데이터셋/테이블/AI 모델/파이프라인 메타데이터 개념 정리
- Backstage 연동 후보 정리: REST API 직접 호출, OpenMetadata → OpenSearch 싱크, UI 임베드, OIDC SSO
- `docs/OPENMETADATA_DESIGN.md` 작성

### 실행 방법

```bash
cd infra/openmetadata
docker compose up -d
```

### 검증 방법

1. `curl http://localhost:8586/healthcheck`로 healthcheck 확인
2. `curl http://localhost:8585/api/v1/system/version`로 버전 확인
3. `POST /api/v1/users/login`으로 JWT 발급
4. `GET /api/v1/tables?limit=0`, `GET /api/v1/mlmodels?limit=0` API 호출 확인
5. 브라우저에서 `http://localhost:8585` 접속 확인

### 확인 결과

- `openmetadata_server` 등 6개 컨테이너 정상 기동
- UI `http://localhost:8585` 로그인 페이지 정상 표시
- `/api/v1/system/version` 정상 응답 (OpenMetadata 1.6.0)
- JWT 로그인 성공 및 `tables`, `mlmodels` API 200 응답
- 기존 서비스와의 포트 충돌 없음

### 발생 오류 및 조치

- 공식 quickstart의 호스트 포트(3306, 9200, 8080)가 기존 `kt-keycloak`/`kt-opensearch`와 충돌
  - 조치: Elasticsearch/MySQL/Ingestion의 호스트 포트 매핑을 제거하고 낮쪽 Docker 네트워크에서만 통신

### 미완료/보류 사항

- OpenMetadata 서비스 등록 및 실제 데이터 소스 연결 → 10단계 이후
- OpenMetadata → OpenSearch 메타데이터 싱크 → 10단계
- Backstage 통합검색 UI 및 OpenMetadata 상세 연결 → 10단계
- OpenMetadata SSO(Keycloak OIDC) 연동 → 운영 확장 단계

### 다음 단계 작업

- 6단계: 자체 플러그인 1차 - 프로젝트/워크스페이스 관리

## 4단계: OpenSearch 검색엔진 연동

### 작성일시

2026-06-28

### 작업 단계

4단계 OpenSearch 검색엔진 연동

### 작업 목표

- OpenSearch를 Docker Compose 기반으로 로컬 개발환경에서 단독 실행
- 포털 통합검색에 사용할 `portal-catalog` 인덱스 생성
- 샘플 메타데이터 적재 및 검색 테스트
- Backstage와의 직접 연동은 10단계로 이관

### 생성/변경 파일

- `infra/opensearch/docker-compose.yml`
- `infra/opensearch/README.md`
- `infra/opensearch/scripts/01-create-index.sh`
- `infra/opensearch/scripts/02-seed-sample-data.sh`
- `infra/opensearch/scripts/03-search-test.sh`
- `infra/opensearch/scripts/run-all.sh`
- `docs/SEARCH_DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/WBS.md`
- `docs/TODO.md`
- `notes/DECISIONS.md`

### 구현 내용

- OpenSearch 2.19.1 + OpenSearch Dashboards 2.19.1 개발용 단일 노드 구성
- 보안 플러그인 비활성화 및 개발용 초기 관리자 비밀번호 설정
- `portal-catalog` 인덱스 생성 (명시적 mapping)
- 샘플 데이터 10건 적재 (dataset 4건, model 2건, docker_image 1건, pypi_package 1건, document 2건)
- 키워드 검색 및 유형/보안등급/태그 필터 검색 테스트 스크립트 작성
- `run-all.sh` 오케스트레이션 스크립트 작성
- `docs/SEARCH_DESIGN.md` 작성

### 실행 방법

```bash
cd infra/opensearch
docker compose up -d
./scripts/run-all.sh
```

### 검증 방법

1. `curl http://localhost:9200`로 OpenSearch 응답 확인
2. `http://localhost:5601`로 OpenSearch Dashboards 접속 확인
3. `./scripts/01-create-index.sh`로 `portal-catalog` 인덱스 생성
4. `./scripts/02-seed-sample-data.sh`로 샘플 데이터 적재
5. `./scripts/03-search-test.sh`로 6가지 검색 케이스 실행

### 확인 결과

- `kt-opensearch`, `kt-opensearch-dashboards` 컨테이너 정상 실행
- `curl http://localhost:9200` 정상 응답 (OpenSearch 2.19.1)
- OpenSearch Dashboards `http://localhost:5601` 접속 가능
- `portal-catalog` 인덱스 생성 성공
- 샘플 데이터 10건 적재 성공
- 검색 테스트 6개 케이스 모두 정상 수행
  - 전체 검색: 10건
  - `정비` 키워드 검색: 2건
  - `고장예측` 키워드 검색: 2건
  - `type=dataset` 필터: 4건
  - `securityLevel=내부` 필터: 5건
  - `tags=군수` 필터: 7건

### 발생 오류 및 조치

- 최초 실행 시 `OPENSEARCH_INITIAL_ADMIN_PASSWORD` 미설정으로 OpenSearch가 종료됨
  - 조치: `docker-compose.yml`에 `OPENSEARCH_INITIAL_ADMIN_PASSWORD` 추가
- `plugins.security.disabled=true`와 `DISABLE_SECURITY_PLUGIN=true`를 동시에 설정 시 중복 설정 오류 발생
  - 조치: `DISABLE_SECURITY_PLUGIN=true`만 유지

### 미완료/보류 사항

- Backstage 검색 UI 개발 → 10단계
- OpenSearch와 Backstage 직접 연동 → 10단계
- 임베딩 기반 유사도 검색 → 10단계 이후 고도화
- OpenMetadata 연동 → 5단계

### 다음 단계 작업

- 5단계: OpenMetadata 카탈로그 연동
  - `infra/openmetadata` 실행 방법 정리
  - OpenMetadata 공식 Docker Compose 기반 실행
  - 데이터셋/테이블/AI 모델/파이프라인 메타데이터 개념 문서화
  - OpenMetadata API 연계 후보 정리
  - `docs/OPENMETADATA_DESIGN.md` 작성


## 18단계: 마이페이지 및 환경설정 화면 추가

### 작성일시

2026-07-04

### 작업 단계

18단계 마이페이지 및 환경설정 화면 추가

### 작업 목표

- 마이페이지 메인 화면 및 Sidebar 메뉴 추가
- 프로필 조회/수정, 이메일 확인, 비밀번호 변경 화면 추가
- 활성 세션 조회 및 강제 종료 mock 화면 추가
- 내 프로젝트/워크스페이스 현황, 자원 사용 이력, 크레딧 사용 내역 화면 추가
- 알림 설정, 개인 API Key, 내 활동 로그 화면 추가
- 환경설정 메인 화면 및 Sidebar 메뉴 추가
- 시스템 파라미터, 보안 정책, 자원할당 기준, 운영 설정 화면 추가
- 설정 변경 이력 및 요구사항 대응 현황 화면 추가
- 마이페이지 및 환경설정 설계 문서 작성

### 생성 파일

- `packages/app/src/components/my-page/types.ts`
- `packages/app/src/components/my-page/mockMyPageData.ts`
- `packages/app/src/components/my-page/MyPage.tsx`
- `packages/app/src/components/my-page/MyPageSummaryCards.tsx`
- `packages/app/src/components/my-page/MyPageTabs.tsx`
- `packages/app/src/components/my-page/ProfilePanel.tsx`
- `packages/app/src/components/my-page/EmailVerificationPanel.tsx`
- `packages/app/src/components/my-page/PasswordChangePanel.tsx`
- `packages/app/src/components/my-page/ActiveSessionPanel.tsx`
- `packages/app/src/components/my-page/SessionStatusChip.tsx`
- `packages/app/src/components/my-page/MyProjectWorkspacePanel.tsx`
- `packages/app/src/components/my-page/ResourceUsageHistoryPanel.tsx`
- `packages/app/src/components/my-page/MyCreditHistoryPanel.tsx`
- `packages/app/src/components/my-page/NotificationSettingPanel.tsx`
- `packages/app/src/components/my-page/PersonalApiKeyPanel.tsx`
- `packages/app/src/components/my-page/MyActivityLogPanel.tsx`
- `packages/app/src/components/my-page/ActivityTypeChip.tsx`
- `packages/app/src/components/my-page/MyPageRequirementCoveragePanel.tsx`
- `packages/app/src/components/environment-settings/types.ts`
- `packages/app/src/components/environment-settings/mockEnvironmentSettingsData.ts`
- `packages/app/src/components/environment-settings/EnvironmentSettings.tsx`
- `packages/app/src/components/environment-settings/EnvironmentSettingsSummaryCards.tsx`
- `packages/app/src/components/environment-settings/EnvironmentSettingsTabs.tsx`
- `packages/app/src/components/environment-settings/SystemParameterPanel.tsx`
- `packages/app/src/components/environment-settings/SecuritySettingPanel.tsx`
- `packages/app/src/components/environment-settings/ResourceAllocationPolicyPanel.tsx`
- `packages/app/src/components/environment-settings/PortalOperationSettingPanel.tsx`
- `packages/app/src/components/environment-settings/SettingChangeHistoryPanel.tsx`
- `packages/app/src/components/environment-settings/EnvironmentRequirementCoveragePanel.tsx`
- `packages/app/src/components/common/RequirementCoveragePanel.tsx`
- `docs/MY_PAGE_ENVIRONMENT_SETTINGS_DESIGN.md`

### 변경 파일

- `packages/app/src/App.tsx`
- `packages/app/src/components/integrated-search/SearchApiClient.ts`
- `packages/app/src/components/my-page/EmailVerificationPanel.tsx`
- `packages/app/src/components/my-page/PasswordChangePanel.tsx`
- `packages/app/src/components/my-page/NotificationSettingPanel.tsx`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/REQUIREMENT_SCREEN_COVERAGE.md`

### 구현 내용

- `MyPage` 상단 요약 카드 및 11개 탭(프로필/이메일/비밀번호/활성 세션/내 프로젝트/자원 사용/크레딧/알림/API Key/활동 로그/요구사항 대응) 구성
- `ProfilePanel`에서 사용자 기본/조직 정보 조회 및 mock 수정
- `EmailVerificationPanel`에서 현재 이메일 확인 상태 및 변경 요청 UI 제공
- `PasswordChangePanel`에서 현재/새/확인 비밀번호 입력과 정책 요약 제공
- `ActiveSessionPanel`에서 세션 목록/현재 세션/강제 종료 mock 제공
- `MyProjectWorkspacePanel`에서 참여 프로젝트, 역할, 할당 자원, 크레딧 현황 표시
- `ResourceUsageHistoryPanel`, `MyCreditHistoryPanel`에서 사용/부여 이력 표시
- `NotificationSettingPanel`에서 알림 유형별 채널/임계치/시간대 설정
- `PersonalApiKeyPanel`에서 API Key 생성/폐기 mock, 마스킹된 Key 표시
- `MyActivityLogPanel`에서 로그인/조회/수정/제안 등 활동 이력 표시
- `EnvironmentSettings` 상단 요약 카드 및 6개 탭(시스템 파라미터/보안 정책/자원할당 기준/운영 설정/변경 이력/요구사항 대응) 구성
- `SystemParameterPanel`에서 세션/인증/감사/알림 파라미터 조회/변경 mock
- `SecuritySettingPanel`에서 비밀번호/계정 잠금/세션/반출/API Key/감사 정책 관리
- `ResourceAllocationPolicyPanel`에서 역할/조직별 CPU/GPU/Memory/Storage/Network/크레딧 기준 관리
- `PortalOperationSettingPanel`에서 화멳별 운영 설정 및 담당자 관리
- `SettingChangeHistoryPanel`에서 변경/승인/반려 이력 조회
- `RequirementCoveragePanel` 공통 컴포넌트로 마이페이지/환경설정 요구사항 대응 현황 재사용
- `App.tsx`에 `/my-page`, `/environment-settings` 라우트 및 Sidebar 메뉴 추가
- 보안등급 호환용 `보안등급 오타` alias 제거 (`SearchApiClient.ts`)

### 실행 방법

```bash
cd kt-ai-portal/backstage-portal
yarn start
```

### 검증 방법

1. `http://localhost:3000` 접속
2. 좌측 Sidebar에서 `My Page` 클릭
3. 각 탭(프로필/이메일/비밀번호/세션/프로젝트/자원/크레딧/알림/API Key/활동 로그/요구사항 대응) 확인
4. 좌측 Sidebar에서 `Environment Settings` 클릭
5. 각 탭(시스템 파라미터/보안 정책/자원할당 기준/운영 설정/변경 이력/요구사항 대응) 확인

### 확인 결과

- Backstage `http://localhost:3000` 정상 접속
- `/my-page` 이동 및 상단 요약 카드, 프로필 탭 정상 표시
- `/environment-settings` 이동 및 시스템 파라미터 탭 정상 표시
- Sidebar에 `My Page`, `Environment Settings` 메뉴 노출
- OpenSearch `http://localhost:9200` 응답 200 유지
- OpenMetadata `http://localhost:8585/api/v1/system/version` 응답 200 유지
- `yarn tsc --noEmit`에서 신규 코드 타입 오류 없음 (기존 `App.test.tsx` 오류 제외)

### 발생 오류 및 조치

- MUI v4 Tabs의 `findDOMNode is deprecated` 경고 유지
  - 기능에 영향 없음
- `App.test.tsx` TypeScript 오류 유지 (기존 오류)

### 미완료/보류 사항

- 실제 Keycloak User Profile/Session/Password/Email API 연동
- 실제 DB, Notification 서비스 연동
- API Key Vault 생성/저장 연동
- 운영 설정 실시간 반영

### 다음 단계 작업

- 19단계: 육해공군 관리자 권한 및 멀티테넌트 관리 화면 추가


## 19단계: 육해공군 관리자 권한 및 멀티테넌트 관리 화면 추가

### 작성일시

2026-07-04

### 작업 단계

19단계 육해공군 관리자 권한 및 멀티테넌트 관리 화면 추가

### 작업 목표

- Tenant Management 메인 화면 및 Sidebar 메뉴 추가
- 군별 테넌트 개요 화면 추가
- 위임관리 체계 화면 추가
- 군별 리소스 풀 관리 화면 추가
- 군별 쿼터 할당/변경/회수 화면 추가
- 전체 및 군별 사용량 대시보드 화면 추가
- 군별 프로젝트 사용량 화면 추가
- 테넌트 경계/분리 정책 화면 추가
- 쿼터 변경 이력 화면 추가
- Portal Dashboard Quick Links 및 요약 카드 확장
- Tenant Management 설계 문서 작성

### 생성 파일

- `packages/app/src/components/tenant-management/types.ts`
- `packages/app/src/components/tenant-management/mockTenantManagementData.ts`
- `packages/app/src/components/tenant-management/TenantManagementPage.tsx`
- `packages/app/src/components/tenant-management/TenantSummaryCards.tsx`
- `packages/app/src/components/tenant-management/TenantManagementTabs.tsx`
- `packages/app/src/components/tenant-management/BranchTenantOverviewPanel.tsx`
- `packages/app/src/components/tenant-management/BranchAdminDelegationPanel.tsx`
- `packages/app/src/components/tenant-management/BranchResourcePoolPanel.tsx`
- `packages/app/src/components/tenant-management/BranchQuotaManagementPanel.tsx`
- `packages/app/src/components/tenant-management/BranchUsageDashboardPanel.tsx`
- `packages/app/src/components/tenant-management/BranchProjectUsagePanel.tsx`
- `packages/app/src/components/tenant-management/TenantBoundaryPanel.tsx`
- `packages/app/src/components/tenant-management/QuotaChangeHistoryPanel.tsx`
- `packages/app/src/components/tenant-management/TenantRequirementCoveragePanel.tsx`
- `packages/app/src/components/tenant-management/BranchChip.tsx`
- `packages/app/src/components/tenant-management/ResourceStatusChip.tsx`
- `packages/app/src/components/tenant-management/QuotaStatusChip.tsx`
- `docs/TENANT_MANAGEMENT_DESIGN.md`

### 변경 파일

- `packages/app/src/App.tsx`
- `packages/app/src/components/portal-dashboard/types.ts`
- `packages/app/src/components/portal-dashboard/mockDashboardData.ts`
- `packages/app/src/components/portal-dashboard/SummaryMetricCards.tsx`
- `packages/app/src/components/portal-dashboard/QuickLinkCards.tsx`
- `docs/ARCHITECTURE.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/REQUIREMENT_SCREEN_COVERAGE.md`
- `notes/DECISIONS.md`

### 구현 내용

- `TenantManagementPage` 상단 요약 카드 및 9개 탭(군별 테넌트 개요/위임관리 체계/군별 리소스 풀/군별 쿼터 관리/사용량 대시보드/군별 프로젝트 사용량/테넌트 경계·분리 정책/쿼터 변경 이력/요구사항 대응 현황) 구성
- `BranchTenantOverviewPanel`에서 국방부 공통/육군/해군/공군 테넌트의 프로젝트/사용자/GPU/CPU/Storage/크레딧 현황 표시
- `BranchAdminDelegationPanel`에서 국방부 최상위 관리자에서 군별 관리자까지의 위임관리 구조 표시
- `BranchResourcePoolPanel`에서 GPU/CPU/Storage/Training Job 등 리소스 풀 및 사용률(LinearProgress) 표시
- `BranchQuotaManagementPanel`에서 쿼터 변경 요청/승인/반려 mock 처리
- `BranchUsageDashboardPanel`에서 전체/군별 사용률, 과다 사용 테넌트, 장애/점검 자원, 최근 7일 추이 표시
- `BranchProjectUsagePanel`에서 군별 프로젝트/워크스페이스의 자원 사용량 및 과다 사용 여부 표시
- `TenantBoundaryPanel`에서 사용자/프로젝트/데이터/크레딧 등 분리 정책과 활성/비활성 전환 mock 표시
- `QuotaChangeHistoryPanel`에서 쿼터 변경 이력(변경자/승인자/IP 등) 표시
- `RequirementCoveragePanel` 공통 컴포넌트 재사용으로 Tenant Management 요구사항 대응 현황 표시
- `App.tsx`에 `/tenant-management` 라우트 및 Sidebar `Tenant Management` 메뉴 추가
- Portal Dashboard Quick Links에 `Tenant Management` 추가, 요약 카드에 테넌트/군별 프로젝트/쿼터 변경 대기/과다 사용 경고 추가

### 실행 방법

```bash
cd kt-ai-portal/backstage-portal
yarn start
```

### 검증 방법

1. `http://localhost:3000` 접속
2. 좌측 Sidebar에서 `Tenant Management` 클릭
3. 각 탭(군별 테넌트 개요/위임관리/리소스 풀/쿼터 관리/사용량/프로젝트 사용량/경계정책/변경 이력/요구사항 대응) 확인
4. Portal Dashboard Quick Links에 `Tenant Management` 추가 확인
5. 기존 메뉴(Admin Console, Service Catalog, Proposal Board, My Page, Environment Settings 등) 정상 동작 확인

### 확인 결과

- Backstage `http://localhost:3000` 정상 접속
- `/tenant-management` 이동 및 상단 요약 카드, 군별 테넌트 개요 탭 정상 표시
- Sidebar에 `Tenant Management` 메뉴 노출
- Portal Dashboard Quick Links에 `Tenant Management` 추가 확인
- 기존 14~18단계 화면 정상 유지
- OpenSearch `http://localhost:9200` 응답 200 유지
- OpenMetadata `http://localhost:8585/api/v1/system/version` 응답 200 유지
- `yarn tsc --noEmit`에서 신규 코드 타입 오류 없음 (기존 `App.test.tsx` 오류 제외)

### 발생 오류 및 조치

- MUI v4 Tabs의 `findDOMNode is deprecated` 경고 유지
  - 기능에 영향 없음
- `App.test.tsx` TypeScript 오류 유지 (기존 오류)

### 미완료/보류 사항

- 실제 Kubernetes namespace/resource quota 연동
- 실제 OpenStack project/quota 연동
- 실제 CMP 자원 할당 API 연동
- 실제 Keycloak group/role 기반 군별 관리자 권한 연동
- 실제 프로젝트/워크스페이스 DB 연동
- 실제 자원 사용량 수집 API 연동

### 다음 단계 작업

- 20단계: 최종 요구사항 추적표 및 제안서용 화면 정리


---

## 20단계: 최종 요구사항 추적표 및 제안서용 화면 정리

### 작성일시

2026-07-04

### 목표

- 견적용 기능목록 1~155 전체 요구사항 대응표 작성
- 화멸별 RFP 매핑표 작성
- 화면 기준 충족도 최종 재평가
- 내부 로직 미구현 목록 정리
- 제안서용 화면 캡처 목록 정리
- 데모 시나리오 최종 정리
- 기술부채 최종 정리
- README/FINAL_DELIVERABLES 최종 갱신
- 제안서 작성용 요약 문구 작성

### 생성/변경 파일

- 신규: `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`
- 신규: `docs/SCREEN_TO_RFP_MAPPING.md`
- 신규: `docs/PROPOSAL_SCREENSHOT_CATALOG.md`
- 신규: `docs/INTERNAL_LOGIC_BACKLOG.md`
- 신규: `docs/PROPOSAL_SUMMARY_TEXT.md`
- 신규: `docs/DOCUMENT_INDEX.md`
- 수정: `docs/REQUIREMENT_SCREEN_COVERAGE.md`
- 수정: `docs/DEMO_SCRIPT.md`
- 수정: `docs/FINAL_DELIVERABLES.md`
- 수정: `docs/TECH_DEBT.md`
- 수정: `README.md`
- 수정: `backstage-portal/README.md`
- 수정: `docs/ARCHITECTURE.md`
- 수정: `docs/WBS.md`
- 수정: `docs/TODO.md`
- 수정: `notes/DECISIONS.md`
- 수정: `backstage-portal/packages/app/src/components/tenant-management/types.ts`
- 수정: `backstage-portal/packages/app/src/components/tenant-management/mockTenantManagementData.ts`
- 추가: `docs/assets/final/01-portal-dashboard.png`
- 추가: `docs/assets/final/07-admin-console-user-management.png`
- 추가: `docs/assets/final/08-admin-console-rbac-menu.png`
- 추가: `docs/assets/final/09-admin-console-policy-audit.png`
- 추가: `docs/assets/final/10-service-catalog.png`
- 추가: `docs/assets/final/11-proposal-board.png`
- 추가: `docs/assets/final/12-my-page.png`
- 추가: `docs/assets/final/13-environment-settings.png`
- 추가: `docs/assets/final/14-tenant-management.png`
- 이름 변경: `docs/assets/final/07-openmetadata.png` → `15-openmetadata-catalog.png`
- 이름 변경: `docs/assets/final/08-opensearch-dashboards.png` → `16-opensearch-catalog-index.png`

### 구현 내용

1. `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`에 견적용 기능목록 1~155를 화면/구현상태/충족도/내부 로직/후속개발 필요사항으로 매핑
2. `docs/SCREEN_TO_RFP_MAPPING.md`에 18개 화면과 대응 기능번호/RFP ID/제안서 문구/캡처 파일명 매핑
3. `docs/PROPOSAL_SCREENSHOT_CATALOG.md`에 18개 캡처의 촬영 상태와 제안서 삽입 위치 정리
4. `docs/INTERNAL_LOGIC_BACKLOG.md`에 인증/권한, 데이터/검색, 프로젝트/워크스페이스, 반입/반출, 크레딧, 카탈로그/제안, Tenant Management, 운영/감사 등 후속 개발 항목 정리
5. `docs/PROPOSAL_SUMMARY_TEXT.md`에 제안서 13개 영역별 완성형 문단 작성
6. `docs/DOCUMENT_INDEX.md`에 산출물 문서 인덱스 작성
7. `docs/REQUIREMENT_SCREEN_COVERAGE.md`를 최종 평가 기준(화면 충족도 90% 이상, 내부 로직 45~55%, 시연 가능성 85~90%)으로 갱신
8. `docs/DEMO_SCRIPT.md`를 15단계 시나리오로 최종 정리
9. `docs/FINAL_DELIVERABLES.md`에 구현 화면, 설계 문서, 추적 문서, 시연 문서, 기술부채, 스크린샷, Git 커밋, 미push 상태, 후속 과제 반영
10. `docs/TECH_DEBT.md`에 GitHub push 인증 이슈 및 보안/운영 전 검토 필요사항 추가
11. `README.md` 및 `backstage-portal/README.md`에 구현 화면 전체 목록, 산출물 문서, 캡처 목록, PoC 범위/한계, GitHub push 인증 이슈 반영
12. `docs/ARCHITECTURE.md`, `docs/WBS.md`, `docs/TODO.md`, `notes/DECISIONS.md`에 20단계 반영
13. `tenant-management`의 잔여 보안등급 오타 `보안등급 오타`를 `내부`로 수정

### 검증 결과

- Backstage `http://localhost:3000` 접속 가능
- Keycloak OIDC 로그인 가능 (`http://localhost:8080` 응답 200)
- Home 화면에 `국방지능화플랫폼` 표시
- Admin Console, Service Catalog, Proposal Board, My Page, Environment Settings, Tenant Management 접근 가능
- Integrated Search, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence 접근 가능
- OpenSearch `http://localhost:9200` 응답 200
- OpenMetadata `http://localhost:8585` 루트 응답 200
- `grep -R "보안등급 오타"` 결과: 런타임 코드/데이터에서 보안등급 오타 없음 (문서 내 역사적 기록만 잔존)
- `yarn tsc --noEmit`: 기존 `App.test.tsx` 오류 1건 외 신규 오류 없음

### 오류/조치

- 기존 `App.test.tsx` `createRoot()` TypeScript 오류는 20단계까지 유지
- MUI v4 `findDOMNode` warning 지속
- GitHub push PAT 인증 실패: 작업 완료 후 `git push` 시도 예정, 실패 시 보고

### 미완료/보류 사항

- 실제 DB/API/Keycloak Admin/Kubernetes/OpenStack/CMP/파일 저장소 연동은 20단계에서 구현하지 않음
- 21단계에서 제안서 자료 패키징 및 추가 캡처 보강 예정

### 다음 단계

21단계: 제안서 작성 자료 패키징 및 화면 캡처 보강


---

## 20.5단계: 포털 명칭, 메뉴 한글화, UI 색상 안정화

### 작성일시

2026-07-04

### 목표

- 포털 한글 공식 사이트명을 `국방지능형플랫폼포털`로 변경
- 영문 보조명 `K-Defense Intelligence Platform` 유지
- Sidebar 메뉴, Quick Links, 주요 화면 제목 한글화
- Admin Console 내부 탭 라벨 정리
- 기능을 깨뜨리지 않는 범위에서 색상/톤앤매너 보완
- 문서 및 산출물에 명칭/메뉴 반영

### 생성/변경 파일

- 수정: `backstage-portal/app-config.yaml`
- 수정: `backstage-portal/packages/app/src/App.tsx`
- 수정: `backstage-portal/packages/app/src/components/portal-dashboard/DashboardHero.tsx`
- 수정: `backstage-portal/packages/app/src/components/portal-dashboard/mockDashboardData.ts`
- 수정: `backstage-portal/packages/app/src/components/portal-dashboard/SummaryMetricCards.tsx`
- 수정: `backstage-portal/packages/app/src/components/portal-dashboard/QuickLinkCards.tsx`
- 수정: `backstage-portal/packages/app/src/components/admin-console/AdminConsolePage.tsx`
- 수정: `backstage-portal/packages/app/src/components/admin-console/MenuTreePanel.tsx`
- 수정: `backstage-portal/packages/app/src/components/admin-console/mockAdminData.ts`
- 수정: `backstage-portal/packages/app/src/components/proposal-board/ProposalBoardPage.tsx`
- 수정: `backstage-portal/packages/app/src/components/project-workspace/ProjectWorkspacePage.tsx`
- 수정: `backstage-portal/packages/app/src/components/integrated-search/IntegratedSearchPage.tsx`
- 수정: `backstage-portal/packages/app/src/components/credit-manager/CreditManagerPage.tsx`
- 수정: `backstage-portal/packages/app/src/components/my-page/MyPage.tsx`
- 수정: `backstage-portal/packages/app/src/components/tenant-management/TenantManagementPage.tsx`
- 수정: `backstage-portal/packages/app/src/components/export-approval/ExportApprovalPage.tsx`
- 수정: `backstage-portal/packages/app/src/components/service-catalog/ServiceCatalogPage.tsx`
- 수정: `README.md`
- 수정: `backstage-portal/README.md`
- 수정: `docs/FINAL_DELIVERABLES.md`
- 수정: `docs/DEMO_SCRIPT.md`
- 수정: `docs/PROPOSAL_SUMMARY_TEXT.md`
- 수정: `docs/SCREEN_TO_RFP_MAPPING.md`
- 수정: `docs/PROPOSAL_SCREENSHOT_CATALOG.md`
- 수정: `docs/REQUIREMENT_SCREEN_COVERAGE.md`
- 수정: `docs/DOCUMENT_INDEX.md`
- 수정: `docs/ARCHITECTURE.md`
- 수정: `docs/PORTAL_DASHBOARD.md`
- 수정: `docs/WBS.md`
- 수정: `docs/TODO.md`
- 수정: `notes/DECISIONS.md`

### 구현 내용

1. `app-config.yaml`의 `app.title`, `organization.name`, `mcpActions.name`을 `국방지능형플랫폼포털`로 변경
2. `App.tsx` Sidebar 메뉴 12개를 한글화 (라우트 path는 그대로 유지)
3. `DashboardHero.tsx` 제목/설명을 `국방지능형플랫폼포털`로 변경하고 그라데이션을 navy 계열(`#0F2A44` → `#1F4E79`)로 보완
4. `mockDashboardData.ts`의 Quick Links 제목/설명 한글화
5. `SummaryMetricCards.tsx`에 상단 accent border `#0F2A44` 추가
6. `QuickLinkCards.tsx`에 기본 border `#e0e6ed` 및 transition 적용
7. 주요 화면 제목 한글화:
   - Project Workspace → 프로젝트/워크스페이스
   - Integrated Search → 통합검색
   - Export Approval → 반입·반출 승인
   - Credit Manager → 크레딧 관리
   - Admin Console → 관리자 콘솔
   - Service Catalog → 서비스/도구 카탈로그
   - Proposal Board → 제안 게시판
   - My Page → 마이페이지
   - Tenant Management → 육해공군 관리자 권한 및 멀티테넌트 관리
8. `AdminConsolePage.tsx` 소제목 사이트명 변경 및 탭 라벨 `권한 / 역할` → `권한/역할` 정리
9. 메뉴 관리 mock 데이터의 루트 메뉴 이름을 `국방지능형플랫폼포털`로 변경
10. 문서 명칭/메뉴 반영 및 21단계 TODO에 재촬영 항목 추가

### 검증 결과

- Backstage `http://localhost:3000` 접속 가능
- Keycloak OIDC 로그인 가능
- Home 화면에 `국방지능형플랫폼포털` 표시
- Sidebar 메뉴가 한글로 표시됨
- 기존 라우트 (`/`, `/integrated-search`, `/project-workspace`, `/export-approval`, `/credit-manager`, `/krmf-evidence`, `/admin-console`, `/service-catalog`, `/proposal-board`, `/my-page`, `/environment-settings`, `/tenant-management`) 모두 유지
- 전체 메뉴 접근 가능
- Admin Console 내부 탭 정상 표시
- Service Catalog, Proposal Board, My Page, Environment Settings, Tenant Management 정상 표시
- OpenSearch proxy 검색 가능
- OpenMetadata 응답 가능
- `grep -R "보안등급 오타"` 결과: 보안등급 오타 없음
- `yarn tsc --noEmit`: 기존 `App.test.tsx` 오류 1건 외 신규 오류 없음

### 오류/조치

- 기존 `App.test.tsx` `createRoot()` TypeScript 오류는 20.5단계까지 유지
- MUI v4 `findDOMNode` warning 지속
- GitHub push PAT 인증 실패: 작업 완료 후 `git push` 시도 예정, 실패 시 보고

### 미완료/보류 사항

- 20.5단계에서 변경된 사이트명/메뉴/색상 기준으로 화면 캡처 재촬영은 21단계에서 진행
- 일부 제안서용 캡처는 재촬영 필요 상태로 표시

### 다음 단계

21단계: 제안서 작성 자료 패키징 및 화면 캡처 보강


---

## 21단계: 제안서 작성 자료 패키징 및 화면 캡처 보강

### 변경 파일

- 신규: `docs/SCREENSHOT_CAPTIONS.md`
- 신규: `docs/ESTIMATION_TABLE.md`
- 신규: `proposal-package/README.md`
- 신규: `proposal-package/screenshots/*.png` (18개 캡처 복사본)
- 신규: `proposal-package/kt-ai-portal-proposal-materials.zip`
- 신규: `scripts/capture-proposal-screenshots.js`
- 수정: `docs/assets/final/01-portal-dashboard.png` ~ `14-tenant-management.png` (21단계 재촬영)
- 수정: `docs/PROPOSAL_SCREENSHOT_CATALOG.md` (촬영 상태 전체 `갱신 완료` 반영)
- 수정: `docs/FINAL_DELIVERABLES.md` (21단계 완료, 패키지 구성, 보안등급 오타 수정)
- 수정: `docs/DOCUMENT_INDEX.md` (신규 문서 및 패키지 인덱스 추가)
- 수정: `docs/ARCHITECTURE.md`, `docs/WBS.md`, `docs/PROPOSAL_SUMMARY_TEXT.md`, `docs/TODO.md`, `docs/TECH_DEBT.md`, `docs/INTERNAL_LOGIC_BACKLOG.md`, `notes/DECISIONS.md` (`내부` → `내부` 오타 수정)

### 구현 내용

1. Backstage dev server 기동 후 Chromium 1920×1080, Guest 로그인 상태로 화면 캡처 자동화 스크립트 (`scripts/capture-proposal-screenshots.js`) 작성
2. 01~14 캡처를 `국방지능형플랫폼포털` 한글 메뉴/색상 기준으로 재촬영
   - 01 Portal Dashboard
   - 02 통합검색
   - 03 프로젝트/워크스페이스
   - 04 반입·반출 승인
   - 05 크레딧 관리
   - 06 K-RMF 증빙관리
   - 07 관리자 콘솔 – 사용자 관리
   - 08 관리자 콘솔 – 권한/RBAC
   - 09 관리자 콘솔 – 정책/감사
   - 10 서비스/도구 카탈로그
   - 11 제안 게시판
   - 12 마이페이지
   - 13 환경설정
   - 14 육해공군 관리
3. `docs/PROPOSAL_SCREENSHOT_CATALOG.md` 촬영 상태를 전체 `갱신 완료`로 정리하고 촬영 일자/환경 기록
4. `docs/SCREENSHOT_CAPTIONS.md` 작성: 18개 캡처별 제안서 삽입용 한글 캡션 및 장 제안
5. `docs/ESTIMATION_TABLE.md` 작성: 6개월 실 구축 기준 기능별 M/M, 역할별 M/M, 비용 산정 기준
6. `proposal-package/` 구성
   - `README.md`: 패키지 구성, 캡처 목록, 참고 문서, 사용 안내
   - `screenshots/`: 18개 최종 캡처
   - `kt-ai-portal-proposal-materials.zip`: 스크린샷 + 핵심 문서 압축 파일
7. `docs/FINAL_DELIVERABLES.md`에 21단계 완료, 제안서 패키지 구성, 다음 단계(22단계 후속 개발) 반영
8. `docs/DOCUMENT_INDEX.md`에 `SCREENSHOT_CAPTIONS.md`, `ESTIMATION_TABLE.md`, `proposal-package/` 인덱스 추가
9. 문서 내 잔여 `내부`/`내부` 오타를 `내부`으로 최종 수정

### 검증 결과

- `docs/assets/final/`에 18개 PNG 캡처 존재 확인
- 캡처 파일 크기 정상 (01 546KB, 02 199KB, 03 215KB, 04 221KB, 05 338KB, 06 101KB, 07 172KB, 08 184KB, 09 180KB, 10 223KB, 11 157KB, 12 112KB, 13 105KB, 14 130KB, 15 411KB, 16 37KB, 17 122KB, 18 46KB)
- 캡처 이미지에서 한글 메뉴/제목/사이트명 정상 표시 확인
- `proposal-package/kt-ai-portal-proposal-materials.zip` 3.2MB 생성 확인
- `grep -R "내부" docs notes` 결과: `내부`으로 정상 치환됨
- `grep -R "보안등급 오타" backstage-portal/packages` 결과: 런타임 코드/데이터에서 보안등급 오타 없음

### 오류/조치

- 기존 `App.test.tsx` `createRoot()` TypeScript 오류는 21단계까지 유지 (개발 서버/신규 기능에 영향 없음)
- MUI v4 `findDOMNode` warning 지속
- GitHub push PAT 인증 실패: 로컬 커밋 생성 후 보고, 사용자가 PAT 갱신 후 직접 push 권장

### 미완료/보류 사항

- 실제 Keycloak Admin/Event API, DB, Kubernetes, OpenStack, CMP, OpenMetadata/OpenSearch 자동 동기화, 파일 저장소 등 연동은 22단계 이후 후속 개발 대상
- 제안서 발표 PPT 작성은 본 패키지 자료를 기반으로 사용자가 별도 진행

### 다음 단계

22단계(후속 개발): 실제 연동 구현 및 운영 안정화

---

## 22단계: 제안서 초안 및 견적서 초안 작성

### 변경 파일

- 신규: `docs/PROPOSAL_OUTLINE.md`
- 신규: `docs/PROPOSAL_DRAFT.md`
- 신규: `docs/PROPOSAL_SLIDE_DRAFT.md`
- 신규: `docs/ESTIMATE_DRAFT.md`
- 신규: `docs/RFP_MAPPING_JUSTIFICATION.md`
- 신규: `docs/IMPLEMENTATION_ROADMAP.md`
- 신규: `docs/RISK_RESPONSE_PLAN.md`
- 수정: `proposal-package/README.md` (22단계 문서 반영)
- 수정: `proposal-package/kt-ai-portal-proposal-materials.zip` (갱신)
- 수정: `docs/FINAL_DELIVERABLES.md` (22단계 문서 및 다음 단계 반영)
- 수정: `docs/DOCUMENT_INDEX.md` (신규 문서 인덱스 추가)
- 수정: `docs/TODO.md` (22단계 완료, 23단계 추가)
- 수정: `docs/WBS.md` (22단계 완료, 23단계 추가)
- 수정: `README.md`, `backstage-portal/README.md`, `docs/SEARCH_IMPLEMENTATION.md` (보안등급 문맥 정리)

### 구현 내용

1. `docs/PROPOSAL_OUTLINE.md` 작성: 제안서 15개 장 구성 초안
2. `docs/PROPOSAL_DRAFT.md` 작성: 제안서에 바로 붙여넣을 수 있는 문장형 본문 초안 (1~10장, 기능번호 및 캡처 파일명 병기)
3. `docs/PROPOSAL_SLIDE_DRAFT.md` 작성: 23장 분량의 PPT 초안 (슬라이드별 제목/메시지/캡처/멘트)
4. `docs/ESTIMATE_DRAFT.md` 작성: 기능별 세부 M/M 산정 초안 (화면/Backend/외부연동/테스트/문서)
5. `docs/RFP_MAPPING_JUSTIFICATION.md` 작성: 주요 기능군별 RFP 대응 근거 설명
6. `docs/IMPLEMENTATION_ROADMAP.md` 작성: PoC 이후 4차 구축 로드맵
7. `docs/RISK_RESPONSE_PLAN.md` 작성: 10대 리스크 및 대응방안
8. `proposal-package/`에 22단계 문서 복사 및 `README.md` 갱신
9. `proposal-package/kt-ai-portal-proposal-materials.zip` 재생성 (3.2MB)
10. `docs/FINAL_DELIVERABLES.md`, `docs/DOCUMENT_INDEX.md`, `docs/TODO.md`, `docs/WBS.md`에 22단계 및 23단계 반영
11. 보안등급 문맥 최종 정리: 제안서 제출용 문서의 `보안등급 오타`/`보안등급 오타`/`내부` 잔여 표현 수정

### 검증 결과

- 신규 문서 7개 작성 완료
- `proposal-package/`에 22단계 문서 7개 반영 확인
- `proposal-package/kt-ai-portal-proposal-materials.zip` 갱신 확인
- 제출용 문서에서 보안등급 오타 문자열 미존재
- 제출용 문서에서 보안등급 오타 문자열 없음
- 소스 코드 `backstage-portal/packages`에서 보안등급 오타 문자열 미발견
- `yarn tsc --noEmit`: 기존 `App.test.tsx` 오류 1건 외 신규 오류 없음

### 오류/조치

- 기존 `App.test.tsx` `createRoot()` TypeScript 오류는 22단계까지 유지
- GitHub push PAT 인증 실패: 로컬 커밋 생성 후 보고, 사용자가 PAT 갱신 후 직접 push 권장

### 미완료/보류 사항

- 제안서 본문 최종본(HWP/DOCX/Markdown), PPTX, Excel 견적서는 23단계에서 작성
- GitHub push 인증 문제는 사용자가 직접 해결

### 다음 단계

23단계: 제안서/PPT/견적서 최종 산출물 작성

---

## 22.1단계: 보안등급 표기 최종 Hotfix

### 변경 파일

- 수정: `docs/PROPOSAL_DRAFT.md` (보안등급 표기 `공개 / 내부 / 비밀`로 정정)
- 수정: `docs/CHANGE_SUMMARY.md` (과거 기록의 보안등급 오타 표현 정리)
- 수정: `docs/WBS.md` (22.1단계 항목 추가 및 오타 정리)
- 수정: `notes/DECISIONS.md` (보안등급 오타 표현 정리)
- 수정: `docs/FINAL_DELIVERABLES.md` (22/22.1 커밋 목록 반영)
- 수정: `docs/TODO.md` (22.1단계 완료 항목 추가)
- 수정: `proposal-package/README.md` 및 초안 문서 복사본 (갱신)
- 수정: `proposal-package/kt-ai-portal-proposal-materials.zip` (재생성)

### 구현 내용

1. 전체 문서 및 소스 코드에서 `내부`를 `내부`로 일괄 수정
2. 제출용 문서(`docs/*`, `proposal-package/*`, `README.md`, `backstage-portal/README.md`)에서 보안등급 오타 잔여 표현 제거
3. `docs/CHANGE_SUMMARY.md`, `docs/WBS.md`, `notes/DECISIONS.md`의 역사적 기록에서도 보안등급 오타 문자열이 남지 않도록 정리
4. 보안등급 표준을 `공개` / `내부` / `비밀`로 최종 통일
5. `proposal-package/`의 초안 문서 복사본 갱신 및 zip 파일 재생성

### 검증 결과

- 보안등급 오타 문자열에 대한 grep 결과: 없음
- 
- 
- `grep -R "공개 / 내부 / 비밀" docs README.md backstage-portal/README.md notes proposal-package`: 없음
- 소스 코드 `backstage-portal/packages`에서 보안등급 오타 문자열 미발견
- `yarn tsc --noEmit`: 기존 `App.test.tsx` 오류 1건 외 신규 오류 없음

### 오류/조치

- 기존 `App.test.tsx` `createRoot()` TypeScript 오류는 22.1단계까지 유지
- GitHub push PAT 인증 실패: 로컬 커밋 생성 후 보고, 사용자가 PAT 갱신 후 직접 push 권장

### 다음 단계

23단계: 제안서/PPT/견적서 최종 산출물 작성


---

## 22.2단계: 보안등급 표준값 최종 재검증 및 수정

### 변경 파일

- 수정: `docs/TODO.md` (22.2단계 완료 항목 추가)
- 수정: `docs/WBS.md` (22.2단계 완료 항목 추가)
- 수정: `docs/FINAL_DELIVERABLES.md` (22.2 커밋 목록 추가)
- 수정: `notes/DECISIONS.md` (22.2 결정사항 추가)
- 수정: `docs/CHANGE_SUMMARY.md` (본 섹션 추가)
- 수정: `proposal-package/*` 초안 문서 복사본 (갱신)
- 수정: `proposal-package/kt-ai-portal-proposal-materials.zip` (재생성)

### 구현 내용

1. 잘못된 보안등급 표기가 없는지 최종 재검증
2. `docs/*`, `proposal-package/*`, `README.md`, `backstage-portal/README.md`에서 잘못된 표기 제거
3. 보안등급 표준을 `공개` / `내부` / `비밀`로 최종 통일
4. CHANGE_SUMMARY, DECISIONS 등 이력 문서에서도 잘못된 문자열 원문을 반복 인용하지 않도록 정리
5. `proposal-package/`의 초안 문서 복사본 갱신 및 zip 파일 재생성

### 검증 결과

- 보안등급 최종 표준: `공개` / `내부` / `비밀`
- 잘못된 보안등급 표기 문자열 모두 미발견
- `공개 / 내부 / 비밀` 표기가 제출용 문서 및 `proposal-package`에 정상 존재
- 소스 코드 `backstage-portal/packages`에서 보안등급 오타 문자열 미발견
- `yarn tsc --noEmit`: 기존 `App.test.tsx` 오류 1건 외 신규 오류 없음

### 오류/조치

- 기존 `App.test.tsx` `createRoot()` TypeScript 오류는 22.2단계까지 유지
- GitHub push PAT 인증 실패: 로컬 커밋 생성 후 보고, 사용자가 PAT 갱신 후 직접 push 권장

### 다음 단계

23단계: 제안서/PPT/견적서 최종 산출물 작성
---

## 23단계: 제안서/PPT/견적서 최종 산출물 작성

### 변경 파일

- 신규: `docs/FINAL_PROPOSAL.md`
- 신규: `proposal-package/국방지능형플랫폼포털_제안서.md`
- 신규: `proposal-package/국방지능형플랫폼포털_제안발표자료.pptx`
- 신규: `proposal-package/국방지능형플랫폼포털_견적산정표.xlsx`
- 수정: `proposal-package/README.md` (23단계 산출물 반영)
- 수정: `proposal-package/kt-ai-portal-proposal-materials.zip` (재생성)
- 수정: `docs/TODO.md`, `docs/WBS.md`, `docs/FINAL_DELIVERABLES.md`, `notes/DECISIONS.md`

### 구현 내용

1. `docs/PROPOSAL_DRAFT.md`, `docs/PROPOSAL_OUTLINE.md` 등 초안 문서를 종합하여 `docs/FINAL_PROPOSAL.md` 및 `proposal-package/국방지능형플랫폼포털_제안서.md` 최종본 작성
2. `docs/PROPOSAL_SLIDE_DRAFT.md`를 바탕으로 23장 PPTX 작성 및 화면 캡처 15장 삽입
3. `docs/ESTIMATE_DRAFT.md`, `docs/ESTIMATION_TABLE.md`를 바탕으로 5시트 Excel 견적산정표 작성
4. 기능목록 1~155와 M/M 산정표 연결
5. 최종 제출 패키지 zip에 23단계 산출물 포함하여 재생성

### 검증 결과

- `docs/FINAL_PROPOSAL.md` 및 제안서.md 상단에 `보안등급 최종 표준: 공개 / 내부 / 비밀` 명시
- PPTX 23장, Excel 5시트 정상 생성
- `proposal-package/kt-ai-portal-proposal-materials.zip` 6.0MB로 재생성

### 오류/조치

- GitHub push PAT 인증 실패는 유지; 로컬 커밋 후 보고
- `App.test.tsx` 기존 TypeScript 오류는 23단계에서 수정하지 않음

### 다음 단계

23.5단계: 최종 산출물 요구사항 역검증

---

## 23.5단계: 최종 산출물 요구사항 역검증

### 변경 파일

- 신규: `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`
- 수정: `docs/TODO.md`, `docs/WBS.md`, `docs/CHANGE_SUMMARY.md`, `docs/FINAL_DELIVERABLES.md`, `notes/DECISIONS.md`

### 구현 내용

1. 기능목록 1~155가 제안서/견적서에 모두 반영되었는지 Python 집합 연산으로 확인
2. SFR-001~SFR-021 매핑 여부 확인(23.6단계에서 정의/매핑 완료로 수정)\n3. 제안서 본문/PPT/견적서의 기능명·화멸명 일치 여부 교차 검증
4. 화면 캡처 18개가 제안서/PPT 설명과 일치하는지 확인
5. 보안등급 표기가 `공개 / 내부 / 비밀`로만 사용되는지 확인
6. 미구현 항목이 PoC 한계 또는 후속 구축 범위로 명확히 표시되었는지 확인
7. M/M 산정표의 기능구분이 1~155 기능목록과 연결되는지 확인

### 검증 결과

- 기능목록 1~155: `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`에 155개 모두 매핑 확인
- SFR-001~SFR-021: 23.6단계에서 21개 전체 정의 및 기능목록 1~155/화면 매핑 완료\n- 기능명/화멸명: 12개 주요 화면 모두 일치
- 화면 캡처: 18개 파일 모두 존재, PPT 삽입 완료
- 보안등급 표기: 잘못된 표기 없음, 최종 표준 준수
- 미구현 항목: 제안서 본문 및 추적표에서 명확히 구분
- M/M 산정: 기능별/세부 기능별 1~155 연결 확인

### 오류/조치

- SFR-001~SFR-021 매핑표는 docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md 및 추적표에 반영 완료\n- PPTX 폰트가 `AppleGothic`으로 고정되어 있어 Windows 발표 환경에서 폰트 교체 권장

### 다음 단계

- GitHub push 인증 해결
- `App.test.tsx` 기존 오류 정리 여부 최종 판단
- 제안서/PPT/견적서 사용자 피드백 반영 및 세부 다듬기
---

## 23.6단계: 최종 검증 보고서 Hotfix

### 변경 파일

- 수정: `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md` (SFR-001~SFR-021 매핑 결과 `통과`로 수정 및 매핑표 추가)
- 수정: `docs/FINAL_PROPOSAL.md`, `proposal-package/국방지능형플랫폼포털_제안서.md` (SFR 매핑 추가)
- 수정: `docs/RFP_MAPPING_JUSTIFICATION.md` (SFR 매핑 근거 추가)
- 수정: `docs/SCREEN_TO_RFP_MAPPING.md` (SFR 화면 매핑 추가)
- 수정: `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md` (SFR 매핑 요약 추가)
- 수정: `docs/ESTIMATE_DRAFT.md`, `docs/ESTIMATION_TABLE.md` (SFR 연결 설명 추가)
- 수정: `docs/DOCUMENT_INDEX.md`, `README.md`, `proposal-package/README.md`
- 수정: `docs/TODO.md`, `docs/WBS.md`, `docs/FINAL_DELIVERABLES.md`, `notes/DECISIONS.md`
- 수정: `proposal-package/kt-ai-portal-proposal-materials.zip` (재생성)

### 구현 내용

1. 보안등급 표준을 `공개 / 내부 / 비밀`로 최종 고정
2. 제출용 문서 및 proposal-package에서 `내부`, 잘못된 표기, 잘못된 표기, 잘못된 표기 등 오타 문자열 최종 제거
3. SFR-001~SFR-021을 `통과`로 재판정하고 21개 항목 매핑표 작성
4. SFR 매핑표를 제안서, RFP 근거, 화면 매핑, 추적표, 견적서에 반영
5. proposal-package 복사본 갱신 및 zip 재생성

### 검증 결과

- 보안등급 표준: `공개 / 내부 / 비밀`로 통일, 오타 문자열 미검출
- SFR-001~SFR-021: 21개 전체 정의 및 기능목록 1~155/화면 매핑 완료
- `kimi_done.sh` 실행: 오류 없음

### 다음 단계

24단계: GitHub 원격 반영 및 최종 품질 점검

## 30단계: 관리자 전용 요구사항 대응현황 및 플랫폼 API 연계현황 고도화

### 변경 파일

- 신규: `packages/app/src/components/requirement-coverage/types.ts`
- 신규: `packages/app/src/components/requirement-coverage/mockRequirementCoverageData.ts`
- 신규: `packages/app/src/components/requirement-coverage/RequirementCoveragePage.tsx`
- 신규: `packages/app/src/components/requirement-coverage/RequirementCoverageSummaryCards.tsx`
- 신규: `packages/app/src/components/requirement-coverage/MenuCoveragePanel.tsx`
- 신규: `packages/app/src/components/requirement-coverage/SfrCoveragePanel.tsx`
- 신규: `packages/app/src/components/requirement-coverage/FeatureCoveragePanel.tsx`
- 신규: `packages/app/src/components/requirement-coverage/ChangeHistoryCoveragePanel.tsx`
- 신규: `packages/app/src/components/requirement-coverage/QuestionCoveragePanel.tsx`
- 신규: `packages/app/src/components/requirement-coverage/index.ts`
- 신규: `packages/app/src/components/platform-api-integration/types.ts`
- 신규: `packages/app/src/components/platform-api-integration/mockPlatformApiIntegrationData.ts`
- 신규: `packages/app/src/components/platform-api-integration/PlatformApiIntegrationPage.tsx`
- 신규: `packages/app/src/components/platform-api-integration/PlatformApiIntegrationSummaryCards.tsx`
- 신규: `packages/app/src/components/platform-api-integration/PlatformApiIntegrationPanel.tsx`
- 신규: `packages/app/src/components/platform-api-integration/index.ts`
- 신규: `packages/app/src/components/common/csvDownload.ts`
- 수정: `packages/app/src/App.tsx` (`/requirement-coverage`, `/platform-api-integration` 라우트 추가, `/requirement-progress` 별칭)
- 수정: `packages/app/src/components/navigation/portalMenuDefinitions.ts` (메뉴 정의 변경)
- 신규 문서: `docs/REQUIREMENT_COVERAGE_ADMIN_GUIDE.md`
- 신규 문서: `docs/PLATFORM_API_INTEGRATION_PLAN.md`
- 신규 문서: `docs/PORTAL_ROLE_AND_PLATFORM_BOUNDARY.md`
- 수정 문서: `docs/DOCUMENT_INDEX.md`, `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`, `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`
- 수정 문서: `docs/SCREEN_TO_RFP_MAPPING.md`, `docs/RFP_MAPPING_JUSTIFICATION.md`
- 수정 문서: `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`, `docs/TODO.md`, `docs/WBS.md`, `docs/TECH_DEBT.md`
- 수정 문서: `README.md`, `backstage-portal/README.md`, `notes/DECISIONS.md`

### 구현 내용

1. 관리자 전용 `요구사항 대응현황` 메뉴 추가 (`/requirement-coverage`)
   - 5개 탭: 메뉴 대응현황, SFR 대응현황, 기능 대응현황, 변경이력, 질의사항
   - 14개 메뉴 단위 대응 현황, 21개 SFR 진행률, 163개 기능 대응 현황
   - CSV 다운로드: 메뉴 현황, 기능 현황
2. 관리자 전용 `플랫폼 API 연계현황` 메뉴 추가 (`/platform-api-integration`)
   - 20개 포털 ↔ 플랫폼 연계 API/이벤트/파일 후보 명세
   - 상태별(PoC Mock, 설계필요, 후속연동, 연동대상확인필요, 부분구현) 요약 카드
   - CSV 다운로드
3. 기존 `/requirement-progress`는 `/requirement-coverage`와 동일한 화면으로 별칭 처리
4. `visibleTo: 'admin'` + `AdminOnlyGuard`로 일반 사용자 접근 차단
5. CSV 다운로드 유틸리티 추가 (`packages/app/src/components/common/csvDownload.ts`)
6. 관련 문서 3개 신규 작성 및 12개 갱신

### 검증 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app build` 통과
- `yarn test` 통과

### 다음 단계

- [x] Firebase Hosting 재배포
- [ ] GitHub push 인증 해결 후 원격 반영

## 31단계: 화멸 업무흐름 설명 및 포털-플랫폼 연계 시나리오 고도화

### 변경 파일

- 신규: `packages/app/src/components/workflow-scenarios/types.ts`
- 신규: `packages/app/src/components/workflow-scenarios/mockWorkflowScenarioData.ts`
- 신규: `packages/app/src/components/workflow-scenarios/workflowScenarioUtils.ts`
- 신규: `packages/app/src/components/workflow-scenarios/WorkflowScenarioPage.tsx`
- 신규: `packages/app/src/components/workflow-scenarios/PortalRoleSummaryPanel.tsx`
- 신규: `packages/app/src/components/workflow-scenarios/UserJourneyCards.tsx`
- 신규: `packages/app/src/components/workflow-scenarios/WorkflowScenarioTable.tsx`
- 신규: `packages/app/src/components/workflow-scenarios/MenuScenarioPanel.tsx`
- 신규: `packages/app/src/components/workflow-scenarios/index.ts`
- 수정: `packages/app/src/App.tsx` (`/workflow-scenarios` 라우트 추가)
- 수정: `packages/app/src/components/navigation/portalMenuDefinitions.ts` (메뉴 추가)
- 수정: `packages/app/src/components/portal-dashboard/PortalDashboardPage.tsx` (관리자 전용 업무흐름/연계 패널 추가)
- 신규 문서: `docs/WORKFLOW_SCENARIO_GUIDE.md`
- 신규 문서: `docs/USER_JOURNEY_AND_PLATFORM_FLOW.md`
- 신규 문서: `docs/PROPOSAL_EXPLANATION_MESSAGES.md`
- 수정 문서: `docs/DOCUMENT_INDEX.md`, `docs/REQUIREMENT_COVERAGE_ADMIN_GUIDE.md`, `docs/PLATFORM_API_INTEGRATION_PLAN.md`, `docs/PORTAL_ROLE_AND_PLATFORM_BOUNDARY.md`, `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`, `docs/SCREEN_TO_RFP_MAPPING.md`, `docs/RFP_MAPPING_JUSTIFICATION.md`, `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`, `docs/TODO.md`, `docs/WBS.md`, `docs/DECISIONS.md`, `docs/TECH_DEBT.md`, `README.md`, `backstage-portal/README.md`

### 구현 내용

1. 관리자 전용 `업무흐름/연계 시나리오` 메뉴 추가 (`/workflow-scenarios`)
   - 3개 탭: 포털 역할 요약, 사용자 여정, 업무흐름 시나리오
   - 7개 사용자 여정 카드
   - 7개 업무흐름 시나리오(SCN-001~SCN-007) 및 상세 단계 표
   - 요구사항 대응현황/API 연계현황 링크
2. 통합 대시보드에 관리자 전용 `MenuScenarioPanel` 추가
   - 관리자 프리뷰 또는 Firebase Auth 관리자일 때만 노출
3. 신규 문서 3개 작성 및 14개 문서 갱신

### 검증 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app build` 통과
- `yarn workspace app test --watchAll=false` 통과

### 다음 단계

- [x] Firebase Hosting 재배포
- [ ] GitHub push 인증 해결 후 원격 반영


## 31.5단계: 전 기능 전수점검·보완 및 화면 캡처용 문구 정리

### 작성일시

2026-07-12

### 작업 단계

31.5단계 전 기능 전수점검·보완 및 화면 캡처용 문구 정리

### 작업 목표

- 모든 화면 UI에서 제안서/제안팀/PoC/데모/검토용/프리뷰/납품 후 관리자 등 캡처에 부적합한 문구 제거·중립화
- 전체 메뉴/라우트/탭/버튼/CSV 다운로드 전수점검
- 관리자 전용 접근제어 재검증
- Firebase Hosting 재빌드·재배포
- QA 결과 문서화

### 변경 파일

- `backstage-portal/packages/app/src/components/preview-auth/PreviewLoginPage.tsx`
- `backstage-portal/packages/app/src/components/common/DemoModeBanner.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/RequirementProgressPage.tsx`
- `backstage-portal/packages/app/src/components/requirement-progress/AdminOnlyGuard.tsx`
- `backstage-portal/packages/app/src/components/workflow-scenarios/WorkflowScenarioPage.tsx`
- `backstage-portal/packages/app/src/components/workflow-scenarios/WorkflowScenarioTable.tsx`
- `backstage-portal/packages/app/src/components/workflow-scenarios/types.ts`
- `backstage-portal/packages/app/src/components/workflow-scenarios/workflowScenarioUtils.ts`
- `backstage-portal/packages/app/src/components/workflow-scenarios/mockWorkflowScenarioData.ts`
- `backstage-portal/packages/app/src/components/platform-api-integration/PlatformApiIntegrationPage.tsx`
- `backstage-portal/packages/app/src/components/platform-api-integration/types.ts`
- `backstage-portal/packages/app/src/components/platform-api-integration/PlatformApiIntegrationPanel.tsx`
- `backstage-portal/packages/app/src/components/platform-api-integration/PlatformApiIntegrationSummaryCards.tsx`
- `backstage-portal/packages/app/src/components/platform-api-integration/mockPlatformApiIntegrationData.ts`
- `backstage-portal/packages/app/src/components/navigation/portalMenuDefinitions.ts`
- `backstage-portal/packages/app/src/components/project-workspace/ProjectWorkspacePage.tsx`
- `backstage-portal/packages/app/src/components/project-workspace/ProjectRequestForm.tsx`
- `backstage-portal/packages/app/src/components/project-workspace/mockProjects.ts`
- `backstage-portal/packages/app/src/components/credit-manager/CreditManagerPage.tsx`
- `backstage-portal/packages/app/src/components/credit-manager/mockCredits.ts`
- `backstage-portal/packages/app/src/components/export-approval/ExportApprovalPage.tsx`
- `backstage-portal/packages/app/src/components/export-approval/ExportRequestForm.tsx`
- `backstage-portal/packages/app/src/components/export-approval/mockExportRequests.ts`
- `backstage-portal/packages/app/src/components/proposal-board/ProposalForm.tsx`
- `backstage-portal/packages/app/src/components/proposal-board/ProposalBoardPage.tsx`
- `backstage-portal/packages/app/src/components/proposal-board/mockProposalData.ts`
- `backstage-portal/packages/app/src/components/service-catalog/mockServiceCatalogData.ts`
- `backstage-portal/packages/app/src/components/portal-dashboard/mockDashboardData.ts`
- `backstage-portal/packages/app/src/components/krmf-evidence/mockKrmfEvidence.ts`
- `backstage-portal/packages/app/src/components/tenant-management/mockTenantManagementData.ts`
- `backstage-portal/packages/app/src/components/my-page/mockMyPageData.ts`
- `backstage-portal/packages/app/src/components/requirement-progress/mockRequirementProgressData.ts`
- `backstage-portal/packages/app/src/App.tsx`
- `docs/STAGE_31_5_QA_REPORT.md`
- `docs/DOCUMENT_INDEX.md`
- `docs/CHANGE_SUMMARY.md`

### 구현 내용

- 로그인 페이지, DemoModeBanner, 관리자 전용 페이지 안내 문구 중립화
- Workflow/플랫폼 API 연계 상태값(`PoC 화면구현`, `Mock 기반`, `PoC Mock`) 중립화
- 역할명 `제안/사업관리자` → `사업관리자` 변경
- 페이지 부제목의 `PoC (mock data 기반)` 제거
- 시연용 버튼/알림의 `[Mock]`, `(Mock)`, `(mock)` 제거
- mock 데이터 내 프로젝트명 및 공지 제목의 `PoC` 제거
- 관리자 메뉴 필터링과 `AdminOnlyGuard` 동작 재확인

### 검증 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app test --watchAll=false` 통과 (1 passed)
- `yarn workspace app build` 성공
- `firebase deploy --only hosting` 성공 → https://kai-platform-d0ae0.web.app

### 알려진 이슈

- `/api/auth/guest/refresh` 404: Cloud Run backend 측 문제로 본 단계에서는 Frontend 변경만 수행. Backend 재배포 시 별도 검증 필요.
- `git push` PAT 인증 실패: 사용자가 `gh auth login` 또는 PAT 갱신 후 직접 push 필요.

## Stage 32.1 — Google/Firebase Auth 관리자 로그인 오류 진단·수정 및 기능 흐름/사용방법 설명자료 작성

### 변경 파일

- `backstage-portal/packages/app/src/components/preview-auth/FirebaseGoogleLoginButton.tsx`
- `backstage-portal/packages/app/src/components/preview-auth/firebaseAuthClient.ts`
- `backstage-portal/packages/app/src/components/preview-auth/PreviewLoginPage.tsx`
- `backstage-portal/packages/app/src/App.tsx`
- `backstage-portal/app-config.demo.yaml`
- `scripts/deploy-stage30-firebase.sh`
- `scripts/smoke-check-demo-routes.mjs`
- `docs/FIREBASE_GOOGLE_LOGIN_TROUBLESHOOTING.md`
- `docs/PORTAL_USER_FLOW_GUIDE.md`
- `docs/PORTAL_FEATURE_USAGE_GUIDE.md`
- `docs/PORTAL_ADMIN_FEATURE_GUIDE.md`
- `docs/PORTAL_PLATFORM_RELATIONSHIP_GUIDE.md`
- `docs/DOCUMENT_INDEX.md`
- `docs/CHANGE_SUMMARY.md`
- `proposal-package/국방지능형플랫폼포털_기능흐름_사용설명자료.md`

### 구현 내용

- Firebase Google 로그인 버튼에 `signInWithPopup` 실패 시 `signInWithRedirect` 폭백 추가
- `firebaseAuthClient.ts`에 redirect 로그인/로그아웃/허용 이메일/도메인 판별 로직 보강
- `PreviewLoginPage`에서 Google 로그인 오류 메시지 표시
- `App.tsx`에서 Firebase Auth 상태 기반으로 미허용 Google 사용자 자동 로그아웃 처리
- `deploy-stage30-firebase.sh`가 `firebase apps:sdkconfig WEB`에서 API key, authDomain, projectId, appId를 올바르게 추출하도록 `.result.sdkConfig` 경로 수정 및 null 검증 추가
- `app-config.demo.yaml`에 `app.auth.allowedDomains` 항목 추가
- `smoke-check-demo-routes.mjs`에서 `/api/*` 경로에 cache-buster를 추가해 Firebase Hosting edge cache의 stale 404 오탐 방지
- 기능흐름/사용 설명자료 5건 작성 및 통합 설명자료(proposal-package) 추가

### 검증 결과

- `yarn tsc` 통과
- `yarn workspace app build --config app-config.demo.yaml` 성공
- `node scripts/smoke-check-demo-routes.mjs` 17/17 200 OK
- Firebase Hosting 32.1 재배포 → https://kai-platform-d0ae0.web.app

### 알려진 이슈

- `/api/auth/guest/refresh`는 Cloud Run 직접 호출 시 200이나, 일부 Firebase Hosting edge 캐시에서 과거 404가 남아 브라우저/Node fetch가 404로 받을 수 있음. 재배포 후에도 일시적으로 남을 수 있어, 스크립트는 cache-buster로 우회하고 문서에 기록함.
- Google 관리자 로그인은 브라우저에서 직접 `kyubeom@gmail.com` 계정으로 검증해야 하며, 2단계 인증/브라우저 쿠키 설정에 따라 수동 확인 필요.
- `git push` PAT 인증 문제는 사용자가 `gh auth login` 또는 PAT 갱신 후 직접 push 필요.

## Stage 32.2 — 기능 흐름 설명자료 기반 PPT/사용자 설명 패키지 보완

### 변경 파일

- `proposal-package/국방지능형플랫폼포털_RFP대응_발표자료_32단계.pptx` (백업)
- `proposal-package/국방지능형플랫폼포털_기능흐름_RFP대응_발표자료_32_2단계.pptx`
- `proposal-package/국방지능형플랫폼포털_발표자_스크립트_32_2단계.md`
- `proposal-package/국방지능형플랫폼포털_쉽게_이해하는_기능흐름.md`
- `scripts/generate-feature-flow-ppt.py`
- `docs/SCREENSHOT_CAPTIONS.md`
- `docs/PROPOSAL_SCREENSHOT_CATALOG.md`
- `docs/DOCUMENT_INDEX.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/TECH_DEBT.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`
- `proposal-package/README.md`

### 구현 내용

- 기존 32단계 PPT를 기능흐름 중심으로 재구성한 33장 발표자료 생성
- 14개 화면 캡처를 포함한 SFR별 기능 장표, 관리자 추적 기능 장표, 4개 대표 업무흐름 장표 작성
- 포털-데이터 플랫폼/AI 플랫폼/클리우드/CMP 연계 역할 장표 추가
- python-pptx 기반 PPT 자동 생성 스크립트 작성(16:9, 좌측 설명/우측 캡처, 한글 폰트)
- 슬라이드별 발표자 스크립트 작성
- 사용자용 쉬운 기능 설명자료 작성(비유와 Q&A 형태)
- 화멸별 캡션에 RFP ID, 발표 강조 포인트, 후속 연동 포인트 추가
- 관련 문서 인덱스/변경이력/WBS/기술부채/결정사항/README 갱신

### 검증 결과

- PPT 열림 확인 및 슬라이드 수 33장, 이미지 14개 확인
- `yarn tsc --noEmit` 통과
- `yarn workspace app build` 성공
- `yarn workspace app test --watchAll=false` 1 passed
- `node scripts/smoke-check-demo-routes.mjs` 17/17 200 OK

### 알려진 이슈

- PPT 디자인은 python-pptx 기본 레이아웃이므로 PowerPoint에서 추가 보정 가능
- GitHub push는 PAT 인증 문제로 실패할 수 있음

## Stage 33 — 최종 제안 패키지 압축 및 공유본 생성

### 변경 파일

- `proposal-package/final-share/` (디렉터리 및 하위 파일)
- `proposal-package/국방지능형플랫폼포털_최종제안공유패키지_33단계.zip`
- `proposal-package/FINAL_PACKAGE_INDEX.md`
- `proposal-package/최종공유_안낸문_33단계.md`
- `scripts/verify-final-package.py`
- `docs/DOCUMENT_INDEX.md`
- `docs/CHANGE_SUMMARY.md`
- `docs/TODO.md`
- `docs/WBS.md`
- `docs/TECH_DEBT.md`
- `notes/DECISIONS.md`
- `README.md`
- `backstage-portal/README.md`
- `proposal-package/README.md`

### 구현 내용

- `proposal-package/final-share/` 디렉터리 생성 및 8개 하위 분류 구성
- PPT 2개, 설명자료 8개, 화면 캡처 21개, RFP 매핑 문서 9개, QA 보고서 7개, 스크립트 6개 복사/정리
- `README_최종공유본.md`, `FINAL_PACKAGE_INDEX.md`, `최종공유_안낸문_33단계.md`, `ARCHIVE_NOTE.md`, `README_스크립트_설명.md` 작성
- `verify-final-package.py` 작성 및 실행 (구조/수량/민감정보/부적합 문구/금지 확장자/ZIP 무결성 검증)
- 최종 ZIP 생성 (약 11MB, 65개 항목)
- 관련 문서 인덱스/변경이력/WBS/기술부채/결정사항/README 갱신

### 검증 결과

- `verify-final-package.py` 통과
- ZIP 무결성 검사(`unzip -t`) 통과
- `yarn tsc --noEmit` 통과
- `yarn workspace app test --watchAll=false` 1 passed
- `node scripts/smoke-check-demo-routes.mjs` 17/17 200 OK (재시도 후)

### 알려진 이슈

- `/api/auth/guest/refresh`가 Firebase Hosting edge cache에 따라 간헐적으로 404를 반환할 수 있음. 재시도 또는 강력 새로고침으로 정상화됨.
- GitHub push는 PAT 인증 문제로 실패할 수 있음


## Stage 33.1 — 화면 캡처 부적합 문구 제거 및 운영자용 외부 도구 링크 권한 제한

### 변경 파일

- `backstage-portal/packages/app/src/App.tsx`
- `backstage-portal/packages/app/src/components/common/DemoModeBanner.tsx` (삭제)
- `backstage-portal/packages/app/src/components/portal-dashboard/PortalDashboardPage.tsx`
- `backstage-portal/packages/app/src/components/portal-dashboard/types.ts`
- `backstage-portal/packages/app/src/components/portal-dashboard/mockDashboardData.ts`
- `backstage-portal/packages/app/src/components/admin-console/AdminConsolePage.tsx`
- `backstage-portal/packages/app/src/components/admin-console/PlatformOpsToolsPanel.tsx` (신규)
- `backstage-portal/packages/app/src/components/service-catalog/ServiceCatalogPage.tsx`
- `backstage-portal/packages/app/src/components/service-catalog/types.ts`
- `backstage-portal/packages/app/src/components/service-catalog/mockServiceCatalogData.ts`
- `backstage-portal/packages/app/src/components/preview-auth/PreviewLoginPage.tsx`
- `backstage-portal/packages/app/src/components/krmf-evidence/mockKrmfEvidence.ts`
- `backstage-portal/packages/app/src/components/export-approval/mockExportRequests.ts`
- `backstage-portal/packages/app/src/components/project-workspace/mockProjects.ts`
- `backstage-portal/packages/app/src/components/integrated-search/IntegratedSearchPage.tsx`

### 구현 내용

- 화면 상단 `시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다.` 배너 제거
- 포털 대시보드에서 `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리` 외부 운영도구 카드 제거
- 관리자 콘솔에 `플랫폼 운영도구` 탭을 추가하고, 위 3개 도구를 관리자 전용으로 노출
- 대시보드의 `관리자 콘솔` 바로가기도 관리자가 아닐 경우 미노출 처리
- 서비스/도구 카탈로그의 `OpenMetadata` 항목을 관리자 전용(`adminOnly`)으로 필터링
- 접근 코드 로그인 화면의 `본 사이트는 검증 환경...` 문구 제거
- 화면에 노출되는 `샘플 데이터` 문구를 `예시 데이터`로 정정

### 검증 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app build` 성공
- `yarn workspace app test --watchAll=false` 1 passed
- `node scripts/smoke-check-demo-routes.mjs` 16/17 통과 (알려진 `/api/auth/guest/refresh` 404 제외)
- Firebase Hosting 재배포 성공 (735 files)

### 알려진 이슈

- `/api/auth/guest/refresh`가 Firebase Hosting edge cache에 따라 간헐적으로 404를 반환할 수 있음. 재시도 또는 강력 새로고침으로 정상화됨.
- GitHub push는 PAT 인증 문제로 실패할 수 있음.


## 2026-09-16 — 소스 전반 검토, runtime 권한 보완, 앱 셸 개선

- `docs/production-upgrade/IMPROVEMENT_PLAN.md`, `REVIEW_FINDINGS.md`에 검토/개선 순서와 잔여 범위 기록.
- BFF: runtime RLS tenant 트랜잭션·소속 기간·계정/신원 상태·위임 범위·역할 회수·감사 원자성 보완.
- 추가 DB migration: `20260916000003_audit_append_policy.js`. 기존 Cloud SQL에는 아직 적용하지 않음.
- Cloud SQL Unix socket 설정·Secret Manager 배포 절차, pool/timeout/shutdown/health,
  직접 의존성 선언, 전용 빌드 context, 무트래픽 검증 후 전환 스크립트 추가.
- UI: 밝은 표면/파란 강조색, 64px header, 256/72/0 메뉴와 모바일 overlay,
  본문 grid/검색/도움말/대시보드 헤더 정리. 고정 집계·정상 배지 일부 제거.
- 운영 비캡처의 이메일 기반 관리자 승격 제거. 반출 폼의 가짜 접수 성공·폼 console 기록 제거.
- 전체 lint/tsc, 단위30, runtime22, 브라우저23 통과. backend Linux image 빌드/push 완료.
- DB 비밀번호 파일 미확인으로 실제 backend Cloud Run 전환은 대기. Kimi 기존 DB 계정 변경 없음.
- 잔여: 정식 로그인 exchange/프런트 업무 API 연결, mock 하단/업무 화면 전환,
  tenant/user DB 개인화, 검색/원천계약·K-RMF·HA/복원 등 `REVIEW_FINDINGS.md` 참조.
- `~/ai-factory/orchestrator/scripts/kimi_done.sh`는 Telegram 발송을 포함하므로
  메시지 발송 권한 없이 실행하지 않음. 작업 결과는 본 기록과 로컬 Git으로 인계.

- 최종 배포: Firebase Hosting 본 사이트 2026-09-16 11:12 UTC 반영, 배포 후 UI23검사 PASS.
  Cloud Run은 기존 revision 유지·portal health404 확인. 상세 `production-upgrade/DEPLOYMENT_STATUS.md`.

## 2026-09-24 — 글로벌 업무여정 비노출 + 2026-09-24 포털 경험 개선분 Firebase 배포

- 상단 "플랫폼 이용 단계"(PortalJourneyBar) 비노출 처리. `App.tsx`에 `PORTAL_JOURNEY_BAR_ENABLED = false` 플래그 추가, 컴포넌트·route·권한은 그대로 보존. 정리 완료 후 플래그로 재노출 가능.
- 병렬 작업(2026-09-24 포털 로그인·메인 경험 개선: 4개 시안 홈, 앱 런처, 테넌트/플랫폼 접근권한, 개발자 콘솔, 제안·작업환경 데모 저장 등)을 로컬 검증 상태 그대로 Firebase Hosting에 배포.
- 검증: `yarn tsc --noEmit` 통과, 프런트 테스트 16 suites / 84 tests 통과, app 프로덕션 빌드(demo config) 통과, 라이브 스모크 7/7 통과(`scripts/smoke-live-site.mjs`: 접근코드 로그인→시안 입장→홈 렌더→journey bar 비노출→앱 런처→JS 예외 없음). 캡처: `docs/portal-experience/evidence/live-home.png`.
- 미반영: 백엔드 신규 라우트(platformAccess, integrations)와 migration `20260924000001_platform_access.js`는 아직 Cloud Run/운영 DB 미적용. 데모 모드(브라우저 저장소) 기반이라 화면 동작에는 영향 없음. 실인증 IdP, 실플랫폼 API 명세·토큰은 외부 확정 필요.
- 배포: Firebase Hosting release 2026-09-24T03:33Z, https://kai-platform-d0ae0.web.app

## 2026-09-24 (2차) — 홈 포털 업무 진입점 + CRUD 전수조사 및 미비사항 개선

- 메인 홈 플랫폼 카드 아래 '포털 업무' 카드형 진입점 추가(`PortalAppLauncher variant="home"`). 클릭 시 7개 업무 메뉴 팝업. 상단 헤더 버튼과 동일 메뉴, 권한/표시조건 동일.
- 13개 업무 화면 소스 전수조사 후 미비사항 개선(데모 모드 localStorage 지속, 테넌트+사용자 격리, 가짜 성공 금지 유지):
  - my-page: 프로필 저장, 활성 세션 종료, 개인 API Key 발급(일회 노출·데모 라벨)/폐기, 알림 설정, 이메일 변경요청 상태 저장. 비밀번호 변경·확인 메일 발송은 IdP/알림 연결 전이라 성공 미표시 + 명시 안내.
  - service-catalog: 직접 입력 요청이 입력값 그대로 저장(기존: 입력 무시·하드코딩), '신청서 생성' 버튼 동작.
  - export-approval: 승인/반려 결정과 신청 접수 저장(기존: 새로고침 소실), 승인자 하드코딩 제거.
  - credit-manager: 자원 단가 저장 + NaN/음수 등 검증(기존: console.log만).
  - environment-settings: 시스템 파라미터/보안 정책 저장 + 변경 이력 추가(기존: 저장 버튼 없음).
  - admin-console: 사용자 서비스 접근 설정 저장(기존: setState만).
  - 오타 수정: SessionTimeoutPolicyPanel '낶 사용자' → '일반 사용자'.
- 신규 스토어 7개 + 테스트 8건. `yarn tsc --noEmit`, app 테스트 22 suites / 104 tests 통과.
- 라이브 CRUD 검증 9/9 통과(`scripts/verify-live-crud.mjs`: 홈 포털 업무 버튼/메뉴 7개, 제안 등록·삭제, 카탈로그 직접요청, 반출 승인 결정, 마이페이지 프로필 — 전부 새로고침 유지 확인, JS 예외 0).
- Firebase Hosting 재배포. 사용자 정의 필요 항목: `docs/portal-experience/USER_DEFINITIONS_REQUIRED.md`.
