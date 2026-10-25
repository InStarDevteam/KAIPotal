# EXECUTION_STATUS — 운영 전환 실행 현황

최종 갱신: 2026-10-01 · 고객 시연 사이트 DB·Cloud Run·Firebase Hosting 배포 완료

현재 상태는 [2026-10-01 배포 보고서](../customer-demo-20261001/DEPLOYMENT_REPORT.md)와 [기능·연계 전수 점검](../customer-demo-20261001/RFP_UX_AUDIT.md)을 기준으로 한다. 단위 422개·PostgreSQL 132개·공개 브라우저 44개 및 실제 API 7개 그룹 검증을 완료했다. 아래 단계표는 09-18 당시의 이력이며 최신 구현 여부를 나타내지 않는다. 실제 기관 IdP·플랫폼 연계와 운영망 고가용성 구성은 이번 공개 시연 배포만으로 완료되지 않는다.

## 2026-09-18 군별 설정·감사 기능 후속 반영

이 절은 아래의 기존 P2 미완료 항목 중 군별 브랜드/메뉴 저장과 관련하여 최신 상태다.

- 군별 외관·공통 문구·메뉴 설정 화면과 PostgreSQL/RLS 저장 API를 구현했다. 운영 UI 권한은 소속별 서버 응답으로 판단한다.
- 통합 접속·사용·관리 감사 이력, 필터·집계·상세·CSV 기능을 구현했다. 클라이언트 활동은 인증 제공자 로그인 이벤트와 구분한다.
- 사용자 요청에 따라 K-RMF 전용 기능과 요구사항 대응/발표용 화면 진입을 비활성화하고 활성 UI의 요구사항 표기를 제거했다.
- 프런트엔드 테스트 58개, 실제 PostgreSQL 검증 41개, 로컬 브라우저 시나리오 15개 통과.
- 새 DB 마이그레이션 및 기준 권한 seed 갱신이 필요하다. 운영 DB 변경과 외부 재배포는 실행하지 않았다.
- 실제 인증 이벤트·외부 플랫폼 감사 수집, 개인화 DB 저장·위젯 편집 등 이 변경 외 항목의 완료 여부는 기존 상태를 유지한다.

상세: `docs/tenant-portal-update/IMPLEMENTATION.md`, `docs/tenant-portal-update/VALIDATION.md`.

## 단계별 현황

| 단계 | 범위 | 완료 조건 | 현재 상태 | 다음 작업 | 외부 차단 |
|---|---|---|---|---|---|
| P0 | 현황/inventory, 버전 baseline, 운영 우회 차단, 구성 검증 | 회귀 기준 확보, guest/admin preview/mock 운영 유입 차단 시험 | ✅ 코드 차단 완료·산출물 6종·demo 배포(smoke 17/17). AT-05 서버 판정은 P1 인가 완료 후 | — | 없음 |
| P1 | PostgreSQL, 인증/서버 인가, tenant/user/role, audit/outbox | A/B tenant negative test, 실제 저장·재시작, 감사 원자성 | 🟡 진행 중 — 골격+RBAC 완료: fc_ 16테이블, RLS 시험 3종, BFF health/me/context/tenant/roles/permissions/memberships/role-assignments 실DB 동작, 서버 RBAC 평가기·인가 거부 감사·기준데이터 seed(역할6·권한22) 적재 확인 | 역할/권한 seed(reference)·API 확대, Keycloak OIDC 어댑터, 조직/그룹/위임 테이블 | staging Cloud SQL 접속 정보(사용자가 `kai-platform-d0ae0-instance` 생성 중), Keycloak URL/realm |
| P2 | 앱 셸·브랜드/메뉴·개인화·관리자 | 저장/복원·sidebar 상태·정책 적용 시험 | ⬜ 미착수 | — | — |
| P3 | 프로젝트·환경·승인·크레딧·파일·알림·게시판 | 트랜잭션/상태전이/동시성 시험 | ⬜ 미착수 | — | — |
| P4 | API adapter·실증·카탈로그·OpenSearch | 38개 계약 상태 정리, 실검색 시험 | ⬜ 미착수 (API_CONTRACT_REGISTER.csv 작성됨) | 독립 계약 시험 서버 구현 가능 | 원천 플랫폼 API 명세(§4-12) |
| P5 | K-RMF 생애주기·증적·감사 관제 | 추적/집계 정합성/무결성 시험 | ⬜ 미착수 | — | K-RMF 적용 기준판(§4-13) |
| P6 | Kong·3중화·백업/복구·관제·배포 | 장애/복원 실측, 배포 패키지 | ⬜ 미착수 | — | 운영망·장애 도메인 확정 |

## P1 진행 내역 (2026-09-16)

인프라·도구:
- `infra/local-integration/docker-compose.yml`: postgres:16-alpine 로컬 PG(개발 전용 자격증명 명시)
- `infra/db/roles.sql`: portal_migrator/portal_runtime/portal_audit_reader 분리, 감사 원장 append-only
- `scripts/run-portal-migrations.mjs`: migration 전용 job(운영 경로)
- `backstage-portal/app-config.local-integration.yaml`: pg + runOnStartup=true(로컬 한정)

스키마·코드:
- `packages/backend/migrations/portal/20260915000001_init.js`: fc_tenants/organizations/users/external_identities/tenant_memberships/roles/permissions/role_permissions/role_assignments/audit_events/outbox_events/idempotency_keys + RLS(tenant 격리, default deny, WITH CHECK)
- `packages/backend/src/modules/portal/`: plugin.ts(전용 업무 DB knex 풀, ADR-010), router.ts(health/me/context/tenant, 계약 meta, 401/403/422/500 구분), services/context.ts(principal·SET LOCAL tenant context·membership 검증), services/audit.ts(감사 원장 트랜잭션 기록)
- `packages/backend/package.json`: knex 직접 의존성 선언

시험(전부 실제 실행, `docs/production-upgrade/TEST_REPORT.md`):
- migration 적용/멱등 재실행 PASS (AT-01a/b)
- RLS: context 미설정 0건 / 자기 tenant만 조회 / 타 tenant INSERT 거부 PASS (AT-07a~c)
- API: 무인증 401 / 미등록 신원 403 / 등록 신원 200+membership / 유효 tenant 선택 200+감사 원장 / 무소속 403 / 잘못된 uuid 422 PASS (AT-05/06 일부)

시험 중 발견·수정한 결함: knex `timestamptz` 메서드 오류, migration 이력 테이블 스키마 선생성 누락, Backstage database service의 플러그인별 DB 자동 생성(ADR-010으로 구조 분리), 라우터 body 파서 누락, 내부 오류를 401로 가장하던 에러 매핑(500 구분으로 수정).
## P0 완료 내역 (2026-09-15, 커밋 98930d0 + demo 배포)

코드:
- `IntegratedSearchPage.tsx`: 비localhost mock 즉시 반환 분기 제거, 검색 실패 시 mock fallback 제거 → "검색 서비스 미연결" 상태 표시. 필터 선택지·추천어를 실제 응답에서 도출.
- `SearchIndexStatusBar.tsx`: 하드코딩된 색인 시각/원천 동기화 "정상" 배지 제거 → 연결 상태(checking/connected/unavailable) prop 기반 표시.
- `AuthzContext.tsx`: proposalCapture=false 경로에서 sessionStorage admin preview 역할 승격 제거 → 서버 검증 관리자 신원(isAdmin)만 인정.
- `backend/src/plugins/permission.ts` 신규: 기본 거부(deny-by-default) 정책 모듈. `backend/src/index.ts`에서 allow-all 모듈 제거·교체.
- `app-config.yaml`: OpenSearch raw proxy(`/search`, dangerously-allow-unauthenticated) 제거.

문서(6종):
- `docs/production-upgrade/BASELINE_AUDIT.md`
- `docs/production-upgrade/FEATURE_ACTION_INVENTORY.csv` (화면 17 라우트·액션 인벤토리)
- `docs/production-upgrade/REQUIREMENT_IMPLEMENTATION_MATRIX.csv` (SFR-001~021, TER-008, SER-KRMF 24행)
- `docs/production-upgrade/API_CONTRACT_REGISTER.csv` (38건 후보, 검증상태 분류)
- `docs/production-upgrade/ARCHITECTURE_DECISIONS.md` (ADR-001~009)
- 본 파일

검증 실행 결과:
- `yarn tsc --noEmit`: 통과
- `yarn workspace app test --watchAll=false`: 27/27 통과
- `yarn workspace app build`: 성공

## P0 잔여(다음 세션 우선)

1. AT-05 운영 우회 차단 시험: sessionStorage/captureRole 조작 시 서버 권한 불변 확인 E2E — 프런트 방어는 적용됨, 서버 인가는 P1 완료 후 최종 판정.
2. demo 배포 완료(2026-09-16, smoke 17/17). 통합검색 화면은 검색 BFF(P4) 구현 전까지 "검색 색인 서비스 미연결"로 표시된다 — 의도된 동작 변화.
3. Backstage 불필요 플러그인(scaffolder/techdocs/kubernetes/MCP actions)의 운영 프로파일 비활성화 정책 확정 — P6.

## 알려진 제한

- 원본 RFP PDF 부재: SFR 매핑은 남부 추적표 기준. 원문 확보 전 "RFP 완전 충족" 선언 금지.
- 서브에이전트 위임이 사용량 한도로 불가했던 관계로 인벤토리 CSV는 주요 액션 중심(전체 단순 링크까지 망라하지 않음). P1 착수 전 행 단위 재검증 권장.


## 2026-09-16 후속 소스 검토 업데이트

이 절이 위의 이전 상태표보다 최신이다. 상세: `REVIEW_FINDINGS.md`.

- P1: runtime RLS/계정/역할/감사 결함 수정, 실제 PG22검사 통과. Firebase 이메일은
  서버 관리자 신원이 아니라는 점을 바로잡았다. 정식 인증 exchange/UI API 연결은 미완료.
- P2: 앱 셸/공통 토큰/대시보드 헤더/검색/메뉴3상태/모바일 접근 구현 및 브라우저 검증.
  tenant별 브랜드/메뉴 게시/개인화 DB 저장과 위젯 편집은 미완료.
- 배포: Cloud SQL은 이미 생성/초기 스키마 적용됨. 이 맥 gcloud 존재 확인.
  새 backend image 빌드/push는 완료. DB 접속정보 파일을 확인하지 못해 실제 backend 전환 대기.
- 운영 승인: 현재 preview/capture/Guest·다수 fixture 경로가 남는다. 전 범위 완료 아님.

- 최종 확인: 새 UI는 Hosting 본 사이트 배포·실URL 브라우저23검사 통과.
  backend는 `00017-v42` 유지·portal health404. 실제 상태표는 `DEPLOYMENT_STATUS.md` 참조.
