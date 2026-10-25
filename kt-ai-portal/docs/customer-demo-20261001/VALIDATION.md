# 검증 결과 — 2026-10-01

초기 소스 수정·로컬 검증에 이어 사용자가 후속 구현과 배포를 승인했다. 신규 migration 2개 적용, 실제 runtime 권한 검사, Cloud Run r2 100% 트래픽 승격 및 Firebase Hosting 공개 배포를 완료했다(2026-10-01 03:56:35 UTC / 12:56:35 KST). 최신 revision·배포 및 복구 정보는 [DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md)를 따른다.

## 범위와 결과

| 검사 | 결과 | 확인 범위 |
|---|---:|---|
| 프런트 단위 | 42 suites / **255 통과** | 국방 프로필, 내 프로젝트, 세션 경계, 테넌트 선택, 역할 첫 화면, 집계, 작업환경·설정 이력 검증 등 |
| 백엔드 단위 | 12 suites / **167 통과** | 프로필·프로젝트·크레딧·반출·K-RMF·카탈로그·제안·권한·설정과 서버 민감값 보호 |
| PostgreSQL 업무 API | **22 통과** | 이동 원장 ACL 누락 재현·복구, 부분 실패, 전체 실패 503, FORCE RLS, 교차 테넌트, 실제 총건수, 승인·반려 |
| PostgreSQL 도메인 API | **46 통과** | 현재 migration 11개, 주요 업무의 등록·수정·검토·승인·취소·검색·감사 |
| PostgreSQL runtime/RBAC | **52 통과** | 신원·멤버십·실제 권한·테넌트 경계, 관리자 회수·마지막 활성 관리자 보호 |
| PostgreSQL 설정 이력 | **7 통과** | 실제 저장·전후 값, 권한·테넌트 격리, 버전 충돌 시 미기록, 민감값 비노출, 페이지·입력 범위 |
| PostgreSQL runtime 역할 방어 | **5 통과** | 직접·간접 관리 권한, 객체 소유권 접근, 최소 권한 복구 후 업무·감사 정책 |
| Playwright 실제 BFF 통합 | **15 시나리오 그룹 통과** | 4개 홈, 주요 페이지, 6개 역할, 소속 전환, 실제 프로필 저장, 신청→승인, 모바일 |
| 배포 후보 Playwright | **44/44 통과** | 실제 후보 백엔드에 410개 API 요청, 서버·페이지 JavaScript·네트워크 오류 0 |
| 공개 사이트 실제 API | **7개 검증 그룹 통과** | 실제 인증·17개 조회 경로·집계·테넌트 경계·프로필 저장 후 원복·기존 시연 프로젝트 요청 승인 |
| 공개 사이트 Playwright | **44/44 통과** | Firebase 공개 URL·실제 BFF의 데스크톱·모바일 검사, API 410개, 서버·JavaScript·네트워크 오류 및 차단 쓰기 0 |
| 타입 검사 | 통과 | `yarn tsc --noEmit` |
| 프런트·백엔드 빌드 | 통과 | 실행 가능한 로컬 고객 검토 프런트 및 backend bundle |
| lint | 오류 **0** | app 기존 문법 경고 24 / backend 익명 함수 경고 5 잔존 |
| diff 공백 검사 | 통과 | `git diff --check` |

현재 합계는 **단위 422개 + PostgreSQL 132개**다. PostgreSQL은 기존 업무·도메인·RBAC 120개에 설정 이력 7개와 역할 방어 5개를 추가한 결과다. 초기 로컬 결과는 단위 414개(프런트 250·백엔드 164), PostgreSQL 120개, 브라우저 15개 그룹이었으며 `evidence`의 당시 기록을 보존한다. 후속 전체 단위 검사 결과는 `deployment/app-tests.txt`, `deployment/backend-tests.txt`에 있다.

브라우저 그룹·개별 화면 검사·API 요청은 서로 다른 측정 단위여서 합산하지 않는다. 현재 전수 정적 목록은 18개 경로/103개 등록 BFF이며, 이 숫자를 전부 운영 실동작 검증했다는 뜻으로 사용하지 않는다.

## 초기 로컬 브라우저 조건

- 실제 프런트 빌드, 실제 BFF router, 전체 migration을 적용한 폐기형 로컬 PostgreSQL을 사용했다. API 성공 응답을 Playwright로 가로채지 않았다.
- 인증 제공자만 로컬 fixture다. 테스트 서버는 loopback에만 바인딩하고 운영 서버에 배포하지 않는다.
- runtime DB 계정은 `NOSUPERUSER`, `NOBYPASSRLS`; 운영 DB와 다른 임시 DB·역할을 만들고 종료 시 제거했다.
- 데스크톱 1440×1000, 모바일 390×844. 일반·프로젝트관리·군별관리·보안담당·감사·포털관리 6개 권한을 실제 서버 멤버십으로 검증했다.
- 디자인 전환·4개 플랫폼 카드, 15개 허용 기능 페이지의 렌더링·요구사항 ID/실증 전용 UI 노출 여부, 정상 표 머리글 스타일, 페이지 수평 넘침을 검사했다.
- 프로필 저장 후 새로고침, 외부 사용자 전환과 군 필드 제거, 버전 충돌 409, 위조 필드 422, 다른 소속 403을 확인했다.
- 일반 사용자의 프로젝트 카드/개인 활동을 실제 API에서 확인했다. 작업환경 신청을 화면에서 접수하고 별도 관리자 화면에서 승인한 뒤 원장 상태를 재조회했다.
- 모바일은 프로필·프로젝트·세션·업무·크레딧·관리자·K-RMF를 확인했다. 표가 넓으면 카드 내부에서 스크롤하고 페이지 자체는 수평으로 넘치지 않는다.
- uncaught 페이지 JavaScript 오류 0, 테스트 BFF 내부 오류 로그 0. 의도적으로 검증한 403/409/422는 예상 거부 응답이다.

## 배포 후 검증 조건

- 배포 후보와 공개 사이트 검증은 실제 인증 제공 경로·BFF·Cloud SQL을 사용했다. 로컬 테스트 인증 서버를 배포하지 않았다.
- 최종 공개 검증은 Firebase Hosting과 실제 BFF를 직접 사용했으며 후보 API로 우회하지 않았다. 44개 검사와 410개 API 요청을 확인했고 서버 오류·페이지 JavaScript 오류·네트워크 실패·차단된 쓰기 모두 0이었다. [공개 검증 원본](deployment/live/browser-report.json)
- 실제 계정의 소속은 국방부 공통 1개다. 접근 가능한 멤버십만 표시하며, 소속을 추가하거나 역할 미리보기로 권한을 우회하지 않았다.
- 합성 일반 프로젝트 `[시연] 군수 데이터 분석` 1개와 작업환경 요청 1개를 등록하고 승인 상태를 확인했다. 공개 URL 재검증은 기존 시연 항목을 재사용했다. 프로필 저장 검사는 기존 값을 복구했으며 외부 자원은 생성하지 않았다.
- 배포 후보 최종 검사 결과는 [candidate-r2-final/browser-report.json](deployment/candidate-r2-final/browser-report.json), 공개 사이트 결과는 [live/browser-report.json](deployment/live/browser-report.json)에 보존한다. 초기 후보 검사 중 발견한 설정 차이·검사 스크립트 보완 이력과 최종 성공 결과를 구분한다.

## 재현 명령

루트 기준으로 실행한다. 로컬 PostgreSQL 개발 환경과 설치된 Playwright Chromium이 필요하다. 테스트 스크립트에 설정된 로컬 개발 DB 접속과 데이터베이스 생성 권한을 확인한다. 운영 DB에 테스트 스크립트를 연결하지 않는다.

```sh
cd backstage-portal
yarn workspace app test --watchAll=false --runInBand
yarn workspace backend test --watchAll=false --runInBand
yarn tsc --noEmit
yarn workspace app lint
yarn workspace backend lint
yarn workspace app build --config ../../app-config.yaml --config ../../app-config.customer-review.yaml
yarn workspace backend build --skip-build-dependencies
cd ..
node scripts/test-portal-work-api.mjs
node scripts/test-portal-domains.mjs
node scripts/test-portal-runtime.mjs
node scripts/test-portal-settings-history.mjs
node scripts/test-runtime-role-guard.mjs
node scripts/test-customer-demo.mjs
```

고객 사이트에는 위 로컬 검토 빌드가 아니라 운영 설정으로 다시 빌드한 산출물을 배포했다. 재배포 절차와 실제 적용 결과는 [배포 보고서](DEPLOYMENT_REPORT.md)를 기준으로 한다. [기존 인수인계](KIMI_HANDOFF.md)는 이번 후속 작업을 시작할 때의 계획 기록이다.

## 실행 증적

- [브라우저 검증 결과 JSON](evidence/customer-browser-tests.json)
- [단위·빌드 요약](evidence/unit-build-summary.txt)
- [업무 API 22개](evidence/work-api-tests.txt)
- [도메인 API 46개](evidence/domain-api-tests.txt)
- [runtime/RBAC 52개](evidence/portal-runtime-rbac-tests.txt)
- [프런트 lint](evidence/app-lint.txt), [백엔드 lint](evidence/backend-lint.txt)
- [수정 전 운영 읽기 전용 조사](evidence/live-readonly-audit.json)
- [최종 화면 갤러리](review.html)
- [후속 프런트 단위 255개](deployment/app-tests.txt), [후속 백엔드 단위 167개](deployment/backend-tests.txt)
- [설정 이력 PostgreSQL 7개](evidence/settings-history-api-tests.txt)
- [운영 migration 적용](deployment/migrations.json), [runtime 권한 검사](deployment/runtime-after.json), [백업 실복원](deployment/backup-restore.json)
- [배포 후보 최종 브라우저 검사](deployment/candidate-r2-final/browser-report.json)
- [공개 사이트 실제 API 검사](deployment/live-api/backend-verification.json), [공개 사이트 브라우저 검사](deployment/live/browser-report.json)
- [최종 배포 상태](deployment/release-state.json): r2 트래픽 100%, minInstance 1 / maxInstance 20 및 기존 DB secret·mount·환경 설정 유지 확인

## 검증하지 않은 범위

운영 DB migration·Cloud Run·Firebase 배포와 실제 인증 API 재검증을 수행했다. 다만 기관 IdP 세션 강제 종료, 외부 GPU/VDI 생성, 실제 플랫폼 자원 계량, 알림 전송은 외부 연결 정보가 없어 연결 완료로 판정하지 않았다. 실제 연계 대상 8종은 모두 `configured=false`다. 화면상의 연결 준비 상태는 현재 구현 경계를 드러낸 것이며, 지정된 실제 플랫폼 연결 정보가 마련되면 해당 서비스와 왕복 검증해야 한다. 필요한 계약은 [INTEGRATION_STATUS.md](INTEGRATION_STATUS.md)에 정리했다.
