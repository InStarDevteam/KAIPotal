# 업무 집계 오류 조사 및 수정 — 2026-10-01

## 확인된 운영 원인

Cloud Logging을 읽기 전용으로 조회했다. `kt-ai-portal-demo-p1rev5`, `2026-10-01T02:33:38.179457Z`의 `/v1/work/overview` 로그는 **`permission denied for table fc_project_members`**였다. 같은 오류가 직전 요청에도 반복된다. 빈 테이블이라 발생한 오류가 아니다.

09-24 업무 원장 4개를 `public`에서 `portal`로 이동하더라도 기존 테이블의 ACL은 자동으로 새 스키마의 기본 권한으로 바뀌지 않는다. 따라서 테이블 위치를 바로잡은 것과 런타임 계정의 조회 권한이 준비된 것은 별도로 확인해야 한다. 현재 최신 migration 전체를 로컬 신규 DB에 적용하고 모든 테이블 권한을 일괄 부여하던 기존 시험은 이 운영 상태를 재현하지 못했다.

**운영 DB 권한 변경·migration 실행·Cloud Run 배포는 이 조사에서 수행하지 않았다.** 운영 오류 해소에는 아래 복구 migration을 실제 운영 환경에 적용해야 한다.

## 반영한 수정

- `20261001000001_repair_work_runtime_grants.js`: `portal_runtime` 역할이 있을 때 이동한 4개 업무 원장에 필요한 접근 권한을 복구한다. 테이블 소유권, RLS 정책, FORCE RLS, 역할 부여 정책은 변경하지 않는다. `fc_request_events`는 조회·추가 권한만 부여한다. `fc_audit_events` 권한은 변경하지 않는다.
- 집계 읽기를 PostgreSQL savepoint로 격리했다. ACL 누락·미적용 migration 같은 특정 데이터 원천 설정 오류만 항목별 `unavailable`로 구분한다. 개발 오류나 DB 연결 오류를 조용히 빈 데이터로 바꾸지 않는다.
- 응답에 `data.sections`, `meta.partial`을 추가했다. 정상 빈 목록은 0, 실패한 항목은 `—`와 조회 실패 안내로 표시한다. 모든 조회 원장이 실패하면 503과 재시도 가능한 오류를 반환한다. 원본 SQL 오류는 서버 로그에 요청 ID와 항목명으로만 기록한다.
- 일반 사용자의 ‘내 신청 현황’은 승인함이 아닌 본인이 신청한 서버 원장을 표시한다. 승인 대기 요약도 ‘유형 2개’를 ‘요청 2건’으로 세던 문제를 고쳐 실제 건수를 합산한다. 프로젝트/내 신청 요약도 미리보기 20개·10개 제한과 별도로 전체 건수를 조회한다.
- 재조회 시 이전 값을 정상 현황처럼 남기지 않으며, 재조회 버튼을 누른 즉시 성공했다는 문구를 출력하지 않는다.
- 업무 신청 API에 유형별 기존 신청 권한 검사와 프로젝트 ID 입력 검증을 추가했다. 프로젝트 멤버십 검사와 승인·반려 권한/RLS는 유지한다. 작업환경 승인과 실제 외부 플랫폼 프로비저닝은 별개다.
- `scripts/check-portal-work-runtime.mjs`: 운영 계정의 테이블 권한과 FORCE RLS를 **읽기 전용**으로 점검하며 누락 시 종료코드 1을 반환한다. `/health`가 200이라는 사실만으로 업무 원장 접근까지 정상이라고 판정하지 않는다.

## 배포 담당자 적용 순서

1. 기존 절차대로 `portal_migrator` 계정으로 `scripts/run-portal-migrations.mjs`를 실행하여 신규 복구 migration을 적용한다. 복구 대상 역할 이름은 현재 운영 구성과 같은 `portal_runtime`이다.
2. **런타임 계정**의 `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`를 환경변수로 전달하여 `node scripts/check-portal-work-runtime.mjs`를 실행한다. 출력에 비밀번호는 포함하지 않는다.
3. 수정된 백엔드와 프런트엔드를 배포한다. 로그인 후 `/portal-work` 실제 요청이 정상이고 부분 실패 항목이 없는지, 자기 프로젝트/신청과 승인함 건수가 상세 목록과 일치하는지 확인한다.

복구 migration을 먼저 적용하면 기존 `p1rev5`의 해당 SELECT 권한 오류도 해소할 수 있다. 부분 실패 표시·신청 목록·건수 계산 변경은 이번 소스의 백엔드/프런트 배포가 필요하다. 미연동 GPU·실측 자원 사용량을 정상 수치로 임의 생성하지 않는다.

## 검증

| 검증 | 결과 | 내용 |
|---|---|---|
| `node scripts/test-portal-work-api.mjs` | **22개 통과** | 전용 로컬 PostgreSQL DB, NOSUPERUSER/NOBYPASSRLS runtime 계정 |
| 운영 권한 장애 재현 | 통과 | runtime에서 프로젝트 멤버 원장 SELECT를 회수하고 부분 실패/다른 항목 조회 유지 확인 |
| 복구 migration 동작 | 통과 | 최소 권한 복구 후 내 프로젝트 정상 조회, 교차 테넌트 차단/FORCE RLS/감사 UPDATE·DELETE 거부 유지 |
| 모든 원장 실패 | 통과 | 빈 목록 200 대신 HTTP 503, retryable·requestId 확인 |
| 승인·반려·공유 승인함 | 통과 | 다른 신청자, 유형별 권한, 낙관적 락, 감사/이력 원자성, 페이지네이션 |
| read-only 배포 점검 | 통과 | 정상 ACL 종료코드 0, SELECT 회수 후 종료코드 1 |
| `workServerData.test.ts` | **22개 통과** | 부분 오류/권한 제외/빈 목록 구분, 실제 승인 건수, 본인 신청 목록 매핑 |
| `yarn tsc --noEmit` | 통과 | 변경 시점 전체 타입 검사 |

증적: `evidence/work-api-tests.txt`. DB 시험 데이터는 종료 시 전용 DB/역할과 함께 제거한다. 이 결과는 실제 기관 IdP·플랫폼 프로비저닝·운영 적용 검증을 대신하지 않는다.
