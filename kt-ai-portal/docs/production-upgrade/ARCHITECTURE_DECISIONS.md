# 아키텍처 결정 기록 (ARCHITECTURE_DECISIONS)

운영 전환 작업의 기술 선택과 근거를 기록한다. 바뀐 결정은 날짜와 사유를 함께 남긴다.

## ADR-001 기존 자산 보존과 점진 개선 (2026-09-15)

- 결정: Backstage 1.52.0 + React 18 + TypeScript 모노레포를 유지하고 재작성하지 않는다.
- 근거: 기존 화면·업무 정의·요구사항 매핑 자산의 활용 가치가 크고, 전면 재작성은 검증 비용이 크다.
- 확인 사항: 실제 `package.json` engines는 `node: "22 || 24"`, Yarn 4.13.0, Backstage `backstage.json` 1.52.0. 인수인계 문서의 Node 20/24 기술과 차이가 있어 **소스 기준 Node 22/24**로 고정한다.

## ADR-002 데이터베이스 (2026-09-15)

- 결정: 포털 업무 DB는 PostgreSQL(Cloud SQL 16, 폐쇄망 동일 스키마). 신규 업무 테이블은 `fc_` 접두어.
- 근거: 승인 트랜잭션·감사 원장·tenant 격리·RLS가 필요하고, Firebase SQL Connect 계층과 스키마 소유를 이중 관리하지 않기 위해 Cloud SQL 직접 연결을 선택.
- 주의: 현재 backend database service는 dev/dem오 프로파일에서 better-sqlite3 `:memory:`이며, 업무 데이터는 저장되지 않는다. pg 설정 존재를 업무 데이터 저장으로 착각하지 않는다.
- migration: Backstage Knex/pg 방식과 정합적인 도구 하나(Knex migration)를 사용하고, `portal_migrator`/`portal_runtime` 계정을 분리한다.

## ADR-003 인증 (2026-09-15)

- 결정: 최종 운영 IdP는 Keycloak OIDC. Firebase Google 로그인은 서버 검증을 갖춘 개발 어댑터로만 허용.
- 현재 상태: 프런트 Firebase 로그인 후 backend에는 Guest로 접속하는 경로가 존재한다. 이 경로는 staging/demo 전용이며 운영에서 제거한다.
- P0 조치 완료: 비캡처 모드에서 sessionStorage 관리자 미리보기 키로 역할이 승격되던 프런트 경로를 제거했다(`AuthzContext.tsx`).

## ADR-004 권한 정책 (2026-09-15)

- 결정: Backstage permission framework은 **기본 거부(deny-by-default)** 정책을 등록한다(`packages/backend/src/plugins/permission.ts`). 포털 업무 인가는 포털 BFF 서버 계층에서 수행한다.
- 이전: `plugin-permission-backend-module-allow-all-policy` — 제거됨(P0).
- 세부 허용 규칙은 P1에서 역할·범위별로 추가한다.

## ADR-005 검색 경로 (2026-09-15)

- 결정: `브라우저 → 인가된 /api/portal/v1/search → 서버 생성 DSL → OpenSearch` 단일 경로. 브라우저 임의 DSL/index 전달 금지.
- 이전: `app-config.yaml`의 `/api/proxy/search → http://localhost:9200` 무인증 raw proxy — 제거됨(P0).
- BFF 검색 API 구현 전까지 통합검색 화면은 "검색 색인 서비스 미연결" 상태를 표시한다. mock 결과를 정상 결과로 표시하는 fallback은 제거됨(P0).

## ADR-006 배포 프로파일 (2026-09-15)

- 결정: `local-integration`(Compose) / `gcp-staging`(Firebase Hosting + Cloud Run + Cloud SQL) / `onprem-production`(VM+systemd, 폐쇄망) 3개 프로파일.
- GCP는 합성데이터 기반 통합 검증 환경이며 최종 운영은 폐쇄망 VM이다. Kubernetes 전환은 갑자기 기본 전제로 바꾸지 않는다.

## ADR-007 UI (2026-09-15)

- 결정: MUI v4 유지. v5 이관은 Backstage 호환성 실험·회귀시험을 갖춘 별도 단계로 연기.
- 근거: Backstage 1.52.0 공식 UI가 MUI v4 계열이며 무작위 테마 충돌을 피해야 한다.

## ADR-008 감사·비동기 (2026-09-15)

- 결정: 업무 변경 + 감사 원장 + outbox를 하나의 DB 트랜잭션에 저장. worker는 BFF와 독립 실행 가능한 프로세스로 분리(Cloud Run Job + scheduler / on-prem systemd).
- Cloud Run request 종료 후 `setInterval` 지속을 가정하지 않는다.

## ADR-009 게이트웨이 (2026-09-15)

- 결정: 폐쇄망은 Kong DB-less 3노드를 `사용자/WEB → Kong → BFF` 경계에 둔다. OIDC 플러그인은 Enterprise 전용이므로 인증은 Backstage/BFF의 Keycloak 연동이 담당한다.

## ADR-010 포털 업무 DB와 Backstage framework DB 분리 (2026-09-16)

- 발견: Backstage database service는 pg 사용 시 플러그인별 데이터베이스(`backstage_plugin_*`)를 자동 생성한다. P1 골격 시험에서 portal 플러그인의 시작 migration이 `backstage_plugin_portal`에 생성되는 것을 확인했다.
- 결정: 포털 업무 데이터(fc_*)는 framework database service를 사용하지 않고, `portal.database` 설정의 전용 업무 DB(`portal_business`, schema `portal`)에 별도 knex 풀로 접속한다(`modules/portal/plugin.ts`의 `buildPortalDbClient`).
- 근거: 시험 사양 §2.2 — 업무 DB와 framework 내부 DB의 소유·권한·migration 실행 주체 분리. framework 자동 DDL/생성 동작에 업무 스키마 소유를 맡기지 않는다.
- migration 실행 주체: 운영은 `scripts/run-portal-migrations.mjs`(portal_migrator 계정), `portal.migrations.runOnStartup`은 local-integration 전용.
- 계정 분리 템플릿: `infra/db/roles.sql`(portal_migrator/portal_runtime/portal_audit_reader, 감사 원장 append-only).


## ADR-011 runtime RLS와 관리 범위 (2026-09-16, 소스 검토 개선)

- 모든 tenant 업무 권한은 선택 tenant의 유효 membership/역할로 계산한다.
  과거 P1 시험의 system 역할 무소속 tenant 허용은 폐기한다. 전역 registry 관리가
  필요하면 tenant 업무 API와 별도의 명시적 전역 범위 API로 구현한다.
- 검증된 외부 신원(verified), 계정 active, membership/assignment 시작·만료를 검사한다.
- 제한된 runtime DB 계정으로 integration 시험을 수행한다. superuser 시험만으로
  RLS/감사 INSERT 성공을 판단하지 않는다. 감사 INSERT RLS 정책을 migration으로 추가한다.
- `DemoAdminProvider.isAdmin`은 Firebase 이메일 비교였으므로 운영 관리자 신원으로
  인정하지 않는다. 비캡처 UI의 서버 roles 연결은 P1 인증 exchange 후 작업이다.

## ADR-012 staging 배포 경로 (2026-09-16)

- 기존 Cloud SQL 인스턴스의 연결명을 Cloud Run Unix socket으로 전달한다.
  pg는 Unix socket host를 기본 지원하므로 별도 connector 라이브러리를 추가하지 않는다.
- DB 비밀번호는 Secret Manager 참조, pool max5/timeout, 시작 migration false,
  schema health 확인, 종료시 pool destroy를 사용한다.
- 고유 image tag와 digest를 기록한다. 무트래픽 tag의 JSON health/무인증401을
  확인한 후 트래픽을 전환한다. 접속정보 없는 상태에서 비밀번호를 임의 재설정하지 않는다.
- 원격 빌드는 전용 context만 전송하며 frontend build→backend skip-build-dependencies
  순서로 같은 빌드 결과가 덮어써지는 문제를 방지한다.
