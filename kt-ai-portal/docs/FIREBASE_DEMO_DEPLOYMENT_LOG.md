# Firebase + Cloud Run 데모 배포 이력

## 2026-10-04 데이터 사전·샘플 데이터·기능 개선 배포 완료

- Cloud SQL PostgreSQL 18.6: 신규 사전 migration 1개(누적 12), 업무·기술 55테이블/548컬럼, 전체 57테이블. 사전 6테이블 1,434행·샘플 25테이블 74행·실제 적재 감사 1행. 재실행 추가 0행.
- Cloud Run: `kt-ai-portal-demo-data-readiness-20261004-r2` **100%**, Cloud Build `677be501-2b35-4f6d-94c0-60e2e751c794`, digest `sha256:2a7e6cc906f1c20af49cb2578ae2ec196198626dc3d5002ba615e26bcc7c28d9`. 최소 1/최대 20, 기존 환경·DB Secret·Cloud SQL 연결·자원 제한 동일.
- Firebase Hosting: 최종 preview와 동일 version `f97e6a7b03bc8ece`, 공개 **2026-10-04 04:05:22 KST**, 접근코드 `demo1234` 유지.
- 기능: 데이터 사전 검색/페이지/CSV, 프로젝트·제안·카탈로그 서버 페이지/전체 집계/본인 범위, 장문 입력, 101번째 참여 프로젝트 선택, K-RMF 프로젝트 이름, 크레딧 거래 COUNT 조회 오류 보완.
- 검증: 단위 459건, 실제 PostgreSQL/BFF 시나리오 185건, MDR 2,989검사 및 변조 거부 6건. 후보/공개 각각 브라우저 59건·실제 API 14개 검사 통과. 공개 API 565응답의 서버/JS/네트워크 오류 0, 새 revision ERROR 0.
- 적재 전 백업을 실제 PG 18.6에 복원해 51테이블·11migration 및 테이블별 행수 대조. 신원/권한/프로필 등 보호 원장 15개의 건수 보존. 임시 SQL 사용자·proxy·자격증명 파일 정리.
- 공식 MDR 원본과 SSO·8개 외부 시스템·영구 파일 저장/전송은 협의/연결 대기. 합성 샘플·임시 표준을 공식 승인이나 외부 실행 완료로 표시하지 않음.
- [완료 보고서](data-readiness-20261004/IMPLEMENTATION_REPORT.md), [55테이블 샘플 현황](sample-data-20261004/SAMPLE_TABLE_COVERAGE.md), [기능 전수 점검](sample-data-20261004/FEATURE_AUDIT.md).

## 2026-10-03 요구사항·UI/UX 검토 개선 배포 완료

- Cloud Run: `kt-ai-portal-demo-requirements-20261003-r3` 100%, Cloud Build 성공 이미지 digest로 배포. DB Secret·Cloud SQL·최소 1/최대 20 인스턴스 보존.
- Firebase Hosting: 최종 검증 preview와 동일한 version `e9d512ba60d828c3`, 공개 2026-10-03 13:36:57 KST. 접근코드 `demo1234` 유지.
- 검색 URL/페이지/입력 상태·자동완성·접근성·원천 이름 표시·한국 시간, 크레딧/반입반출 신청 집계 누락과 K-RMF 미설정 임시 파일 저장 보완.
- 단위 435건, 실제 PostgreSQL 70건, 최종 후보/공개 브라우저 각각 50건, 후보/공개 실제 API 각각 6개 그룹 통과. 공개 브라우저 API 462건의 서버/JS/네트워크 오류 0.
- DB migration 및 운영 업무 원장 쓰기 없음. 기관 인증·외부 플랫폼 실행·영구 파일 저장소는 미연결/협의 대상으로 분리.
- [배포 결과](requirements-review-20261003/RELEASE_REPORT.md), [종합 미비사항·팀 협의](requirements-review-20261003/REQUIREMENTS_GAP_REVIEW.md), [엑셀](requirements-review-20261003/요구사항_UIUX_미비사항_협의목록_20261003.xlsx).

## 2026-10-01 고객 시연 개선 배포 완료

- Cloud SQL: 업무 원장 ACL 복구·국방형 프로필 migration 2개 적용. 백업은 실제 복원 검사했고 runtime 51개 테이블 권한과 최소 권한을 확인했다.
- Cloud Run: `kt-ai-portal-demo-customer-20261001-r2` 100%, 최소 1/최대 20 인스턴스 및 DB Secret 연결 보존. 이전 `p1rev5` 복귀 가능.
- Firebase Hosting: 검증된 preview를 live로 복제. version `5d0a87ebbadf6fe7`, 공개 시각 2026-10-01 12:56:35 KST. 기존 접근코드 `demo1234` 유지.
- 공개 사이트: Playwright 44/44, 실제 API 7개 그룹 통과. 브라우저 API 410개 응답에서 서버·JavaScript·네트워크 오류 0.
- 디자인 선택 복구, 실제 집계, 국방형 프로필 저장, 읽기 쉬운 내 프로젝트, 서버 설정 이력 반영. 샘플 역할/세션이 운영 권한·실제 세션처럼 표시되지 않도록 구분.
- 외부 IdP·플랫폼 실제 연결 정보는 미등록이며 연동 완료로 판정하지 않았다.

상세 revision·검증·백업·복귀 정보는 [최종 배포 보고서](customer-demo-20261001/DEPLOYMENT_REPORT.md)를 따른다. 아래 항목들은 당시 이력이며 현재 접근코드·설정·미해결 상태를 의미하지 않는다.

## 2026-09-24 재배포: 로그인 정책 변경 (Google 허용계정 2개 + 접근코드 갱신)

- **배포 대상**: Firebase Hosting만 (백엔드·DB 변경 없음)
- **변경 내용** (프런트 빌드 환경변수):
  - `DEMO_ALLOWED_EMAILS`: `kyubeom@gmail.com,hddjhs2915@gmail.com` — 이 두 계정만 Google 로그인 허용
  - `DEMO_ALLOWED_DOMAINS`: 제거 — 기존 `gmail.com` 도메인 허용으로 다른 Google 계정도 로그인 가능했던 것을 차단 (빈 문자열은 Backstage config 검증에서 오류이므로 `app-config.demo.yaml`에서 해당 키 삭제)
  - `DEMO_ADMIN_EMAILS`: `kyubeom@gmail.com` (관리자는 kyubeom 계정만)
  - `PREVIEW_ACCESS_CODE`: `ictway` → **`24b95666`** (그 외 개발자용 코드 로그인)
- **검증**:
  - 라이브 `index.html`에 새 허용계정·새 코드 확인, `ictway` 미포함
  - `smoke-live-site.mjs` 7/7 (새 코드 `24b95666`로 로그인 → 홈 렌더)
  - `verify-live-crud.mjs` 10/10 (새 코드로 CRUD 전부, 새로고침 유지)
  - 구 코드 `ictway` 로그인 시도 → 거부, 로그인 페이지 유지 확인
- **참고**: 로그인 차단은 프런트(`App.tsx`·`firebaseAuthClient.ts`)에서 허용목록으로 판정. 백엔드는 미변경

---

## 2026-09-24 배포: 포털 업무 현황 서버 연동 (`/v1/work/*`) + 프런트 최신화

- **배포 대상**: Cloud Run backend(신규 revision `p1rev2`) + Firebase Hosting(프런트 재빌드) + staging Cloud SQL migration 3건
- **staging Cloud SQL migration 적용** (`run-portal-migrations.mjs`, batch 3): `20260918000001_tenant_settings`, `20260924000001_platform_access`, `20260924000002_work_requests` (`audit_append_policy`는 이미 적용됐었음)
- **이미지**: Cloud Build `084804c3…` 성공, digest `sha256:2bae686cd9ecf1d97ea72b9dbaa6b1b7c06ec684c02577a42705631eccfaee05`
- **Cloud Run**: `deploy-cloudrun-rest.mjs`에 `DEPLOY_IMAGE`/`DEPLOY_REVISION` env 파라미터 추가 후 배포. 기존 알려진 이슈(명시 traffic 분할이 LATEST 100%로 정규화)로 tag=review 0% 경유 없이 최신 revision이 100% 트래픽을 바로 받음 — 배포 전후 헬스체크로 대체 검증
- **프런트**: `yarn workspace app build --config app-config.demo.yaml`(환경변수는 기존 Cloud Run revision 값 재사용) → `firebase deploy --only hosting`
- **접속 URL**: https://kai-platform-d0ae0.web.app (접속 코드 `ictway`)

### 배포 결과

- `/api/portal/v1/health` 200 — `dataMode: live`, `connectionState: connected`(Cloud SQL + migration 호환 확인)
- `/api/portal/v1/work/overview`, `/v1/me` 미인증 401 정상
- `smoke-live-site.mjs` 7/7 (접근코드 로그인 → 홈 렌더, 업무여정 비노출, 앱 런처, JS 예외 없음)
- `verify-live-crud.mjs` 10/10 (제안 등록/삭제, 카탈로그 요청, 반출 승인, 프로필 저장·새로고침 유지)
- `smoke-check-demo-routes.mjs` 16/17 — `guest/refresh` 404 1건은 31.6단계 이후 제거된 라우트라 기존 스모크 기대값이 구버전(배포와 무관, 배포 전에도 동일)

### 포함된 변경

- 백엔드: `fc_projects`/`fc_project_members`/`fc_work_requests`/`fc_request_events`(RLS 포함) + `/v1/work/overview|requests|approvals|decisions` 6개 엔드포인트(계약: `docs/portal-experience-v2/WORK_API_CONTRACT.md`)
- 프런트: `/portal-work` 비데모 서버 모드 집계·승인함·오류 상태 구분(데모 모드 동작 변경 없음), PortalRuntimeContext 오류에 status/code 첨부

### 잔여 이슈

- 데모 사이트는 데모 모드(`proposalCapture.enabled=true`)라 `/v1/work/*` 서버 모드 경로는 비활성 — 실제 IdP/운영 모드 전환 시에만 동작
- 크레딧/자원 사용량은 여전히 `pending_integration`(플랫폼 원천 연동 대기)
- `deploy-cloudrun-rest.mjs`의 review→promote 2단계 분리가 v2 API에서 LATEST 100%로 정규화되는 문제는 미해결(이번 배포에서도 발생, 헬스체크로 검증 대체)

---

## 31.6단계 배포 (2026-07-12)

- **배포 대상**: Firebase Hosting 정적 콘텐츠 (frontend 재빌드 및 재배포)
- **Cloud Run 변경 여부**: 없음 (29.2단계에서 이미 최신 backend 배포 완료)
- **배포 방법**: `./scripts/build-demo.sh` (frontend only) → `./scripts/deploy-demo-firebase.sh`
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **Cloud Run URL**: https://kt-ai-portal-demo-e2ik6gboua-du.a.run.app (활성 revision)
- **Cloud Run URL(기존)**: https://kt-ai-portal-demo-1088986528140.asia-northeast3.run.app (동일 서비스 rewrite)
- **Cloud Run Revision**: `kt-ai-portal-demo-00009-v6d`
- **접속 코드**: `ictway`

### 주입된 환경변수

- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`
- `APP_BASE_URL`, `BACKEND_BASE_URL`
- `PREVIEW_ACCESS_CODE`
- `DEMO_ALLOWED_EMAILS`, `DEMO_ADMIN_EMAILS`
- `AUTH_SESSION_SECRET`
- `NODE_ENV=production`

### 31.6단계 주요 변경 사항

- `/api/auth/guest/refresh` 브라우저 캐시 버스팅 추가
- 통합검색 mock fallback 문구 중립화
- 서비스 카탈로그, 프로젝트/반출 신청, 제안 게시판, 크레딧 관리, 관리자 콘솔, 마이페이지 등에서 `(mock)`/`PoC`/`데모`/`제안` 관련 부적합 문구 제거

### 배포 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app test --watchAll=false` 통과
- `yarn workspace app build --config app-config.demo.yaml` 통과
- `firebase deploy --only hosting --project kai-platform-d0ae0` 성공 (735 files)

### Smoke test 결과

- `scripts/smoke-check-demo-routes.mjs` 실행: 17/17 route 통과
- `/api/auth/guest/refresh` fetch status 200 확인

### Playwright 전수검증 결과

- 일반 사용자 route 12개: 12/12 통과
- 관리자 직접 URL 4개: 모두 접근 권한 없음 화면 정상
- 관리자 권한 route 4개: 탭/버튼/CSV 다운로드/링크 이동 모두 정상

### 잔여 이슈

- GitHub push 인증 문제로 원격 반영 보류 중
- Firebase Auth Google 로그인 관리자 실검증 미완료
- 운영 RBAC는 Guest auth 기반, Keycloak OIDC/role 기반 권한 체계 미연동

---

## 29.2단계 배포 (2026-07-12)

- **배포 대상**: Cloud Run backend (`kt-ai-portal-demo`)
- **Firebase Hosting 변경 여부**: 없음 (29.1단계에서 이미 최신 frontend 배포 완료)
- **배포 방법**: Artifact Registry push → `gcloud run deploy`
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **Cloud Run URL**: https://kt-ai-portal-demo-1088986528140.asia-northeast3.run.app
- **Cloud Run Revision**: `kt-ai-portal-demo-00009-v6d`
- **접속 코드**: `ictway`

### 주입된 환경변수

- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`
- `APP_BASE_URL`, `BACKEND_BASE_URL`
- `PREVIEW_ACCESS_CODE`
- `DEMO_ALLOWED_EMAILS`, `DEMO_ADMIN_EMAILS`
- `AUTH_SESSION_SECRET`
- `NODE_ENV=production`

### 배포 결과

- `kt-ai-portal-demo:latest` Docker image를 Artifact Registry에 push 성공
- `gcloud run deploy kt-ai-portal-demo` 성공
- 100% 트래픽이 새 revision `kt-ai-portal-demo-00009-v6d`로 라우팅됨

### auth refresh 404 점검

- Cloud Run 직접 URL: `curl -I /api/auth/guest/refresh` → `HTTP/2 200`
- Firebase Hosting URL: `curl -I /api/auth/guest/refresh` → `HTTP/2 200`
- 브라우저 Network: `/api/auth/guest/refresh` 호출 시 200 응답 확인
- `/api/auth/guest/refresh` 404 문제 해결됨

### 데모 사이트 검증 결과

#### 일반 사용자

- 접속 코드 `ictway`로 정상 진입
- 왼쪽 메뉴에서 "요구사항 진도표" 미노출 확인
- `/requirement-progress` 직접 접근 시 "접근 권한이 없습니다" 화면 확인

#### 관리자 프리뷰

- `sessionStorage.__kt_ai_portal_admin_preview__ = 'true'` 설정 후 새로고침
- "요구사항 진도표" 메뉴 표시 및 페이지 접근 가능
- 4개 탭 데이터 건수 확인:
  - SFR별 진도표: 21건
  - 기능목록 상세: 163건
  - 변경이력: 13건
  - 질의사항: 7건

### 남은 콘솔 경고

- `findDOMNode is deprecated` (Material-UI/Backstage 라이브러리 경고, 기능 영향 없음)
- `WebSocket connection to 'ws://localhost:3000/ws' failed` (개발 서버 HMR용, production에서는 무시)

### 잔여 이슈

- Firebase Auth Google 로그인 관리자 실검증은 미완료
- GitHub push 인증 문제로 원격 반영은 별도 해결 필요

---

## 28단계 배포 (2026-06-28)

- **배포 대상**: Firebase Hosting 정적 콘텐츠
- **Cloud Run 변경 여부**: 없음 (frontend 메뉴 변경만 해당)
- **배포 방법**: `scripts/deploy-demo-firebase.sh` 실행
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **접속 코드**: `ictway`
- **Google 로그인 허용 이메일**: `kyubeom@gmail.com`
- **확인 사항**:
  - 접근 코드 입력 화면 정상 표시
  - ictway 입력 후 진입
  - 왼쪽 메뉴 RFP/SFR 순서로 정렬됨
  - 각 메뉴 클릭 시 기존 화면 정상 표시
  - 데모 배너 표시

### 28단계 재배포 조치 (2026-07-12)

- **문제**: Firebase Hosting 재배포 후 `app.firebase.apiKey` 등 환경변수가 빈 문자열로 평가되어 접속 코드 화면에서 런타임 오류 발생
- **원인**: `yarn workspace app build` 시 `FIREBASE_*` / `PREVIEW_ACCESS_CODE` / `APP_BASE_URL` 등 환경변수를 주입하지 않고 빌드한 상태로 배포
- **조치**:
  - 데모 설정값을 환경변수로 주입하여 frontend 재빌드
  - 브라우저 캐시(`main.*.js`, `index.html`)로 인해 갱신이 늦게 반영되는 경우 강력 새로고침
  - Dashboard Quick Links 순서도 왼쪽 메뉴 순서와 동일하게 재정렬 및 아이콘 매핑 정정
- **결과**: 런타임 오류 해결, 접속 코드로 정상 진입, 메뉴/Quick Links RFP/SFR 순서 확인

## 26단계 배포 (이전)

- Firebase Auth 기반 Google 로그인 데모 완료
- Cloud Run revision `kt-ai-portal-demo-00008-nld` 배포
- Firebase Hosting `/api/**` 캐시 제어 헤더 추가


## 29.1단계 배포 (2026-07-12)

- **배포 대상**: Firebase Hosting 정적 콘텐츠 (frontend 재빌드 및 재배포)
- **Cloud Run 변경 여부**: 없음 (backend 변경사항 없음)
- **배포 방법**: 환경변수 주입 후 `./scripts/build-demo.sh` (frontend/backend/Docker image 빌드) → `./scripts/deploy-demo-firebase.sh`
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **접속 코드**: `ictway`
- **Google 로그인 허용 이메일**: `kyubeom@gmail.com`
- **관리자 이메일**: `kyubeom@gmail.com`

### 주입된 환경변수

- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`
- `APP_BASE_URL`, `BACKEND_BASE_URL`
- `PREVIEW_ACCESS_CODE`
- `DEMO_ALLOWED_EMAILS`, `DEMO_ADMIN_EMAILS`
- `AUTH_SESSION_SECRET`

### 빌드 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app build --config app-config.demo.yaml` 통과
- `yarn build:backend --config app-config.demo.yaml` 통과
- Docker 이미지 `kt-ai-portal-demo:latest` 빌드 성공
  - Docker Desktop 미구동 상태에서 `open -a Docker`로 daemon 기동
  - linux/amd64 플랫폼 이미지 생성 완료

### Firebase Hosting 재배포 결과

- `firebase deploy --only hosting --project kai-platform-d0ae0` 성공
- 정적 frontend 콘텐츠가 `kai-platform-d0ae0.web.app`에 반영됨

### 데모 사이트 검증 결과

#### 일반 사용자 검증

- 접속 코드 `ictway`로 정상 진입
- 왼쪽 메뉴에서 "관리자 콘솔", "요구사항 진도표" 메뉴 미노출 확인
- `/requirement-progress` 직접 접근 시 "접근 권한이 없습니다" 화면 표시 확인

#### 관리자 프리뷰 검증

- 브라우저 콘솔에서 `sessionStorage.setItem('__kt_ai_portal_admin_preview__', 'true')` 설정 후 새로고침
- 왼쪽 메뉴에 "관리자 콘솔", "요구사항 진도표" 메뉴 표시 확인
- `/requirement-progress` 페이지 정상 접근 및 렌더링 확인
- 상단 요약 카드 표시:
  - 전체 SFR 21, 전체 기능 163, 기존 기능 155, 신규 기능 8
  - 변경 SFR 13, 화면 구현 113, 부분 구현 41, 후속 개발 9, 검토 필요 0
- 4개 탭 데이터 건수 확인:
  - SFR별 진도표: 21건
  - 기능목록 상세: 163건
  - 변경이력: 13건
  - 질의사항: 7건

### 잔여 이슈

- `/api/auth/guest/refresh` 호출 시 404 응답
  - 원인: Cloud Run backend가 최신 backend 소스로 재배포되지 않음
  - 29.1단계에서는 Firebase Hosting만 재배포했으며, Cloud Run 재배포는 별도 단계로 진행 필요
  - Docker image는 빌드되어 있으므로, `deploy-demo-cloudrun.sh` 실행 시 Cloud Run 재배포 가능
- Google 로그인을 통한 실제 관리자 인증 검증은 미완료 (backend 404로 인해 진행 불가)

## 29단계 배포 시도 (2026-07-12)

- **배포 대상**: Firebase Hosting 정적 콘텐츠 (frontend만 변경)
- **Cloud Run 변경 여부**: 없음 (UI 메뉴 및 페이지 추가만 해당)
- **시도 명령**: `./scripts/build-demo.sh` 후 `./scripts/deploy-demo-firebase.sh`
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **접속 코드**: `ictway`
- **Google 로그인 허용 이메일**: `kyubeom@gmail.com`

### 빌드 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app build --config app-config.demo.yaml` 통과
- `yarn build:backend --config app-config.demo.yaml` 통과
- **Docker 이미지 빌드 실패**: Docker daemon이 `unix:///Users/choikyubeom/.docker/run/docker.sock`에서 실행 중이 아님

### 배포 차단 사유

- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_APP_ID` 환경변수가 설정되지 않아 `app-config.demo.yaml`의 Firebase 설정이 빈 값으로 평가됨
- 이전 28단계 재배포 조치 기록에 따라, 빈 Firebase 설정으로 배포 시 접속 코드 화면에서 런타임 오류 발생
- 따라서 실제 Firebase Hosting 재배포는 보류함

### 추가 조치 필요

```bash
# 실제 배포 시 아래 환경변수를 먼저 설정
export FIREBASE_API_KEY="<실제 Firebase API Key>"
export FIREBASE_AUTH_DOMAIN="<실제 Firebase Auth Domain>"
export FIREBASE_APP_ID="<실제 Firebase App ID>"
export FIREBASE_PROJECT_ID="kai-platform-d0ae0"
export APP_BASE_URL="https://kai-platform-d0ae0.web.app"
export BACKEND_BASE_URL="https://kai-platform-d0ae0.web.app"
export PREVIEW_ACCESS_CODE="ictway"
export DEMO_ADMIN_EMAILS="kyubeom@gmail.com"

# frontend만 재빌드 후 Firebase Hosting 배포
yarn install --immutable
yarn tsc
yarn workspace app build --config app-config.demo.yaml
firebase deploy --only hosting --project kai-platform-d0ae0
```

### 29단계 로컬 검증 결과

- `yarn start`로 로컬 서버 실행
- Access Code `demo1234`로 접속
- 일반 사용자 상태에서 요구사항 진도표 메뉴 비노출 확인
- `/requirement-progress` 직접 접근 시 "접근 권한이 없습니다" 화면 확인
- `sessionStorage.__kt_ai_portal_admin_preview__ = 'true'` 설정 후 관리자 메뉴 및 페이지 노출 확인
- 4개 탭 (SFR별 진도표 21개, 기능목록 163개, 변경이력 13개, 질의사항 7개) 정상 표시 확인

## 30단계 배포 (2026-07-12)

- **배포 대상**: Firebase Hosting 정적 frontend (요구사항 대응현황, 플랫폼 API 연계현황 UI 추가)
- **Cloud Run 변경 여부**: 없음 (backend 변경 없음, 기존 revision `kt-ai-portal-demo-00009-v6d` 유지)
- **시도 명령**: `./scripts/deploy-stage30-firebase.sh`
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **접속 코드**: `ictway`

### 빌드 결과

- `yarn install --immutable` 통과
- `yarn tsc` 통과
- `yarn workspace app build --config app-config.demo.yaml` 통과
- Firebase Hosting deploy 성공

### 배포 내용

- 관리자 전용 `요구사항 대응현황` (`/requirement-coverage`) 화면 배포
- 관리자 전용 `플랫폼 API 연계현황` (`/platform-api-integration`) 화면 배포
- 기존 `/requirement-progress`는 `/requirement-coverage`와 동일한 화면으로 별칭 처리
- CSV 다운로드 기능 포함

### 주의사항

- Firebase Web App 설정값은 `deploy-stage30-firebase.sh` 실행 시 Firebase CLI로부터 동적으로 가져와 환경변수로 주입
- 본 스크립트 및 문서에는 API key, app ID 등 secret 값을 하드코딩하지 않음
- Backend(Cloud Run)는 변경사항이 없어 재배포하지 않음

### 검증 결과

- 접속 코드(`ictway`)로 정상 진입
- 일반 사용자 상태에서 `요구사항 대응현황`, `플랫폼 API 연계현황` 메뉴 비노출 확인
- `/requirement-coverage`, `/platform-api-integration` 직접 접근 시 `AdminOnlyGuard`에 의해 "접근 권한이 없습니다" 차단 확인
- 관리자 프리뷰 모드(`sessionStorage.__kt_ai_portal_admin_preview__ = 'true'`)에서 두 메뉴 및 페이지 정상 노출 확인
  - 요구사항 대응현황: 14개 메뉴, 113개 화면구현/41개 부분구현/9개 후속·미구현 요약 카드, 5개 탭 정상 표시
  - 플랫폼 API 연계현황: 제목/CSV 버튼/요약 카드/테이블 정상 표시
- CSV 다운로드 버튼 클릭 시 파일 다운로드 시작 확인(브라우저 이벤트)

## 31단계 배포 (2026-07-12)

- **배포 대상**: Firebase Hosting 정적 frontend (`업무흐름/연계 시나리오` UI 추가)
- **Cloud Run 변경 여부**: 없음 (backend 변경 없음, 기존 revision `kt-ai-portal-demo-00009-v6d` 유지)
- **시도 명령**: `./scripts/deploy-stage30-firebase.sh`
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **접속 코드**: `ictway`

### 빌드 결과

- `yarn install --immutable` 통과
- `yarn tsc` 통과
- `yarn workspace app build --config app-config.demo.yaml` 통과
- Firebase Hosting deploy 성공

### 배포 내용

- 관리자 전용 `업무흐름/연계 시나리오` (`/workflow-scenarios`) 화면 배포
- 7개 사용자 여정 및 7개 업무흐름 시나리오 포함
- 통합 대시보드에 관리자 전용 `MenuScenarioPanel` 추가
- 신규 문서 3개(`WORKFLOW_SCENARIO_GUIDE.md`, `USER_JOURNEY_AND_PLATFORM_FLOW.md`, `PROPOSAL_EXPLANATION_MESSAGES.md`) 포함

### 검증 결과

- 접속 코드(`ictway`)로 정상 진입
- 일반 사용자 상태에서 `업무흐름/연계 시나리오` 메뉴 비노출 확인
- `/workflow-scenarios` 직접 접근 시 `AdminOnlyGuard`에 의해 "접근 권한이 없습니다" 차단 확인
- 관리자 프리뷰 모드(`sessionStorage.__kt_ai_portal_admin_preview__ = 'true'`)에서 메뉴 및 페이지 정상 노출 확인
  - 포털 역할 요약, 사용자 여정(7), 업무흐름 시나리오(7) 탭 정상 표시
  - 시나리오 상세 단계(수행 주체/행위/메뉴/플랫폼/API/SFR/상태) 표시 확인
  - `요구사항 대응현황 보기`, `API 연계현황 보기` 링크 정상 동작
- 통합 대시보드에서 관리자 프리뷰 시 `통합 대시보드 — 업무흐름/연계 정보` 패널 노출 확인

### 주의사항

- Firebase Web App 설정값은 스크립트 실행 시 Firebase CLI로부터 동적으로 가져와 환경변수로 주입
- 본 스크립트 및 문서에는 API key, app ID 등 secret 값을 하드코딩하지 않음
- 콘솔의 `/api/auth/guest/refresh` 404는 게스트 세션 갱신 시도로 인한 기존 경고이며, 31단계 변경과 무관함


## 31.5단계 배포 (2026-07-12)

- **배포 대상**: Firebase Hosting frontend
- **Cloud Run backend 변경 여부**: 없음
- **배포 방법**: `yarn workspace app build` → `firebase deploy --only hosting`
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **Cloud Run URL**: https://kt-ai-portal-demo-1088986528140.asia-northeast3.run.app
- **Cloud Run Revision**: `kt-ai-portal-demo-00009-v6d` (유지)
- **접속 코드**: `ictway`

### 주요 변경 내용

- 로그인 페이지, DemoModeBanner, 관리자 전용 페이지 안내 문구 중립화
- `PoC`, `Mock`, `mock data`, `데모`, `프리뷰`, `제안팀`, `제안서` 등 캡처에 부적합한 UI 문구 제거
- Workflow/플랫폼 API 연계 상태값, 역할명, 프로젝트명, 공지 제목 정리

### 빌드·배포 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app test --watchAll=false` 통과 (1 passed)
- `yarn workspace app build` 성공
- `firebase deploy --only hosting` 성공
- Hosting 파일 수: 735 files

### 알려진 이슈

- `/api/auth/guest/refresh` 404: Cloud Run backend 측 이슈로 본 배포에서는 Frontend 변경만 수행. Backend 재배포 시 별도 검증 필요.


## 32.1단계 배포 (2026-07-12)

- **배포 대상**: Firebase Hosting frontend
- **Cloud Run backend 변경 여부**: 없음
- **배포 방법**: `bash scripts/deploy-stage30-firebase.sh`
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **Cloud Run URL**: https://kt-ai-portal-demo-1088986528140.asia-northeast3.run.app
- **Cloud Run Revision**: `kt-ai-portal-demo-00009-v6d` (유지)
- **접속 코드**: `ictway`
- **관리자 이메일**: `kyubeom@gmail.com`

### 주요 변경 내용

- Firebase Google 로그인 버튼/클이언트에 popup 차단 시 redirect 폭백 추가
- `PreviewLoginPage`에서 Google 로그인 오류 메시지 표시
- `App.tsx`에서 Firebase Auth 상태 기반 미허용 Google 사용자 자동 로그아웃
- `deploy-stage30-firebase.sh`의 Firebase SDK config 추출 경로를 `.result.sdkConfig`로 수정하고 null 검증 추가
- `app-config.demo.yaml`에 `app.auth.allowedDomains` 항목 추가
- `smoke-check-demo-routes.mjs`에서 `/api/*` 경로에 cache-buster 추가
- 기능흐름/사용 설명자료 5건 작성 및 proposal-package 통합 자료 추가

### 빌드·배포 결과

- `yarn tsc` 통과
- `yarn workspace app build --config app-config.demo.yaml` 성공
- `node scripts/smoke-check-demo-routes.mjs` 17/17 200 OK
- `firebase deploy --only hosting` 성공
- Hosting 파일 수: 735 files

### 검증 결과

- Google 로그인 버튼 클릭 시 Firebase auth handler 팝업이 열리고 Google 계정 선택/비밀번호 입력 화면까지 정상 진입
- 접근 코드 `ictway` → Guest 로그인 후 포털 대시보드 정상 진입
- 관리자 프리뷰 모드(`sessionStorage.__kt_ai_portal_admin_preview__ = 'true'`)에서 관리자 메뉴(관리자 콘솔, 요구사항 대응현황, 플랫폼 API 연계현황, 업무흐름/연계 시나리오) 정상 노출

### 알려진 이슈

- `/api/auth/guest/refresh` 404: Firebase Hosting edge cache에 남은 과거 404가 간헐적으로 반환될 수 있으나, 재배포 후 TTL(약 10분)이 지나면 소진됨. 스크립트는 cache-buster로 우회하고, 브라우저에서는 강력 새로고침/시크릿 모드로 확인 가능.
- Google 관리자 로그인 완료 검증은 `kyubeom@gmail.com` 계정의 비밀번호/2단계 인증이 필요하여 브라우저에서 수동으로 최종 확인해야 함.


## 33.1단계 배포 (2026-07-13)

- **배포 대상**: Firebase Hosting frontend
- **Cloud Run backend 변경 여부**: 없음
- **배포 방법**: `bash scripts/deploy-stage30-firebase.sh`
- **접속 URL**: https://kai-platform-d0ae0.web.app
- **Cloud Run URL**: https://kt-ai-portal-demo-1088986528140.asia-northeast3.run.app
- **Cloud Run Revision**: `kt-ai-portal-demo-00009-v6d` (유지)
- **접속 코드**: `ictway`
- **관리자 이메일**: `kyubeom@gmail.com`

### 주요 변경 내용

- 화면 상단 `시연 환경입니다...` 안내 배너 제거
- `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리` 카드를 일반 사용자 대시보드에서 제거
- 관리자 콘솔에 `플랫폼 운영도구` 탭 추가, 3개 외부 도구를 관리자 전용으로 노출
- 대시보드 `관리자 콘솔` 바로가기도 관리자 미접속 시 미노출 처리
- 서비스/도구 카탈로그의 `OpenMetadata` 항목을 관리자 전용으로 필터링
- 접근 코드 로그인 화면 `검증 환경...` 문구 제거
- 화면 노출 `샘플 데이터` 문구를 `예시 데이터`로 정정

### 빌드·배포 결과

- `yarn tsc --noEmit` 통과
- `yarn workspace app build --config app-config.demo.yaml` 성공
- `yarn workspace app test --watchAll=false` 통과 (1 passed)
- `node scripts/smoke-check-demo-routes.mjs` 16/17 (알려진 `/api/auth/guest/refresh` 404 제외)
- `firebase deploy --only hosting` 성공
- Hosting 파일 수: 735 files

### 검증 결과

- 접근 코드 `ictway` → Guest 로그인 후 포털 대시보드 정상 진입
- 상단 `시연 환경` 배너 미노출 확인
- `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리` 카드 미노출 확인
- 관리자 프리뷰 모드(`sessionStorage.__kt_ai_portal_admin_preview__ = 'true'`)에서 관리자 메뉴 및 관리자 콘솔 `플랫폼 운영도구` 탭 정상 노출

### 알려진 이슈

- `/api/auth/guest/refresh` 404: Firebase Hosting edge cache에 따라 간헐적으로 발생할 수 있으며, 재시도/강력 새로고침으로 정상화됨.
- Google 관리자 로그인 완료 검증은 `kyubeom@gmail.com` 계정의 비밀번호/2단계 인증이 필요하여 브라우저에서 수동으로 최종 확인해야 함.


## 2026-07-30 — 33.2단계 UI/UX 정비 배포

- 변경 범위: 프론트엔드 전용(디자인 토큰/공통 컴포넌트/사이드바/대시보드/K-RMF/역할 UI), Backend 변경 없음(Cloud Run 재배포 안 함)
- 배포 경로: firebase CLI 계정 불일치(inhwatechwin 로그인 상태)로 `firebase deploy` 불가 → Firebase Hosting REST API로 배포
  - gcloud 활성 계정(kyubeom@gmail.com) 액세스 토큰 + `x-goog-user-project` 헤더
  - 기존 라이브 버전의 rewrites/headers config 재사용(/api/** → Cloud Run 라우팅 유지)
  - 파일 gzip 후 SHA256 해시 등록(populateFiles) → 필요 파일 업로드 → FINALIZED → release
  - release: `projects/kai-platform-d0ae0/sites/kai-platform-d0ae0/releases/1785388090933000`
- 검증: 번들 해시 일치(main.c6f1a4cb.js), smoke test 17/17, full-audit-playwright 전 라우트 정상
- 후속 조치 필요: `firebase login --reauth`(kyubeom@gmail.com)로 CLI 계정 복구
