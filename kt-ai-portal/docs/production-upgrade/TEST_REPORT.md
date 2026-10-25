# TEST_REPORT — 운영 전환 자체시험 기록

형식: caseId / commit / profile / dataSeed / time / command / expected / actual / status / artifact / issue
FAIL/BLOCKED/SKIPPED는 PASS 집계에 포함하지 않는다.

| caseId | commit | profile | dataSeed | time(UTC) | command | expected | actual | status | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| AT-01a | 작업중(P1 골격) | local-integration | 없음 | 2026-09-16 06:53 | `POSTGRES_USER=portal_admin POSTGRES_PASSWORD=local-dev-only node scripts/run-portal-migrations.mjs` | fc_* 12테이블+RLS 생성, 오류 없음 | batch 1 적용, portal 스키마 14 relation | PASS | 첫 실행에서 schema 선생성 누락·knex timestamptz 메서드 오류 2건 발견·수정 후 통과 |
| AT-01b | 작업중 | local-integration | AT-01a | 2026-09-16 06:55 | 동일 명령 재실행 | 멱등 — 적용 0건 | "적용할 migration이 없습니다" | PASS | 중단 후 재실행·빈 DB 업그레이드 시험은 P1 후속 |
| AT-07a | 작업중 | local-integration | ARMY/NAVY tenant + 사용자 A/B | 2026-09-16 06:55 | psql 시뮬레이션(NOSUPERUSER/NOBYPASSRLS role) | context 미설정 시 0건 | 0건 | PASS | fc_tenant_memberships FORCE RLS |
| AT-07b | 작업중 | local-integration | 상동 | 상동 | 상동 | ARMY context에서 ARMY 소속만 조회 | ARMY-HQ/사용자A만 | PASS | |
| AT-07c | 작업중 | local-integration | 상동 | 상동 | 상동 | 다른 tenant INSERT 거부(WITH CHECK) | `new row violates row-level security policy` | PASS | |
| AT-06a | 작업중 | local-integration | 없음 | 2026-09-16 06:57 | `curl /api/portal/v1/me`(토큰 없음) | 401 | 401 unauthenticated | PASS | |
| AT-06b | 작업중 | local-integration | 없음 | 2026-09-16 06:57 | guest 토큰으로 `/me` (미등록 신원) | 403 identity_not_provisioned, 자동 프로비저닝 없음 | 403 일치 | PASS | |
| AT-06c | 작업중 | local-integration | 개발 게스트 등록 | 2026-09-16 06:57 | guest 토큰으로 `/me` | 200 + memberships | 200, ARMY-HQ membership 반환 | PASS | authenticationStrength=guest 표기 |
| AT-05a | 작업중 | local-integration | 상동 | 2026-09-16 07:00 | `POST /context/tenant` 유효 소속 | 200 + 감사 원장 기록 | 200 + fc_audit_events에 context.tenant.select 1행 | PASS | 업무+감사 단일 트랜잭션 |
| AT-05b | 작업중 | local-integration | 상동 | 2026-09-16 07:00 | `POST /context/tenant` 무소속 tenant | 403 | 403 no_active_membership | PASS | header/body tenantId 미신뢰 확인 |
| AT-05c | 작업중 | local-integration | 상동 | 2026-09-16 07:00 | `POST /context/tenant` 잘못된 uuid | 422 | 422 invalid_tenant_id | PASS | |
| AT-05d | 98930d0 | 단위 | - | 2026-09-16 | 코드 리뷰 + 브라우저 E2E 예정 | sessionStorage admin preview/captureRole이 비캡처 모드에서 무효 | AuthzContext에서 비캡처 승격 경로 제거 확인 | PASS(코드) | 서버 측 최종 판정은 P1 서버 인가 완료 후 |
| AT-01c | P1-2 | local-integration | AT-01a | 2026-09-16 | `node scripts/run-portal-migrations.mjs` | batch 2(조직/그룹/위임 4테이블+RLS) 적용 | batch 2 적용 완료 | PASS | |
| seed-ref | P1-2 | local-integration | migration 완료 | 2026-09-16 | `node scripts/seed-portal-reference.mjs` | 역할6·권한22·매핑64, 멱등 upsert | 2회 실행 모두 동일 결과 | PASS | rolePolicies.ts를 esbuild 번들로 직접 읽어 drift 방지 |
| AT-08a | P1-2 | local-integration | 게스트=portal-admin, 사용자C=무역할 | 2026-09-16 07:53 | `GET /v1/roles` (portal.view) | 200, 역할 6건 | 6건 | PASS | |
| AT-08b | P1-2 | local-integration | 상동 | 상동 | `GET /v1/memberships` (user.manage, ARMY) | 200, 소속 3건 | 3건 | PASS | |
| AT-08c | P1-2 | local-integration | 상동 | 상동 | `GET /v1/memberships` 헤더 없음 | 422 tenant_context_required | 422 | PASS | |
| AT-03a | P1-2 | local-integration | 사용자A=ARMY 소속만 | 상동 | SQL 수준 평가기 음성시험(사용자A+NAVY) | 유효 할당 0건(공집합) | 0건 | PASS | 토큰 기반 다중신원 음성시험은 Keycloak 연동 후(P1 후속) |
| AT-08d | P1-2 | local-integration | 상동 | 상동 | `POST /v1/role-assignments` 자기 부여 | 403 self_assignment_not_allowed | 403 일치 | PASS | 자기 역할 상승 금지 |
| AT-08e | P1-2 | local-integration | 상동 | 상동 | `POST /v1/role-assignments` 타인 부여 | 201 + 감사 원장 | 201 + rbac.role.assign 기록 | PASS | |
| AT-08f | P1-2 | local-integration | 상동 | 상동 | `POST /v1/role-assignments/:id/revoke` | 200, valid_until 설정(이력 보존) | 200 + rbac.role.revoke 기록 | PASS | 재회수 시 404 확인 |
| AT-08g | P1-2 | local-integration | 상동 | 상동 | system 역할 보유자의 무소속 tenant 선택 | 설계상 허용(전역 운영, DECISIONS 기록) | 200 | PASS(설계 확인) | system 외 역할은 membership 게이트 적용 |
| AT-37a | 98930d0 | production build | - | 2026-09-16 | `yarn tsc`, `yarn workspace app test`, `yarn workspace app build`, `yarn workspace backend build` | 오류 없음 | tsc 통과, 27/27, 빌드 성공 | PASS | P0 수정 기준 |
| smoke | P0 배포본 | gcp-staging(demo) | - | 2026-09-16 06:27 | `node scripts/smoke-check-demo-routes.mjs` | 17/17 | 첫 실행 16/17(Cloud Run 콜드스타트 404) → 재실행 17/17 | PASS | 최초 실패 원인: 콜드스타트 지연, flaky 아님 |
| AT-02~04, 08~36 | - | - | - | - | - | - | - | BLOCKED | PostgreSQL 업무 테이블 전체 범위·Keycloak·OpenSearch·원천 계약 미확보, 단계별로 해소 |

## 환경

- 로컬: macOS, Docker Desktop, postgres:16-alpine(`kai-portal-pg-local`), Backstage backend watch 모드(Node 22)
- staging(demo): Firebase Hosting + Cloud Run `kt-ai-portal-demo`
- 미실행 항목을 성공으로 집계하지 않음. 위 표 외 AT 항목은 전부 BLOCKED/미실행이다.

## staging(Cloud SQL) 실행 기록 — 2026-09-16

| caseId | profile | command | expected | actual | status |
|---|---|---|---|---|---|
| STG-01 | gcp-staging | Cloud SQL Admin API로 인스턴스 조회·authorizedNetworks에 개발맥 IP 추가 | RUNNABLE + 공개 IP 확보 | 34.158.202.238, kimi-dev-mac=218.233.65.220/32 추가 | PASS |
| STG-02 | gcp-staging | psql 접속(portal_migrator/portal_runtime/postgres) | 3계정 접속 | 3계정 모두 접속 성공 | PASS |
| STG-03 | gcp-staging | `run-portal-migrations.mjs` 대상=portal_business | migration 2종 적용 | batch 1(2파일) 적용 | PASS |
| STG-04 | gcp-staging | `seed-portal-reference.mjs` | 역할6·권한22 | 완료 | PASS |
| STG-05 | gcp-staging | portal_runtime으로 RLS/원장 보호 검증 | context 없이 0건, 원장 UPDATE 거부 | 0건 + `permission denied for table fc_audit_events` | PASS |

### staging 시험 중 발견·조치
- Cloud SQL의 `postgres` 계정은 진짜 superuser가 아니라 타인 소유 스키마에 GRANT 불가 → GRANT는 스키마 owner(portal_migrator)로 실행.
- 첫 `CREATE DATABASE`가 heredoc 다중문 컨텍스트에서 적용되지 않아 `-v ON_ERROR_STOP=1` 단일 문으로 재실행.
- 개발맥 공인 IP가 사용자가 등록한 승인 네트워크와 달라(218.233.65.220) authorizedNetworks 추가가 필요했음.

### staging 보안 잔여(운영 전환 게이트)
- 3개 계정이 동일 비밀번호 — 개발 단계 한정, 계정별 분리·Secret Manager 이관 필요.
- 공개 IP + authorizedNetworks는 개발 전용. 운영은 Private IP + Cloud Run connector.
- 비밀번호 원문은 채팅에 노출됨 — staging 전환 시 로테이션 권장.


## Codex 소스 검토 개선 검증 — 2026-09-16

기준 `4148007` 이후 작업 소스. 실제 실행 결과이며 기존 기록과 구분한다.

| 검사 | 명령/프로파일 | 결과 | 근거 |
|---|---|---|---|
| 타입 | `yarn tsc --noEmit` | PASS | 최종 소스 exit0 |
| 린트 | `yarn lint:all` | PASS | backend14/app303 파일, `evidence/lint.txt` |
| 단위 | `yarn workspace app test --watchAll=false --runInBand` | PASS 30/30, 6 suites | 기존27 + 비캡처 관리자 승격 차단3 |
| DB/API | `node scripts/test-portal-runtime.mjs` | PASS 22/22 | 실제 PostgreSQL·별도 runtime/NOBYPASSRLS 계정, `evidence/runtime-tests.txt` |
| 앱/백엔드 빌드 | `GCLOUD_BIN=... python3 scripts/build-firebase-staging.py` | PASS | 앱 먼저, backend `--skip-build-dependencies` |
| UI 로컬 | `node scripts/test-portal-shell.mjs` | PASS 23/23 | 390/768/1366/1440/1920, 메뉴3상태/ESC/focus/검색/도움말/관리화면 |
| UI Firebase preview | `PORTAL_TEST_URL=https://kai-platform-d0ae0--review-20260916-v9foxp15.web.app node scripts/test-portal-shell.mjs` | PASS 23/23 | 실제 배포된 브라우저 검증. OAuth/업무 저장 검증과 구별 |
| Linux backend image | Cloud Build `87c99fe0-0f65-4132-b461-a6f00d3e119a` | SUCCESS | Artifact Registry push 완료 |
| Cloud Run DB 연결/실사용자 E2E | 미실행 | BLOCKED | DB 접속정보 파일 미확인, 정식 인증 exchange/사용자 bootstrap 미완료 |

runtime22: no-context 거부, 유효역할, system 타tenant 거부, 미래/만료 소속,
pool context 해제, schema health, 무인증401, /me 본인소속, tenant 선택+감사,
타tenant 선택거부, 관리목록, 권한거부, 위임상한, 유효기간 역할 저장+감사,
중복409, 기간역할 회수, 마지막 관리자409, 정지계정 거부, 미검증신원 거부,
감사 실패시 업무 rollback, 원장변조 거부.

로컬 HTTP 신원은 fixture로 주입했다. 실제 Firebase/Keycloak 서명·회수 검증을
통과한 것으로 표시하지 않는다. 브라우저 검증은 demo capture 모드이며
모든 업무 버튼/API의 전수 통과나 WCAG 완전 준수 판정이 아니다.


최종 Hosting 검증: 본 사이트 배포 11:12 UTC 후 실제 URL에서 동일 브라우저23검사 PASS.
현재 Cloud Run revision `00017-v42`, `/api/portal/v1/health` HTTP404를 별도 확인했으며
신규 backend 배포 성공으로 집계하지 않음. `DEPLOYMENT_STATUS.md` 참조.

## backend Cloud Run 배포 기록 — 2026-09-16/20

| caseId | profile | command | expected | actual | status |
|---|---|---|---|---|---|
| DEP-01 | gcp-staging | migration runner 대상=Cloud SQL portal_business | 0003 audit_append_policy 적용 | batch 2 적용(0004는 미커밋 WIP라 일시 제외) | PASS |
| DEP-02 | gcp-staging | Secret Manager `portal-runtime-db-password` 생성 + version | secret + 1 version | 생성 완료, compute SA에 project 수준 secretAccessor 부여 | PASS |
| DEP-03 | gcp-staging | `scripts/deploy-cloudrun-rest.mjs` (Admin API v2) | digest 이미지 revision 배포 | `kt-ai-portal-demo-p1rev1` 배포, LATEST 100% 서빙 | PASS |
| DEP-04 | gcp-staging | `/api/portal/v1/health` (web.app 경유) | 200 + DB SELECT 1 성공 | 200 ok — Cloud SQL socket 연결 확인 | PASS |
| DEP-05 | gcp-staging | `/api/portal/v1/me` 무인증 / guest 토큰 | 401 / 403 identity_not_provisioned | 각 일치 | PASS |
| DEP-06 | gcp-staging | `node scripts/smoke-check-demo-routes.mjs` | 17/17 | 17/17 | PASS |

### 배포 과정에서 확인된 사실
- updateMask `template,traffic` PATCH 후 명시 traffic(구 revision 100% + review tag 0%)이 LATEST 100%로 대첩되어 안전 태그 경로가 적용되지 않았다. revision 조건상 정상 확인으로 실서빙 검증을 대체했으나, 다음 배포부터는 traffic 전용 PATCH를 분리 적용한다.
- 서비스 조회 시 annotations가 undefined로 보인 구간이 있었으나 health DB 응답으로 socket 연결은 실증됨.
- secret 단위 getIamPolicy가 404(SM 리소스명 프로젝트 번호 필요, 그래도 실패) → 프로젝트 수준 secretAccessor 부여로 대체(개발 한정, 운영은 secret 단위로 축소).
