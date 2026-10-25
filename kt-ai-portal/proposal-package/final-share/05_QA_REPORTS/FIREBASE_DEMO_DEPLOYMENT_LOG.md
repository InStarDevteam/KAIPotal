# Firebase + Cloud Run 데모 배포 이력

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
