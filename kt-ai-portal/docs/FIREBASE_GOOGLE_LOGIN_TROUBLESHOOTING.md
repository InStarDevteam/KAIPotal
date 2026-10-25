# Firebase Google 로그인 문제 해결 가이드

> 본 문서는 국방지능형플랫폼포털 데모 사이트에서 Firebase Auth Google 로그인이 정상 동작하지 않을 때 점검할 항목을 정리합니다.  
> 실제 API Key, App ID, secret, token, service account 값은 본 문서에 기록하지 않습니다.

## 1. 현상

- Google 계정으로 로그인 버튼 클릭 시 아무反응 없음
- 팝업 차단 후 로그인 실패
- 로그인 성공 후 `등록된 사용자 계정이 아닙니다` 메시지
- 관리자 메뉴가 표시되지 않음

## 2. 코드에서 확인할 항목

### 2.1 Firebase 초기화 설정

- `backstage-portal/app-config.demo.yaml`의 `app.firebase` 영역
  - `apiKey`, `authDomain`, `projectId`, `appId`가 환경변수로 주입되는지 확인
- `backstage-portal/packages/app/src/App.tsx`
  - `config.getOptionalString('app.firebase.*')`에서 값이 정상 읽히는지 확인
- `backstage-portal/packages/app/src/components/preview-auth/firebaseAuthClient.ts`
  - `initializePreviewFirebaseAuth`에서 4개 값이 모두 존재할 때만 `initializeApp` 수행
  - 값이 하나라도 빈 문자열이면 Firebase Auth가 초기화되지 않음

### 2.2 관리자 이메일 비교

- `backstage-portal/packages/app/src/components/preview-auth/DemoAdminContext.tsx`
  - `config.getOptionalString('app.auth.adminEmails')` 값을 `,`로 분리하여 비교
  - `kyubeom@gmail.com`이 포함되어야 관리자로 인식
- `backstage-portal/packages/app/src/App.tsx`
  - Google 로그인 성공 후 `isAllowed` 또는 `isAdminEmail`이 `true`여야 Backstage 로그인 선택 화면으로 진입
  - `isAllowed`는 `app.auth.allowedEmails` 또는 `app.auth.allowedDomains`에 의존
  - 관리자 이메일이 `allowedEmails`에 없더라도 `adminEmails`에 있으면 진입 가능하도록 수정되어 있음

### 2.3 팝업/리다이렉트 폴백

- `signInWithPopup` 실패 시 다음 오류 코드에 대해 `signInWithRedirect`로 폴백
  - `auth/popup-blocked`
  - `auth/cancelled-popup-request`
- 직접 리다이렉트 후 복귀 시 `onAuthStateChanged`가 자동으로 로그인 상태를 감지

## 3. Firebase Console 설정 확인

Firebase Console(`https://console.firebase.google.com/project/kai-platform-d0ae0`)에서 다음을 확인합니다.

### 3.1 Authentication → Sign-in method

- **Google** 공급자가 **사용 설정** 상태인지 확인
- **지원 이메일**이 선택되어 있는지 확인

### 3.2 Authentication → Settings → Authorized domains

다음 도메인이 등록되어 있는지 확인합니다.

```text
kai-platform-d0ae0.web.app
kai-platform-d0ae0.firebaseapp.com
localhost
```

- `localhost`는 개발 서버용입니다.
- Cloud Run URL은 별도 배포/테스트 시 추가할 수 있습니다.

### 3.3 Project settings → General → Web App

- `Web API Key`, `Auth domain`, `App ID`가 `app-config.demo.yaml`에 주입된 값과 일치하는지 확인
- 값을 변경한 경우 재빌드/재배포 필요

## 4. 브라우저 환경 확인

### 4.1 팝업 차단

- 브라우저가 `signInWithPopup`을 차단하지 않는지 확인
- 차단 시 주소창 오른쪽 팝업 차단 아이콘을 확인하고 허용
- 코드에서 `signInWithRedirect` 폴백을 사용하므로 팝업 차단 시 자동으로 리다이렉트 시도

### 4.2 Third-party cookie

- Chrome/Edge 등에서 third-party cookie가 차단되면 Firebase Auth가 정상 동작하지 않을 수 있음
- 개인정보 보호 모드/시크릿 모드에서는 테스트를 권장하지 않음
- Safari는 third-party cookie 기본 차단으로 인해 `signInWithRedirect` 사용 권장

### 4.3 브라우저 콘솔 로그

- 개발자 도구 → Console에서 다음 항목 확인
  - `Firebase Auth is not initialized` 메시지: Firebase 설정값 누락
  - `auth/popup-blocked`: 팝업 차단
  - `auth/unauthorized-domain`: Authorized domains 미등록
  - `auth/account-exists-with-different-credential`: 동일 이메일 다른 공급자 존재
  - `등록된 사용자 계정이 아닙니다`: allowedEmails/adminEmails 미포함

## 5. 배포 시 환경변수

`scripts/deploy-stage30-firebase.sh` 또는 `scripts/build-demo.sh` 실행 시 다음 환경변수가 필요합니다.

```bash
export APP_BASE_URL="https://kai-platform-d0ae0.web.app"
export BACKEND_BASE_URL="https://kai-platform-d0ae0.web.app"
export PREVIEW_ACCESS_CODE="ictway"
export DEMO_ADMIN_EMAILS="kyubeom@gmail.com"
export DEMO_ALLOWED_EMAILS="kyubeom@gmail.com"
export DEMO_ALLOWED_DOMAINS="gmail.com"
export AUTH_SESSION_SECRET="<session-secret>"
```

- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`는 `firebase apps:sdkconfig WEB --project kai-platform-d0ae0 --json`으로 자동 조회
  - CLI 출력은 `result.sdkConfig` 아래에 위치하므로 스크립트에서 `.result.sdkConfig.apiKey` 형식으로 추출해야 함
  - 값이 `null`이면 빌드 시 Firebase가 초기화되지 않고 Google 로그인 버튼이 무응답하거나 `identitytoolkit` 호출이 실패함
- 실제 값은 로그나 문서에 남기지 않음

## 6. 관리자 권한 검증 절차

### 6.1 일반 사용자

1. 접근 코드 `ictway` 입력
2. Guest ENTER
3. 왼쪽 메뉴에서 `요구사항 대응현황`, `플랫폼 API 연계현황`, `업무흐름/연계 시나리오` 미노출 확인
4. `/requirement-coverage`, `/platform-api-integration`, `/workflow-scenarios` 직접 접근 시 "접근 권한이 없습니다" 확인

### 6.2 Google 관리자

1. `Google 계정으로 로그인` 버튼 클릭
2. `kyubeom@gmail.com` 계정 선택 및 비밀번호 입력
3. Backstage Guest ENTER
4. 왼쪽 메뉴에 관리자 전용 메뉴 표시 확인
5. 각 관리자 화면 정상 접근 및 CSV 다운로드 확인

### 6.3 관리자 프리뷰 모드

```js
sessionStorage.setItem('__kt_ai_portal_admin_preview__', 'true');
location.reload();
```

- Access Code 로그인 후에도 관리자 메뉴 표시
- 운영 환경에서는 사용하지 않으며, 제안/시연 시에만 활용

## 7. 주의사항

- Google 로그인은 **데모/검증 환경**에서만 사용
- 운영 환경에서는 Keycloak OIDC 또는 조직 SSO로 전환 권장
- `DEMO_ALLOWED_DOMAINS`를 `gmail.com` 등 광범위한 도메인으로 설정하면 비관리자 Gmail 계정도 로그인 가능하므로 주의
- 관리자 이메일 변경 시 `DEMO_ADMIN_EMAILS` 재설정 및 재배포 필요

## 8. `/api/auth/guest/refresh` 404 (Firebase Hosting 캐시)

- Cloud Run으로 직접 호출하면 200을 반환하지만, Firebase Hosting 경로에서 간헐적으로 404가 반환될 수 있음
- 원인: rewrite 설정 변경 전에 `/api/auth/guest/refresh`가 Firebase Hosting edge cache에 404로 저장되었기 때문 (TTL 약 10분)
- 조치
  - 재배포 후 수 분이 지나면 자연스럽게 소진됨
  - 즉시 확인이 필요하면 URL 뒤에 `?_cb=<timestamp>` 등 cache-buster를 붙여 테스트
  - 브라우저에서는 강력 새로고침(Cmd+Shift+R / Ctrl+F5) 또는 시크릿 모드로 확인

