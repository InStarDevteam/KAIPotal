# 포털 업무 첫 화면·공유 승인함 API 계약 (2026-09-24)

이 문서는 `/portal-work` 역할별 첫 화면과 공유 승인함을 위한 포털 낮(BFF) 집계 API의 계약을 정의한다.
모든 엔드포인트는 기존 포털 BFF(`/api/portal/v1`) 아래에 두며, **기존 40개 플랫폼 연계 계약과 중복되지 않는다.**

## 기존 40개 플랫폼 연계 계약과의 관계

| 계약 범위 | 담당 |
|---|---|
| AI/데이터/클로우드/VDI 플랫폼의 원천 데이터(자원 사용량, 크레딧 정산, 자산, 학습 현황 등) | 기존 40개 연계 계약(플랫폼 측이 시스템 오브 레코드) |
| 포털 낮 추적(프로젝트 멤버십, 신청·승인 상태, 이력, 포털 감사) | **이 계약** (`fc_projects`, `fc_project_members`, `fc_work_requests`, `fc_request_events`) |

- 크레딧·자원 사용량은 이 API가 수치를 만들지 않는다. 원천(플랫폼) 미연동 시 `state: "pending_integration"`으로만 응답한다.
- 플랫폼 원천이 연동되면 동일 응답 필드에 `state: "live"`와 관측 시각(`asOf`, `collectedAt`)이 채워진다. 계약 구조 변경 없음.
- 승인 결과의 플랫폼 측 실행(컨테이너 생성 등)은 별도 쓰기 계약이며, 이 API의 결정 응답은 포털 낮 상태만 반영한다.

## 공통

- 인증: Backstage 신원(향후 OIDC 전환 시 동일 경로). 지원 신원만 허용.
- 테넌트 선택: `x-portal-tenant-id` 헤더 — 신뢰하지 않고 서버가 유효 소속을 검증한다.
- 인가: `requireMembership`(유효 소속) 또는 엔드포인트별 유형 권한. 거부는 감사 원장에 기록.
- 응답 봉투: `{ data, meta }`. `meta`는 항상 `requestId`, `asOf`(관측 시각), `dataMode`, `collectionCycleSec: 30`, `staleAfterSec: 120`, `nextCursor`(목록)를 포함한다.
- 오류 봉투: `{ error: { code, message, retryable, requestId } }`.
  코드: `unauthenticated(401)`, `identity_not_provisioned(403)`, `account_not_active(403)`, `no_active_membership(403)`, `permission_denied(403)`, `tenant_context_required(422)`, `invalid_request_type/invalid_title/invalid_decision(422)`, `not_project_member(403)`, `not_found(404)`, `already_decided/version_conflict(409)`, `internal_error(500, retryable)`.
- RLS: 신규 테이블 4개는 tenant 범위 정책(context 미설정 시 default deny).

## 엔드포인트

### GET /v1/work/overview — 역할별 첫 화면 집계

유효 소속만 필요. 내용은 서버 계산 권한 집합으로 분기된다.

응답 `data`:
- `myProjects[]`: `{ id, name, status, memberRole }` — **서버 멤버십 원장(`fc_project_members`) 기준만**. 로컬/브라우저 샘플은 근거가 되지 않는다.
- `myRequests[]`: 내가 제출한 신청 최근 10건.
- `approvalQueue[]`: `{ type, count }` — 내 권한으로 검토 가능한 유형(workspace/export/credit)의 검토 대기 건수. 권한 없는 유형은 미포함.
- `recentAudit[] | null`: `audit.view` 권한 시 최근 10건, 없으면 `null` + `auditExcludedReason: "permission_missing"`.
- `credits`, `resourceUsage`: `{ state: "pending_integration" }` — 수치 미제조(위 관계 표 참조).

### GET /v1/work/requests — 내 신청 목록

쿼리: `limit`(기본 20, 최대 100), `cursor`(`created_at|id`). 신청자 본인 건 최신순.

### POST /v1/work/requests — 신청 접수

본문: `{ type: "workspace"|"export"|"credit", title, projectId?, payload? }`.
- `projectId` 지정 시 요청자의 프로젝트 멤버십을 서버에서 확인(비멤버 403 `not_project_member`).
- 접수와 `submitted` 이력, 감사 기록은 한 트랜잭션에 기록. 응답 201.

### GET /v1/work/approvals — 공유 승인함

쿼리: `status`, `limit`, `cursor`. **다른 사용자가 제출한 신청** 중 내 권한 유형(workspace→`workspace.approve`/`project.approve`, export→`export.review`, credit→`credit.approve`)의 `requested`/`reviewing` 건 최신순. 교차 테넌트는 RLS가 차단.

### GET /v1/work/approvals/:id — 신청 상세 + 이력

검토 권한(유형별) 또는 신청자 본인만 조회. `data.history[]`에 `submitted`/`decided` 이력이 시간순으로 포함.

### POST /v1/work/approvals/:id/decisions — 승인/반려

본문: `{ decision: "approved"|"rejected", note?, expectedVersion? }`.
- 유형별 검토 권한 필요. 없으면 403 `permission_denied`.
- 낙관적 락: `expectedVersion` 불일치 시 409 `version_conflict`(상태 미변경).
- 이미 결정된 신청은 409 `already_decided`(중복 클릭/동시 결정 방지).
- 상태 변경, `decided` 이력, 감사 기록을 한 트랜잭션에 원자적으로 기록.
- 플랫폼 측 실행(자원 생성 등)은 이 결정과 원자적이지 않다 — 플랫폼 쓰기 계약의 비동기 결과로 보고한다(미연동 시 상태는 포털 낮 기준).

## 정책 기준

- 승인 권한은 기존 `rolePolicies` 권한명을 그대로 사용한다. 신규 권한을 만들지 않는다.
- 필요 시 정책 변경(예: `project.approve` 범위 재정의)은 별도 제안으로 분리한다.

## 검증

- `scripts/test-portal-work-api.mjs`: 일회성 로컬 PostgreSQL + runtime 역할로 14 checks(멤버십 서버 검증, 감사 권한 게이트, 승인함 교차 사용자 흐름, 403/409/404 분기, 이력·감사 원자성, 커서 페이지네이션, 교차 테넌트 차단).
- 실행: `node scripts/test-portal-work-api.mjs` (로컬 127.0.0.1:5432 전용 DB 자동 생성·정리).
