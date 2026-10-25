# 배포 전 독립 검토 — 2026-10-01

사용자가 후속 적용 및 배포를 승인한 후 migration·릴리스 스크립트·실행 설정을 별도로 검토했다. 이후 실제 운영 DB 적용과 후보 백엔드 점검 결과를 아래에 추가했다. 최종 트래픽 승격과 사용자 URL 검증 결과는 [DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md)를 따른다.

| 발견 | 영향 | 반영 |
|---|---|---|
| REST 배포가 Cloud Run v2의 `trafficStatuses`를 잘못된 `status` 하위에서 조회 | 기존 100% revision 식별 실패 시 후보를 즉시 100%로 배포할 수 있었음 | 최상위 응답 해석, 기존 트래픽을 구체 revision으로 고정, 불완전 상태에서 중단 |
| REST 승격 대상 `latest` 및 오래된 기본 이미지/revision | 검증하지 않은 revision 승격 가능 | 이미지와 revision 명시 필수, 검토 태그 및 Ready 확인 후 해당 revision만 승격 |
| staging 컨테이너가 demo 설정만 실행 | Cloud Run에서 제공하는 앱 설정이 샘플·역할 캡처를 다시 활성화할 수 있음 | 이미지에 customer-showcase 설정 포함, 런타임에서도 마지막에 병합 |
| gcloud staging 스크립트의 `max-instances=3` | 실제 서비스의 min/max 설정 변경 가능 | 이미지/revision/tag만 변경하고 현재 SQL·secret·인스턴스 설정 유지 |
| 후보 배포 직후 health만 확인해 자동 승격 | 인증된 업무 API·DB 오류 미발견 가능 | 후보 생성과 `--promote` 분리, 구체 revision 승격 |

Cloud Run v2 응답 구조와 트래픽 의미는 [Google Cloud 공식 Service 참조](https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services)를 확인했다.

## DB 검토

- ACL 복구 migration은 이동된 업무 원장 4개에만 적용하며 FORCE RLS·소유권·역할 매핑을 변경하지 않는다.
- 프로필 원장은 tenant 기반 FORCE RLS와 BFF의 본인 actor 고정을 함께 사용한다. 군번 등 자기기입 프로필은 인가에 사용하지 않으며 감사 기록에는 값 대신 필드명만 남긴다.
- 운영 계정의 기본 권한은 로컬 시험과 달라, 운영 적용 후 실제 runtime으로 ACL/RLS를 추가 확인했다. 4개 업무 원장 외에 09-29 신규 원장과 프로필까지 포함하여 `portal`의 51개 테이블 ACL을 조사했다. 결과는 [runtime-after.json](deployment/runtime-after.json)의 PASS 기록을 따른다.
- 스키마 rollback으로 ACL을 다시 회수하지 않는다. 변경은 기존 revision과 호환되며 장애 시 Cloud Run 트래픽을 이전 revision으로 복귀시키는 순서다.

## 추가 검증

- `node scripts/test-cloudrun-release-plan.mjs`: 통과. 후보 0%, 기존 단일·분할 트래픽 유지, Secret/SQL/min/max 보존, 기존 객체 불변, 상태 누락·불완전 100%·배포 중·기존 revision 거부, 정확한 Ready revision 승격을 검증한다.
- `node --check scripts/deploy-cloudrun-rest.mjs`: 통과.
- `bash -n scripts/deploy-staging-backend.sh`, `bash -n scripts/build-staging-image.sh`: 통과.
- 변경 파일 `git diff --check`: 통과.

기존 demo 전용 스크립트·Dockerfile.demo/cloudbuild.yaml은 이번 고객 배포 경로가 아니다. 이번 경로는 `build-firebase-staging.py` → `build-staging-image.sh`/`Dockerfile.staging` → 검토용 후보 → 인증된 점검 → 명시적 승격이다.

## 운영 계정 최소 권한 추가 점검

배포 전 운영 조회에서 `portal_runtime`의 CREATEROLE·CREATEDB 및 `cloudsqlsuperuser` 멤버십이 발견되었다. `infra/db/roles.sql`의 원래 런타임 정의는 NOCREATEROLE/NOCREATEDB이며, 애플리케이션의 업무 쿼리는 역할/DB 생성 권한을 사용하지 않는다. 운영 설정의 `portal.migrations.runOnStartup`도 false다. Cloud SQL 내장 사용자 생성의 기본 권한이 원래 런타임 설계와 달랐던 것으로 판단된다. [Cloud SQL 사용자·역할 공식 문서](https://docs.cloud.google.com/sql/docs/postgres/users)

DBA 권한으로 런타임에만 `ALTER ROLE portal_runtime NOCREATEROLE NOCREATEDB`와 `REVOKE cloudsqlsuperuser FROM portal_runtime`를 적용했다. 적용 후 `rolcreaterole=false`, `rolcreatedb=false`, `rolsuper=false`, `rolbypassrls=false`, 추가 역할 멤버십 없음과 업무 API 성공을 확인했다. 기존 직접 DML 권한·로그인·비밀번호·migrator 권한·객체 소유권은 유지했다. 이것은 인프라 계정 교정이며 애플리케이션 migration에 역할관리 권한을 요구하지 않는다. 실제 적용 증적은 [runtime-after.json](deployment/runtime-after.json)에 있다.

`check-portal-work-runtime.mjs`는 이제 런타임의 DB/역할 생성·복제 권한, 간접 관리 역할 멤버십, portal 객체/스키마 소유 역할 접근도 실패로 보고한다. NOINHERIT만으로는 SET ROLE 경로를 없애지 못하므로 간접 멤버십도 확인한다. [PostgreSQL 역할 멤버십](https://www.postgresql.org/docs/16/role-membership.html)

`node scripts/test-runtime-role-guard.mjs`의 일회성 로컬 PostgreSQL **5개 검사 통과**: 정상 DML 계정, 직접 관리 속성, NOINHERIT 상태의 간접 관리 역할, 객체 소유권, 복구 후 DML 및 감사 append-only/tenant 조회 정책. 기존 업무 API **22개 검사도 재통과**했다.

감사 원장의 `RLS=true`, `FORCE=false`는 초기 migration이 선택한 기존 설계다. `20260916000003_audit_append_policy.js`는 인증 전 거부 이벤트도 추가할 수 있도록 INSERT 정책을 허용하고, 조회는 tenant 정책, 수정·삭제는 runtime ACL에서 차단한다. 이번 작업에서는 감사 FORCE/RLS 정책을 바꾸지 않는다.

## 운영 적용·복구 준비 확인 결과

- `portal_migrator`로 `20261001000001_repair_work_runtime_grants.js`, `20261001000010_user_profile.js`를 batch 5에 적용했다. [migration 결과](deployment/migrations.json)
- 변경 전 논리 백업을 실제 별도 DB에 복원하여 portal 테이블 50개, 기존 migration 9개, 감사 원장 117행을 확인했다. 관리형 백업은 현재 무료 시험 환경에서 사용할 수 없어, 복원 검증된 논리 백업으로 준비했다. [복원 결과](deployment/backup-restore.json)
- 교정에 사용한 임시 SQL 사용자와 임시 자격증명 파일을 삭제했다. [정리 결과](deployment/temporary-identity-cleanup.json)
- 전체 단위 테스트는 app 255개·backend 167개로 합계 422개 통과했다. 실제 운영 DB를 사용하는 후보에서는 17개 조회 경로, 업무 집계, 본인 프로필 저장·원본 복구, 합성 프로젝트와 작업환경 요청 승인 검증이 통과했다. [후보 API 검증](deployment/candidate-api/backend-verification.json)
- r2 Cloud Build가 성공했으며 이미지 digest는 `sha256:5ead578d2949c4f363d5a59e35c1ac754a19c4eac3f576bcf2a15769447a9d31`다. 검토 후보는 0% 트래픽으로 검사하는 절차를 따랐다. 이미지 빌드 성공과 후보 점검은 최종 트래픽 승격을 대신하지 않으며, 최종 결과는 별도 배포 보고서에 기록한다.
- 실제 외부 연계 대상 8종 모두 설정 미등록임을 확인했다. 기관 IdP·플랫폼 자원 생성·CMP 계량 연결 완료로 보고하지 않는다.
