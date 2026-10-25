# Firebase + Cloud Run 데모 배포 가이드

> 국방지능형플랫폼포털 PoC를 인터넷에서 접속할 수 있도록 Firebase Hosting + Cloud Run으로 배포하는 방법을 설명합니다.

## 개요

- **목표**: 제안팀이 `https://<sub>.kbcosmos.com`에서 PoC 데모 사이트에 접속할 수 있게 한다.
- **아키텍처**: Firebase Hosting(정적 콘텐츠 및 CDN) → Cloud Run(Backstage backend 컨테이너)
- **인증**: 데모용 Guest 인증 + 브라우저 세션 기반 접근코드(`PreviewAuthGate`)
- **외부 연동**: Keycloak OIDC, OpenSearch/OpenMetadata 운영 인스턴스, 실제 DB/API 등은 데모에서 사용하지 않는다.

## 전제 조건

- GCP 프로젝트 생성 및 결제 계정 연결
- Firebase 프로젝트 생성(GCP 프로젝트와 동일하게 사용 가능)
- `gcloud` CLI, `firebase` CLI 설치 및 인증
- Docker Desktop 또는 Docker CLI
- 가비아 등에서 `<sub>.kbcosmos.com` 도메인 관리 권한

## 파일 구성

| 파일 | 설명 |
|------|------|
| `app-config.demo.yaml` | Cloud Run용 Backstage 설정 |
| `firebase.json` | Firebase Hosting rewrite 규칙 |
| `.firebaserc.example` | Firebase 프로젝트 alias 예시 |
| `Dockerfile.demo` | Backstage backend 컨테이너 빌드 파일 |
| `scripts/build-demo.sh` | 로컬 빌드 스크립트 |
| `scripts/deploy-demo-cloudrun.sh` | Cloud Run 배포 스크립트 |
| `scripts/deploy-demo-firebase.sh` | Firebase Hosting 배포 스크립트 |

## 설정

1. Firebase 프로젝트 ID 설정
   ```bash
   cp .firebaserc.example .firebaserc
   # .firebaserc의 <FIREBASE_PROJECT_ID>를 실제 값으로 교체
   ```

2. 환경 변수 준비
   ```bash
   export GCP_PROJECT_ID=<gcp-project-id>
   export FIREBASE_PROJECT_ID=<firebase-project-id>
   export REGION=asia-northeast3
   export CLOUD_RUN_SERVICE=kt-ai-portal-demo
   export DEMO_DOMAIN=demo.kbcosmos.com
   export PREVIEW_ACCESS_CODE=ictway
   export AUTH_SESSION_SECRET=<32바이트 이상의 랜덤 문자열>
   ```

## 빌드

```bash
./scripts/build-demo.sh
```

- `yarn install --immutable`
- `yarn tsc`
- `yarn build:all`
- Docker 이미지 `kt-ai-portal-demo:latest` 빌드

## 배포

### 1. Cloud Run 배포

```bash
./scripts/deploy-demo-cloudrun.sh
```

- Artifact Registry에 이미지 push
- Cloud Run 서비스 생성/업데이트
- 데모 환경변수(`APP_BASE_URL`, `BACKEND_BASE_URL`, `PREVIEW_ACCESS_CODE`, `AUTH_SESSION_SECRET`) 설정

### 2. Firebase Hosting 배포

```bash
./scripts/deploy-demo-firebase.sh
```

- Firebase Hosting에 설정 배포
- 커스텀 도메인 연결 안내 출력

### 3. DNS 연결

Firebase Hosting에서 제공하는 CNAME 대상을 가비아 DNS에 등록한다.

| 항목 | 값 |
|------|-----|
| 레코드 타입 | CNAME |
| 호스트 | `demo` (또는 사용할 서브도메인) |
| 값 | Firebase Console에서 확인한 대상 |

Firebase Console에서 SSL 인증서가 발급되면 `https://<sub>.kbcosmos.com`로 접속 가능하다.

## 데모 인증

- 사이트 접속 시 접근코드 입력 화면(`PreviewLoginPage`)이 표시된다.
- 올바른 접근코드를 입력하면 브라우저 세션 동안 데모 사이트를 이용할 수 있다.
- 상단 데모 배너(`DemoModeBanner`)를 통해 mock data 기반 PoC임을 안내한다.

## 제약 사항

- 접근코드는 프론트엔드 번들/설정에 포함될 수 있으므로 강력한 보안 수단이 아니다.
- 데모에서는 Keycloak OIDC를 사용하지 않고 Guest 인증만 사용한다.
- OpenSearch 연결 실패 시 mock fallback 결과를 표시한다.
- 실제 데이터나 외부 시스템 연동은 하지 않는다.

## 문제 해결

| 증상 | 원인/해결 |
|------|-----------|
| Cloud Run 502/503 | 서비스가 실행 중인지, Firebase rewrite 대상 serviceId/region이 일치하는지 확인 |
| 접근코드 불일치 | `PREVIEW_ACCESS_CODE` 환경변수 또는 `app-config.demo.yaml`의 `app.previewAccessCode` 확인 |
| Firebase 호스팅 404 | `firebase.json`의 rewrite 규칙이 Cloud Run 서비스를 가리키는지 확인 |
| SSL 미발급 | DNS CNAME 레코드가 정확히 설정되었는지, 도메인 소유권 검증이 완료되었는지 확인 |

## 다음 단계

- 실제 운영 전환 시 Keycloak OIDC, PostgreSQL, OpenSearch/OpenMetadata, Kubernetes/CMP 연동을 추가한다.
- CI/CD 파이프라인(GitHub Actions 등)으로 빌드/배포를 자동화한다.
- Secret Manager로 민감 환경변수를 관리한다.


## 실제 배포된 데모 정보 (29.1단계 기준)

| 항목 | 값 |
|---|---|
| Firebase 프로젝트 | `kai-platform-d0ae0` |
| Firebase Hosting URL | `https://kai-platform-d0ae0.web.app` |
| Cloud Run 서비스 | `kt-ai-portal-demo` (asia-northeast3) |
| Cloud Run URL | `https://kt-ai-portal-demo-1088986528140.asia-northeast3.run.app` |
| 접근 코드 | `ictway` |
| 데모 인증 | Firebase Auth Google 로그인 + 접근 코드(PreviewAuthGate) |
| 허용 이메일 | `kyubeom@gmail.com` (DEMO_ALLOWED_EMAILS) |
| 관리자 이메일 | `kyubeom@gmail.com` (DEMO_ADMIN_EMAILS) |

- 26단계에서 Firebase Auth 기반 Google 로그인 데모가 완료되었습니다.
- 29.1단계에서 Firebase Hosting에 요구사항 진도표 화면을 포함한 frontend를 재배포했습니다.
- Firebase Web App 설정값(`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`)은 환경변수로 주입하여 빌드했습니다.
- 29.1단계에서는 Firebase Hosting만 재배포했으며, Cloud Run backend는 이전 revision을 그대로 사용 중입니다. 따라서 `/api/auth/guest/refresh` 등 backend API 호출 시 404가 발생할 수 있습니다.

### 29.1단계 검증 항목

- 접근 코드 `ictway`로 정상 진입
- 일반 사용자 상태에서는 "요구사항 진도표" 메뉴 미노출
- `/requirement-progress` 직접 접근 시 "접근 권한이 없습니다" 화면 표시
- 관리자 프리뷰 모드(`sessionStorage.__kt_ai_portal_admin_preview__ = 'true'`) 활성화 시:
  - "요구사항 진도표" 메뉴 표시
  - `/requirement-progress` 페이지 접근 가능
  - 상단 요약 카드 표시 (전체 SFR 21, 전체 기능 163, 화면 구현 113 등)
  - SFR별 진도표 21건 표시
  - 기능목록 상세 163건 표시
  - 변경이력 13건 표시
  - 질의사항 7건 표시

### 29.2단계: Cloud Run backend 재배포

- Cloud Run 서비스 `kt-ai-portal-demo`를 최신 Docker image로 재배포
- Revision: `kt-ai-portal-demo-00009-v6d`
- `/api/auth/guest/refresh` 404 문제 해결
- Cloud Run 직접 URL 및 Firebase Hosting rewrite 모두 200 응답 확인
- 데모 사이트에서 일반 사용자/관리자 프리뷰 재검증 완료
