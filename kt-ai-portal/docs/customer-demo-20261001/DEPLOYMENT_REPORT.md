> 최신 배포와 요구사항·UI/UX 미비사항은 [2026-10-03 개선·배포 보고서](../requirements-review-20261003/RELEASE_REPORT.md)와 [종합 검토](../requirements-review-20261003/REQUIREMENTS_GAP_REVIEW.md)를 참고하세요. 아래는 10월 1일 당시의 이력입니다.

# 고객 시연 포털 배포 보고서 — 2026-10-01

이 문서는 이전 소스 개선 보고서와 Kimi 인수인계보다 최신 상태를 기록한다. 사용자의 후속 개발·배포 요청에 따라 동일 작업 환경에서 DB 보정, 추가 구현, 검증과 배포를 수행했다.

**배포 완료.** 2026-10-01 12:56 KST에 [공개 사이트](https://kai-platform-d0ae0.web.app)에 반영했으며, 12:58 KST에 공개 주소 브라우저 검증을 마쳤다. 접근코드는 기존 `demo1234`다. Cloud Run 새 revision 100%, Firebase Hosting 검토 버전과 동일한 콘텐츠임을 확인했다.

## 반영한 내용

- 로그인과 홈의 Aurora·Focus·Orbit·Canvas 4개 디자인 선택을 복구했다. 기존 협의용 접근코드 `demo1234`를 유지했다.
- 상단 소속 선택은 등록된 소속이 1개여도 열리며, 실제 멤버십 안에서만 전환한다. ‘포털 업무’는 실제 권한에 맞는 첫 화면으로 바로 이동한다.
- 운영 DB에서 이전된 업무 원장 4개의 권한 누락을 복구했다. 빈 목록과 조회 실패를 구분하며, 업무 집계가 정상 조회되는 것을 실제 서버에서 확인했다.
- 별도 요구 근거가 없는 실증 전용 화면을 정리하고 일반 프로젝트·작업환경 신청·검토 흐름을 유지했다.
- 군 내부/외부, 신분, 군번/직원번호, 계급/직급, 부대·부서·직책과 외부 기관·군 담당자를 다루는 국방형 프로필을 실제 저장 API에 연결했다.
- 내 프로젝트를 검색 가능한 카드로 개선하고 마이페이지 탐색, 표 가독성, 모바일 넘침을 보완했다.
- 환경설정 변경 이력을 실제 서버 원장에 연결했다. 변경 전후 값·변경자·시각·분류별 조회를 제공하고 현재 설정과 이력의 비밀 값은 서버에서 가린다.
- 샘플 세션과 미연결 플랫폼 수치가 실제 운영 정보로 오인되지 않도록 연결 상태를 명확히 표시한다. 기존 기능 메뉴와 필요한 업무 범위는 유지한다.

화면별 요구사항 유지·수정 근거는 [전수 점검표](RFP_UX_AUDIT.md), [8개 지적 대응 및 사용자층별 첫 화면 표](IMPLEMENTATION_REPORT.md)에 정리했다. 현재 BFF 소스 등록은 [103개](BACKEND_ROUTE_INVENTORY.csv)이며, 등록 수를 외부 서비스 연동 완료 수로 해석하지 않는다.

## DB 변경과 복구 준비

1. 적용 전 `portal` 스키마를 논리 백업하고 별도 PostgreSQL 18 컨테이너에 실제 복원했다. 50개 테이블, 소속 1개, 기존 migration 9개, 감사 기록 117개를 확인했다. Cloud SQL 무료 체험 인스턴스는 관리형 백업 생성이 제한되어, 요금제 변경 없이 복원 검증한 논리 백업을 사용했다.
2. `20261001000001_repair_work_runtime_grants.js`, `20261001000010_user_profile.js`를 `portal_migrator`로 적용했다. 적용 후 업무 테이블 51개의 조회 권한과 프로필 저장·RLS를 확인했다.
3. 기존 `portal_runtime`에 남아 있던 DB/역할 생성 권한과 `cloudsqlsuperuser` 상속을 제거해 저장소의 원래 최소 권한 설계와 맞췄다. 비밀번호, 업무 DML, 기존 객체 소유권과 감사 원장의 정책은 유지했다. 감사 기록 수정·삭제는 계속 금지된다.
4. migration용 임시 Cloud SQL 사용자를 삭제하고 임시 비밀번호 파일을 제거했으며, 임시 Cloud SQL proxy도 종료했다. 기존 운영 DB 계정의 비밀번호는 바꾸지 않았다.

백업은 저장소 밖의 `/Users/choikyubeom/.local/share/kai-portal/backups/20261001-before-release/portal.sql`에 보관한다. 폴더 권한은 700, 파일은 600이다. SHA-256: `c3a2cb88a776e5f1b81c29ab4168420ce37b15d88b7ff826b303f5aadce36ed5`.

증적: [백업 복원](deployment/backup-restore.json), [migration](deployment/migrations.json), [runtime 권한](deployment/runtime-after.json), [임시 계정 정리](deployment/temporary-identity-cleanup.json).

## 검증

| 검사 | 결과 | 범위 |
|---|---:|---|
| 프런트 단위 테스트 | 255 통과 | 42개 스위트 |
| 백엔드 단위 테스트 | 167 통과 | 12개 스위트 |
| 일회성 PostgreSQL 통합 검사 | 132 통과 | 기존 업무 22·도메인 46·runtime/RBAC 52 + 설정 이력 7·최소 권한 5 |
| 로컬 실제 BFF 브라우저 | 15개 그룹 통과 | 6개 권한, 허용된 복수 소속, 프로필 저장, 신청·승인, 모바일 |
| 운영 DB를 사용하는 후보 API | 7개 그룹 통과 | 인증·17개 조회 경로·집계·타 소속 거부·프로필 저장/복원·프로젝트 신청/승인 |
| 최종 r2 후보 API | 5개 읽기 점검 그룹 통과 | 동일 업무 데이터, 새 revision 인증·조회·경계 재검증 |
| 최종 후보 브라우저 | 44/44 통과 | 데스크톱·모바일, 실제 후보 API 410건 |
| 최종 공개 브라우저 | 44/44 통과 | 공개 Hosting 및 BFF 직접 연결, API 410건, 서버/JS/네트워크 오류 0 |
| 최종 공개 API | 7개 그룹 통과 | 실제 인증·조회·경계 검사, 프로필 저장/복원, 동일 시연 프로젝트/승인 상태 재확인 |
| 타입·빌드·lint | 통과 | lint 오류 0, 기존 경고 app 24/backend 5 |

실제 서버 쓰기 검증으로 `[시연] 군수 데이터 분석` 프로젝트 1개와 작업환경 요청 1개를 생성하고 포털에서 승인했다. 기존 사용자 프로필은 임시 합성 값 저장을 확인한 뒤 원래 값으로 복원했다. 외부 GPU/VDI 등의 자원은 생성하지 않았다.

- 프로젝트 ID: `668387e3-268b-42e0-9586-ceb064a2c450`
- 작업환경 요청 ID: `e61de1fc-338f-4655-800c-c9fdca7f81f4`

현재 시연 계정의 소속은 국방부 공통 1개, 역할은 기존 포털 관리자다. 운영 계정에 다른 소속이나 보안 담당자 권한을 임의로 추가하지 않았다. 미개설 개인 크레딧 계정의 404와 권한 경계 시험의 401/403은 정상 응답으로 구분했다.

공개 브라우저 점검은 API를 후보 URL로 우회하거나 성공 응답으로 대체하지 않았다. 검증 범위는 로그인 4개 진입 선택, 홈 4개 디자인, 실제 소속 콤보, 권한별 업무 직접 진입, 허용된 15개 화면, 국방 프로필 내부/외부 전환, 활성 세션 안내, 내 프로젝트, 설정 이력, 390px 모바일 화면이다. 브라우저의 개인정보 입력과 표 본문은 캡처에서 가렸으며 실제 서비스에 표시되는 색상이나 레이아웃은 아니다. 서버 권한별 6개 계정 검사는 분리된 로컬 실제 BFF/DB 환경에서 수행했다.

증적: [공개 브라우저 44개](deployment/live/browser-report.json), [공개 API 7개 그룹](deployment/live-api/backend-verification.json), [후보 브라우저](deployment/candidate-r2-final/browser-report.json), [단위·통합 검증](VALIDATION.md), [배포 후 오류 로그 점검](deployment/operational-checks.json).

후보 점검에서 발견한 두 문제도 전환 전에 처리했다. 기존 Hosting과 Cloud Run에 저장된 협의용 접근코드가 달라 빌드와 새 revision을 기존 공개 코드로 일치시켰다. 프로필 전환 검사는 닫히는 MUI 메뉴와 선택 컨트롤을 중복으로 찾는 테스트 문제였으며, 고유 선택자를 사용해 군 내부/외부 전환을 다시 확인했다.

## 배포 및 되돌리기

- Cloud Build: `b0e6c30b-d8cb-4a1d-99b8-ea66a89a18a4` 성공.
- 대상 revision: `kt-ai-portal-demo-customer-20261001-r2`.
- 이미지 digest: `sha256:5ead578d2949c4f363d5a59e35c1ac754a19c4eac3f576bcf2a15769447a9d31`.
- 기존 revision: `kt-ai-portal-demo-p1rev5`.
- 기존 Hosting version: `sites/kai-platform-d0ae0/versions/9b9082bc2b364f54`.
- 공개 Hosting version: `sites/kai-platform-d0ae0/versions/5d0a87ebbadf6fe7`.
- 공개 Hosting release: `1790826995494000` / `2026-10-01T03:56:35.494Z`.

후보는 운영 트래픽 0%로 검증한 뒤 정확한 r2 revision을 100%로 승격했다. Hosting은 검증한 preview 채널을 live 채널로 복제해 741개 파일의 동일한 버전을 공개했다. 기존 DB Secret 연결과 Cloud SQL mount, 최소 1/최대 20 인스턴스 설정을 보존했다. [최종 배포 상태](deployment/release-state.json)에 실제 조회 결과를 기록했다.

장애 시 기존 revision으로 트래픽을 돌리고 필요하면 위 기존 Hosting version을 재릴리스한다. 이번 DB 변경은 이전 revision과 호환되므로 ACL을 회수하거나 프로필 테이블을 삭제하는 역 migration은 하지 않는다. Cloud Run 복귀 명령은 다음과 같다. 현재는 새 버전으로 정상 서비스 중이며 아래 명령을 실행하지 않았다.

```sh
.gcloud/google-cloud-sdk/bin/gcloud run services update-traffic kt-ai-portal-demo \
  --project=kai-platform-d0ae0 --region=asia-northeast3 \
  --to-revisions=kt-ai-portal-demo-p1rev5=100 --quiet
```

## 실제 외부 연계의 남은 조건

기관 IdP와 AI·데이터·클라우드·VDI의 실제 주소·명세·자격 증명은 현재 환경에 등록되어 있지 않다. 따라서 다른 기기의 세션 조회/강제 종료, 실제 제로트러스트 인증, 자원 생성·사용량·쿼터 수집, 이메일 인증·비밀번호 변경·알림 전송 등을 완료했다고 판정하지 않는다. 개발 관리자 화면의 8개 연결 대상도 미설정 상태로 확인했다.

포털의 원장 저장·조회·검토와 외부 시스템 실행은 구분된다. 담당 서비스의 계약과 연결 정보가 제공되면 기존 권한·소속 격리·감사 체계 안에서 후속 왕복 시험을 진행할 수 있다. 필요한 정보는 [연계 준비 상태](INTEGRATION_STATUS.md)에 정리했다.
