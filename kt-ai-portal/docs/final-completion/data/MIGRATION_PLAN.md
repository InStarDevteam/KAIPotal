# MIGRATION_PLAN — 포털 업무 스키마(portal, fc_ 접두)

> 기준 경로: `backstage-portal/packages/backend/migrations/portal/`
> Knex migration 9개, 전부 schema `portal`, 테이블 접두 `fc_` (운영 전환 지시서 §0-5).
> **기관 표준/인증 조항 미수령 상태**: 본 계획은 프로젝트 낮 임시 기준이며, 기관 지침 수령 시 재검토 대상이다.

## 1. Migration 목록·목적·의존

| # | 파일 | 목적 | 의존 |
|---|---|---|---|
| 1 | 20260915000001_init.js | 스키마 생성 + 테넌트/조직/사용자/소속/역할·권한 9개 + 감사 원장·아웃박스·멱등키 3개(총 12개) + tenant RLS | 없음(최초) |
| 2 | 20260916000001_org_group_delegation.js | 그룹·그룹소속·위임·소속변경이력 4개 + RLS | 1 |
| 3 | 20260916000003_audit_append_policy.js | `fc_audit_events` INSERT 전용 RLS 정책 추가(테이블 변경 없음) | 1 |
| 4 | 20260918000001_tenant_settings.js | `fc_tenant_settings` + RLS, 감사 조회 색인 2개 | 1 |
| 5 | 20260924000001_platform_access.js | `fc_platform_access`·`fc_portal_preferences` + RLS, `fc_tenants.branch` CHECK에 marines 추가 | 1 |
| 6 | 20260924000002_work_requests.js | 프로젝트·멤버·업무신청·신청이벤트 4개 + RLS | 1 |
| 7 | 20260929000001_krmf.js | K-RMF 기준선·통제·증적·파일·조치·변경·TRR·평가기록·통제연결 9개 + RLS | 6(fc_projects 참조) |
| 8 | 20260929000010_domain_ledger.js | ① work_requests 계열 FK/CHECK/멱등키 보완 ② 크레딧 4개 ③ 반입반출 2개 + RLS | 6, 1(fc_users 참조) |
| 9 | 20260929000020_domains.js | 프로젝트(4상태)·멤버·초대·제안 3개·카탈로그 2개·공통설정 2개 + RLS | 1 |

실행 순서는 파일명(타임스탬프) 순이며 Knex migration 테이블(`fc_knex_migrations`)이 이력을 관리한다.

## 2. 기존 데이터 보존 전략: NOT VALID → 위반 검출 → VALIDATE

`20260929000010_domain_ledger.js`는 이미 데이터가 있을 수 있는 `fc_projects`/`fc_project_members`/`fc_work_requests`/`fc_request_events`에 FK를 추가할 때 다음 순서를 사용한다.

1. `ADD CONSTRAINT ... FOREIGN KEY ... NOT VALID` — 기존 행 검사 없이 제약 등록(스키마 잠금 최소화).
2. `assertNoOrphans(...)` — `NOT EXISTS` 반부 SQL로 고아 행 수를 사전 검출. 위반 발견 시 **즉시 실패(throw)하며
   예시 ID 5건을 오류 메시지에 포함**하고, 자동 삭제 같은 파괴적 처리는 하지 않는다.
3. `VALIDATE CONSTRAINT` — 위반이 0건임을 확인한 뒤 제약을 유효화. VALIDATE까지 완료해야 FK가 실제로 강제된다.

운영 적용 시에는 2번의 검출 SQL을 먼저 단독 실행해 위반 건수를 보고받고, 데이터 정정 후 migration을 진행하는 것을 권장한다.

같은 파일의 종결 상태(approved/rejected) 불변은 CHECK로는 표현 불가하므로 트리거(`fc_work_requests_terminal_guard`)로 강제한다.

## 3. 빈 DB 초기화 vs 기존 DB 업그레이드

### 빈 DB 초기화(신규 환경)

1. `CREATE SCHEMA portal`(또는 migration이 자체 처리 — `CREATE SCHEMA IF NOT EXISTS portal`).
2. Knex `migrate.latest({ directory: migrations/portal, schemaName: 'portal', tableName: 'fc_knex_migrations' })` —
   1번부터 9번까지 순서대로 1회 실행.
3. `infra/db/roles.sql`로 계정 3개 생성·권한 부여(아래 §5).

### 기존 DB 업그레이드(운영)

1. 사전 점검: 대상 DB의 `portal.fc_knex_migrations` 적용 이력을 확인해 **다음 미적용 migration만** 실행한다.
2. 8번(20260929000010) 적용 전 §2의 고아 검출 SQL을 사전 실행해 보고한다.
3. `migrate.latest`는 트랜잭션 처리 여부를 확인할 것 — 8번은 `assertNoOrphans` 실패 시 throw하므로
   적용 실패 시migration 트랜잭션이 롤백되거나, 이미 DDL이 커밋된 상태로 중단될 수 있다. 중단 후에는
   §4 절차로 복구한다. (해당 파일의 DDL은 멱등성이 없으므로 재실행 전 잔여 객체를 정리해야 한다.)

## 4. 롤백 / 전진 복구

- **롤백(down)**: 각 migration은 `exports.down`을 제공하나, 파괴적 down(down은 rollback의 유일한 수단이 아니다 — 지시서 §6)은
  개발 초기 단계 한정. 1번·6번·7번·9번의 down은 `DROP TABLE CASCADE`로 데이터를 파괴하므로 운영에서 사용 금지.
- **전진 복구(권장)**: 실패 원인(고아 데이터·권한 부족 등)을 수정한 뒤 `migrate.latest`를 재실행한다.
  8번 실패 패턴: `assertNoOrphans` 메시지의 예시 ID로 원 데이터를 정정 → 재실행.
  VALIDATE까지 완료된 제약은 재실행 시 NOT VALID 추가가 `IF NOT EXISTS` 없이 실패할 수 있으므로,
  중단 시점의 제약 존재 여부를 확인하고(`pg_constraint`) 수동으로 정리한 뒤 재실행한다.
- 다운그레이드가 필요한 경우(예: 5번의 down은 marines tenant 데이터를 파괴하지 않음)에도 **데이터 백업 후** 수행한다.

## 5. 계정 분리 운용 (infra/db/roles.sql)

| 계정 | 용도 | 권한 |
|---|---|---|
| portal_migrator | migration 전용 | `USAGE, CREATE ON SCHEMA portal`, `ALL ON ALL TABLES`, default privileges ALL. DDL + migration history만 |
| portal_runtime | 애플리케이션 런타임 | `SELECT, INSERT, UPDATE, DELETE`(스키마 owner 아님, `NOSUPERUSER NOBYPASSRLS`). `fc_audit_events`는 `UPDATE/DELETE` 회수 → append-only |
| portal_audit_reader | 감사 조회 전용 | `fc_audit_events` SELECT만 |

- 런타임 계정은 RLS를 우회할 수 없으므로 tenant 격리 정책이 강제된다(context 미설정 시 default deny).
- 비밀번호는 Secret Manager/볼트에서 주입하고, 저장소에 평문을 두지 않는다.
- 신규 테이블 추가 migration은 `ALTER DEFAULT PRIVILEGES`(roles.sql)로 런타임 권한을 자동 상속하도록 유지한다.

## 6. 기관 표준(MDR) 연계 — 미수령 상태

- 기관 표준사전 수령 전까지 표준단어·용어·도메인·코드 매핑은 전부 `임시정의`(DATA_DICTIONARY.csv 매핑상태 컬럼).
- 수령 후: `MDR_MAPPING.csv`의 기관원본 컬럼을 채우고 매핑상태를 `기관확정`으로 갱신, 불일치·예외 건은 해결방안 컬럼에 반영.
- 기관 확정 ID를 수령 전까지 임의 ID(공식 표준처럼 보이는 번호)를 생성하지 않는다.
