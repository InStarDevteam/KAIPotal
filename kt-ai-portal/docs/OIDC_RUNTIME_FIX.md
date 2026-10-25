# OIDC Runtime Fix (Keycloak clientSecret 로딩 안정화)

## 문제 증상

Backstage 개발 서버를 `yarn start`로 실행하면 `backstage-portal/.env`에 정의된 `AUTH_OIDC_CLIENT_SECRET`과 `AUTH_SESSION_SECRET`이 런타임에 자동으로 로딩되지 않아, backend 초기화 로그에서 다음과 같은 메시지가 출력됨.

```text
Skipping oidc auth provider, Missing required config value at 'auth.providers.oidc.development.clientSecret'
```

결과적으로 Keycloak OIDC 로그인 버튼은 노출되지만, `/api/auth/oidc/start` 호출 시 provider를 찾을 수 없어 OIDC 로그인 흐름이 진행되지 않음.

## 원인

Backstage CLI(`backstage-cli repo start`)는 실행 시 `.env` 파일을 자동으로 읽지 않음. macOS 터미널 세션에 환경변수가 export되어 있어야 `app-config.yaml`의 `${AUTH_OIDC_CLIENT_SECRET}` 치환이 정상 동작함.

## 해결 방법

### 1. `.env` 파일 준비

`backstage-portal/.env`가 있는지 확인한다.

```bash
cd kt-ai-portal/backstage-portal
ls -la .env
```

없다면 `.env.example`을 복사하여 Keycloak `backstage` Client Secret을 입력한다.

```bash
cp .env.example .env
```

`.env` 예시:

```bash
AUTH_OIDC_CLIENT_SECRET=replace-with-keycloak-client-secret
AUTH_SESSION_SECRET=replace-with-a-long-random-session-secret
```

> 실제 secret 값은 Keycloak Admin Console → Realm `kt-ai` → Client `backstage` → Credentials 탭에서 확인할 수 있다. 문서에는 실제 값을 기록하지 않는다.

### 2. 개발 실행 스크립트 사용

`scripts/start-dev.sh`가 `.env`를 읽어 환경변수를 export한 뒤 `yarn start`를 실행한다.

```bash
cd kt-ai-portal/backstage-portal
./scripts/start-dev.sh
```

스크립트 동작:

- `.env` 파일 존재 여부 확인
- `.env`의 주석/빈 줄 제거 후 export
- `AUTH_OIDC_CLIENT_SECRET`, `AUTH_SESSION_SECRET` 설정 여부 확인
- `yarn start` 실행

### 3. backend 로그에서 OIDC provider 초기화 확인

정상적으로 환경변수가 로딩되면 backend 초기화 로그에 다음이 출력됨.

```text
Configuring auth provider: oidc
Configuring auth provider: guest
```

`Skipping oidc auth provider` 메시지가 사라짐.

## 검증 절차

1. `./scripts/start-dev.sh`로 Backstage 재시작
2. `http://localhost:3000` 접속
3. Sign-In 페이지에서 Keycloak `SIGN IN` 클릭
4. Keycloak 로그인 페이지에서 `admin01 / <password>` 입력
5. 로그인 후 Portal Dashboard로 복귀
6. Dashboard Hero 영역에 `Admin Kim (user:default/admin01)` 및 `admin01@kt.ai` 표시 확인
7. Home, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence, Integrated Search 정상 접근 확인

## 참고

- `.env`는 `.gitignore`에 포함되어 Git 추적 대상이 아님
- 운영 환경에서는 별도의 secret 관리 도구(Vault, Kubernetes Secret 등) 사용 권장
- 본 PoC에서는 `.env` 파일을 로컬 개발용으로만 사용
