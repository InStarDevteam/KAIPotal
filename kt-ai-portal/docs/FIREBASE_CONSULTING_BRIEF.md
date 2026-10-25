# Firebase 서비스 전환 컨설팅 자료: 국방지능형플랫폼포털

> **용도:** ChatGPT(또는 외부 컨설턴트)에게 Firebase 기반 서비스 배포를 검토받기 위해 프로젝트의 핵심 정보를 한 데 모은 브리핑 문서입니다.  
> **기준일:** 2026-07-05  
> **프로젝트 저장소:** `https://github.com/KBitone-Company/kt-ai-portal.git`  
> **로컬 경로:** `/Users/choikyubeom/Documents/kimi-projects/KAIPotal/kt-ai-portal`

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 공식 한글명 | 국방지능형플랫폼포털 |
| 공식 영문명 | K-Defense Intelligence Platform |
| 성격 | Backstage 기반 국방 AI 데이터·모델·프로젝트 통합 운영 포털 **PoC** |
| 목표 | AI 데이터, 모델, 프로젝트, 도구, 크레딧, 반출/반입 승인, K-RMF 증빙, 육해공군 멀티테넌트 관리를 하나의 포털에서 통합 지원 |
| 현재 단계 | UI/UX PoC 완료, 주요 화면 18개 캡처, 산출물 문서 40여 개 작성, Firebase + Cloud Run 데모 배포 준비 완료, 실제 프로젝트 생성/DNS 연결 미진행, GitHub push 인증 이슈 미해결 |

### 핵심 질문 (Firebase 컨설팅 목표)

1. 이 Backstage 애플리케이션을 Firebase 생태계로 배포·운영할 때의 **아키텍처 후보**는 무엇인가?
2. Firebase Hosting만으로는 **Node.js 백엔드가 필요한 Backstage**를 서비스할 수 없으므로, Firebase 어떤 제품(Hosting, Cloud Run, Cloud Functions, Firestore, Firebase Auth, Secret Manager 등)을 어떻게 조합해야 하는가?
3. 현재 **mock data 기반**인 수많은 기능을 실제 서비스로 전환할 때 Firebase 각 제품과의 매핑 방식은?
4. **보안등급(공개/내부/비밀)**, K-RMF, 군별 테넌트 분리, Keycloak OIDC 같은 보안·인프라 요구사항을 Firebase에서 어떻게 충족할 수 있는가?
5. 현재의 **기술부채와 미구현 연동**을 Firebase 전환과 함께 해결하기 위한 우선순위와 로드맵은?

---

## 2. 기술 스택 및 의존성

| 레이어 | 기술 | 버전/세부사항 | 비고 |
|--------|------|---------------|------|
| 런타임 | Node.js | `22 || 24` | `backstage-portal/package.json` engines |
| 패키지 매니저 | Yarn | 4.13.0 | PnP가 아닌 `node-modules` linker 사용 |
| 프론트엔드 | Backstage (React 18 + TypeScript ~5.8) | `@backstage/cli ^0.36.3` | `packages/app/package.json` |
| UI | Material-UI v4 | `@material-ui/core ^4.12.2` | MUI v5 마이그레이션 고려 대상 |
| 백엔드 | Backstage backend defaults | `@backstage/backend-defaults ^0.17.3` | `packages/backend/package.json` |
| 인증 | Keycloak OIDC + Guest provider | Keycloak 26.2.4 | `app-config.yaml` |
| 검색 | OpenSearch | 2.19.1 | `infra/opensearch/docker-compose.yml` |
| 데이터 거버넌스 | OpenMetadata | 1.6.0 | `infra/openmetadata/docker-compose.yml` |
| DB (개발) | better-sqlite3 (in-memory) | `:memory:` | `app-config.yaml` |
| DB (운영 예시) | PostgreSQL | `pg ^8.11.3` | `app-config.production.yaml` |
| 컨테이너 베이스 | node:24-trixie-slim | `packages/backend/Dockerfile` | 현재 백엔드 이미지 빌드용 |
| E2E 테스트 | Playwright | `@playwright/test ^1.32.3` | 시나리오 미작성 상태 |
| 빌드 도구 | backstage-cli, tsc, prettier, eslint | — | — |

### 주요 Backstage 플러그인/기능

- `@backstage/plugin-auth-backend-module-oidc-provider`
- `@backstage/plugin-catalog-backend`
- `@backstage/plugin-proxy-backend` (OpenSearch 프록시용)
- `@backstage/plugin-search-backend`
- `@backstage/plugin-permission-backend` (현재 `allow-all-policy` 사용)
- `@backstage/plugin-scaffolder-backend`
- `@backstage/plugin-kubernetes-backend` (설정 없음)
- `@backstage/plugin-techdocs-backend`
- `@backstage/plugin-notifications-backend`
- `@backstage/plugin-mcp-actions-backend`

---

## 3. 디렉터리 구조

```text
kt-ai-portal/
├── README.md
├── docs/                                 # 산출물 문서 40+
│   ├── assets/final/                     # 18개 화면 캡처 PNG
│   ├── SCREEN_USER_GUIDE.md              # 18개 화면 사용 설명서
│   ├── ARCHITECTURE.md                   # 시스템 아키텍처
│   ├── TECH_DEBT.md                      # 기술부채
│   ├── INTERNAL_LOGIC_BACKLOG.md         # 후속 개발 목록
│   ├── FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md
│   ├── FINAL_REQUIREMENT_VALIDATION_REPORT.md
│   └── ... (설계/제안/운영 문서)
├── proposal-package/                     # 제안서/PPT/견적 초안 패키지
├── infra/
│   ├── keycloak/docker-compose.yml       # Keycloak :8080
│   ├── opensearch/docker-compose.yml     # OpenSearch :9200, Dashboards :5601
│   └── openmetadata/docker-compose.yml   # OpenMetadata :8585/:8586
├── notes/                                # 의사결정/요구사항 메모
└── backstage-portal/                     # Backstage 모노레포
    ├── package.json
    ├── .yarnrc.yml
    ├── yarn.lock
    ├── app-config.yaml                   # 개발 설정
    ├── app-config.production.yaml        # 운영 설정 예시
    ├── .env.example
    ├── scripts/start-dev.sh
    ├── Dockerfile
    ├── packages/backend/Dockerfile       # 백엔드 컨테이너 이미지
    ├── packages/app/                     # 프론트엔드 React 앱
    │   ├── package.json
    │   ├── src/App.tsx
    │   └── src/components/               # PoC 업무 컴포넌트 모음
    │       ├── admin-console/
    │       ├── portal-dashboard/
    │       ├── project-workspace/
    │       ├── export-approval/
    │       ├── credit-manager/
    │       ├── krmf-evidence/
    │       ├── integrated-search/
    │       ├── service-catalog/
    │       ├── proposal-board/
    │       ├── my-page/
    │       ├── environment-settings/
    │       ├── tenant-management/
    │       └── common/
    ├── packages/backend/                 # Backstage 백엔드
    │   ├── package.json
    │   └── src/index.ts
    └── plugins/                          # 현재 비어 있음, 향후 플러그인 분리 대상
```

---

## 4. 주요 설정 파일

### 4.1 `backstage-portal/app-config.yaml` (개발 설정, 비밀값 마스킹)

```yaml
app:
  title: 국방지능형플랫폼포털
  baseUrl: http://localhost:3000
  packages: all

organization:
  name: 국방지능형플랫폼포털

backend:
  baseUrl: http://localhost:7007
  listen:
    port: 7007
  csp:
    connect-src: ["'self'", 'http:', 'https:']
  cors:
    origin: http://localhost:3000
    methods: [GET, HEAD, PATCH, POST, PUT, DELETE]
    credentials: true
  database:
    client: better-sqlite3
    connection: ':memory:'
  actions:
    pluginSources:
      - auth
      - catalog
      - scaffolder

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

proxy:
  endpoints:
    '/search':
      target: 'http://localhost:9200'
      changeOrigin: true
      allowedMethods: ['GET', 'POST', 'OPTIONS']
      allowedHeaders: ['Content-Type', 'Authorization']
      credentials: dangerously-allow-unauthenticated

techdocs:
  builder: 'local'
  generator:
    runIn: 'docker'
  publisher:
    type: 'local'

auth:
  environment: development
  session:
    secret: ${AUTH_SESSION_SECRET}
  providers:
    guest: {}
    oidc:
      development:
        metadataUrl: http://localhost:8080/realms/kt-ai/.well-known/openid-configuration
        clientId: backstage
        clientSecret: ${AUTH_OIDC_CLIENT_SECRET}
        prompt: auto
        signIn:
          resolvers:
            - resolver: emailLocalPartMatchingUserEntityName
              allowedDomains:
                - kt.ai
              dangerouslyAllowSignInWithoutUserInCatalog: true

scaffolder: {}

catalog:
  import:
    entityFilename: catalog-info.yaml
    pullRequestBranchName: backstage-integration
  rules:
    - allow: [Component, System, API, Resource, Location]
  locations:
    - type: file
      target: ../../examples/entities.yaml
    - type: file
      target: ../../examples/template/template.yaml
      rules:
        - allow: [Template]
    - type: file
      target: ../../examples/org.yaml
      rules:
        - allow: [User, Group]

kubernetes: {}

permission:
  enabled: true

mcpActions:
  name: '국방지능형플랫폼포털'
  description: '국방 AI 데이터, 모델, 프로젝트를 통합 검색·관리하고 반출/반입, 크레딧, K-RMF 증빙을 지원하는 관리자 포털 도구 모음'
```

### 4.2 `backstage-portal/app-config.production.yaml`

```yaml
app:
  baseUrl: http://localhost:7007

backend:
  baseUrl: http://localhost:7007
  listen: ':7007'
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}

auth:
  providers:
    guest: {}

catalog:
  locations:
    - type: file
      target: ./examples/entities.yaml
    - type: file
      target: ./examples/template/template.yaml
      rules:
        - allow: [Template]
    - type: file
      target: ./examples/org.yaml
      rules:
        - allow: [User, Group]
```

> **참고:** 운영 설정에서는 OIDC가 비활성화되어 있고 PostgreSQL을 사용합니다. Firebase 전환 시 OIDC를 Firebase Auth나 외부 IdP로 대체하거나, Keycloak을 Cloud Run 등으로 호스팅하는 방안이 필요합니다.

### 4.3 `backstage-portal/.env.example`

```bash
# Keycloak OIDC Client Secret
AUTH_OIDC_CLIENT_SECRET=replace-with-keycloak-client-secret

# Random secret used by express-session for the OIDC PKCE/state cookie
AUTH_SESSION_SECRET=replace-with-a-long-random-string
```

> 실제 `.env` 파일은 gitignore 처리되어 있으며, Keycloak client secret과 session secret을 포함하고 있습니다.

### 4.4 백엔드 Dockerfile

```dockerfile
FROM node:24-trixie-slim

ENV PYTHON=/usr/bin/python3
ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /app

COPY --chown=node:node .yarn ./.yarn
COPY --chown=node:node .yarnrc.yml ./
COPY --chown=node:node backstage.json ./
COPY --chown=node:node yarn.lock package.json packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

RUN yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"

COPY --chown=node:node examples ./examples
COPY --chown=node:node packages/backend/dist/bundle.tar.gz app-config*.yaml ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]
```

> 빌드 전에 `yarn install --immutable`, `yarn tsc`, `yarn build:backend`가 필요합니다.

---

## 5. 현재 아키텍처

```text
[User]
  ↓ HTTP
[Backstage Portal :3000]
  ├─ Portal Dashboard (/)
  ├─ Integrated Search (/integrated-search)
  ├─ Project Workspace (/project-workspace)
  ├─ Export Approval (/export-approval)
  ├─ Credit Manager (/credit-manager)
  ├─ K-RMF Evidence (/krmf-evidence)
  ├─ Admin Console (/admin-console)
  ├─ Service Catalog (/service-catalog)
  ├─ Proposal Board (/proposal-board)
  ├─ My Page (/my-page)
  ├─ Environment Settings (/environment-settings)
  └─ Tenant Management (/tenant-management)
  ↓ OIDC
[Keycloak :8080 / Realm kt-ai / Client backstage]
  ↓ Search API (backend proxy)
[OpenSearch :9200 / portal-catalog]
  ↓ Catalog API
[OpenMetadata :8585]
```

### 로컬 개발 포트

| 서비스 | URL | 비고 |
|--------|-----|------|
| Backstage frontend | http://localhost:3000 | 개발 서버 |
| Backstage backend | http://localhost:7007 | — |
| Keycloak | http://localhost:8080 | 개발 모드, admin/admin |
| OpenSearch | http://localhost:9200 | 보안 플러그인 비활성화 |
| OpenSearch Dashboards | http://localhost:5601 | — |
| OpenMetadata | http://localhost:8585 | Admin/health :8586 |

---

## 6. 주요 화면 및 기능

| # | 화면 | 경로 | 핵심 기능 | SFR 매핑 |
|---|------|------|-----------|----------|
| 1 | 통합 대시보드 | `/` | 요약 지표, 공지, Quick Links, 시스템 상태 | SFR-001, SFR-012 |
| 2 | 통합검색 | `/integrated-search` | OpenSearch 기반 데이터/모델/문서 검색 및 필터 | SFR-014, SFR-015 |
| 3 | 프로젝트/워크스페이스 | `/project-workspace` | 프로젝트 목록, 상세, 생성 신청, 리소스 할당량 | SFR-016, SFR-018 |
| 4 | 반입·반출 승인 | `/export-approval` | 반출/반입 신청, 승인 workflow, 감사로그 | SFR-009~SFR-012 |
| 5 | 크레딧 관리 | `/credit-manager` | 프로젝트별 크레딧 현황, 사용 이력, 자원 단가 | SFR-017, SFR-018 |
| 6 | K-RMF 증빙관리 | `/krmf-evidence` | K-RMF 통제항목 진척률, 증빙자료, 미흡사항 | SFR-004 |
| 7 | 관리자 콘솔 - 사용자 관리 | `/admin-console` | 사용자 등록/승인/외부 사용자, 소속/역할/접속 서비스 설정 | SFR-002, SFR-003 |
| 8 | 관리자 콘솔 - 권한/RBAC | `/admin-console` | 역할 기반 접근 제어, 메뉴/데이터/서비스 권한 | SFR-005 |
| 9 | 관리자 콘솔 - 정책/감사 로그 | `/admin-console` | 로그인/로그아웃/권한 변경/반출 승인 등 감사 이력 | SFR-002, SFR-004 |
| 10 | Backstage 로그인 선택 | `/` | Guest / Keycloak 인증 선택 | SFR-002 |
| 11 | Keycloak 로그인/로그아웃 | Keycloak Hosted UI | OIDC 인증/로그아웃 | SFR-002 |
| 12 | 서비스/도구 카탈로그 | `/service-catalog` | AI/데이터 도구 조회 및 워크스페이스 신청 | SFR-007, SFR-008, SFR-014 |
| 13 | 제안 게시판 | `/proposal-board` | AI 아이디어 등록, 공감/검토/공지 | SFR-013 |
| 14 | 마이페이지 | `/my-page` | 프로필, 세션, API Key, 알림, 활동 이력 | SFR-019 |
| 15 | 환경설정 | `/environment-settings` | 시스템 파라미터, 보안 정책, 자원할당 기준 | SFR-020 |
| 16 | 육해공군 관리 | `/tenant-management` | 군별 테넌트, 리소스 풀, 쿼터, 사용량 | SFR-021 |
| 17 | OpenMetadata 데이터 카탈로그 | 외부 링크 | 데이터 자산 메타데이터/품질/계보 | SFR-014 |
| 18 | OpenSearch 대시보드 | 외부 링크 | 로그/메트릭 시각화 및 모니터링 | SFR-001, SFR-015 |

### 보안등급 정책

- **보안등급 표준:** `공개 / 내부 / 비밀` (23.6 Hotfix 확정)
- **README 및 일부 소스 코드:** `공개 / 내부 / 비밀` (`packages/app/src/components/*/types.ts`)
- **현재 상태:** UI 레이블은 대부분 정리되었으나, **소스 코드의 타입 정의와 mock 데이터에는 `내`가 남아 있음**. 백엔드에서 보안등급 필터를 강제 적용하는 로직은 미구현.

---

## 7. SFR-001~SFR-021 매핑 요약

| SFR ID | 요구사항 | 기능목록 | 주요 화면 |
|--------|----------|----------|-----------|
| SFR-001 | 국방 지능형플랫폼 메인 포털 | 1~8 | 통합 대시보드 |
| SFR-002 | 메인 포털 로그인/로그아웃 | 9~20 | 로그인, 관리자 콘솔 정책, 마이페이지 세션 |
| SFR-003 | 메인 포털 관리 - 사용자 관리 | 21~35 | 관리자 콘솔 사용자 관리 |
| SFR-004 | 메인 포털 관리 - 정책 및 이력 관리 | 16, 19~20, 30, 44~55, 135~142 | 관리자 콘솔 정책/감사 |
| SFR-005 | 메인 포털 관리 - 권한 관리 | 34, 36~44, 60, 89, 142 | 관리자 콘솔 권한/RBAC |
| SFR-006 | 메인 포털 관리 - 프로그램 및 메뉴 관리 | 56~62 | 관리자 콘솔 메뉴 관리 |
| SFR-007 | AI 작업 환경 생성 요청 | 74 | 서비스/도구 카탈로그 |
| SFR-008 | 데이터 작업 환경 생성 요청 | 73~79 | 서비스/도구 카탈로그 |
| SFR-009 | 프로젝트 반출입서버 관리 | 97~102 | 반입·반출 승인 |
| SFR-010 | AI 개발 성과 반출 관리 | 99~108 | 반입·반출 승인 |
| SFR-011 | 데이터 분석 성과 반출 관리 | 99~104 | 반입·반출 승인 |
| SFR-012 | 플랫폼 연동 | 6, 97~98 | 통합 대시보드, 반입·반출 승인 |
| SFR-013 | 제안게시판 | 143~149 | 제안 게시판 |
| SFR-014 | 카탈로그 조회 | 63~64, 72 | 통합검색, 서비스/도구 카탈로그 |
| SFR-015 | 통합검색 | 5, 65~72 | 통합검색 |
| SFR-016 | 프로젝트 관리 | 41, 80~89, 92~94 | 프로젝트/워크스페이스 |
| SFR-017 | 크레딧 신청 및 조회 | 42, 110~118 | 크레딧 관리 |
| SFR-018 | 워크스페이스 관리 요청 | 8, 41, 88~96, 109~110, 115, 117 | 프로젝트/워크스페이스, 크레딧 관리 |
| SFR-019 | 마이페이지 | 119~130, 135~137 | 마이페이지 |
| SFR-020 | 환경설정 | 131~134 | 환경설정 |
| SFR-021 | 육해공군 관리자 권한 관리 | 150~155 | 육해공군 관리 |

---

## 8. 화면 캡처 자산

`docs/assets/final/`에 18개 PNG 파일 존재:

```text
01-portal-dashboard.png
02-integrated-search.png
03-project-workspace.png
04-export-approval.png
05-credit-manager.png
06-krmf-evidence.png
07-admin-console-user-management.png
08-admin-console-rbac-menu.png
09-admin-console-policy-audit.png
09-backstage-signin.png
09-keycloak-login.png
10-service-catalog.png
11-proposal-board.png
12-my-page.png
13-environment-settings.png
14-tenant-management.png
15-openmetadata-catalog.png
16-opensearch-catalog-index.png
```

최근 추가된 `docs/SCREEN_USER_GUIDE.md`에는 각 캡처에 대한 사용자 지침이 포함되어 있습니다.

---

## 9. 현재 상태: PoC 완료 범위 vs 미구현 범위

### 9.1 PoC 완료 범위

- Backstage 기반 포털 UI 구축
- Keycloak OIDC 로그인 (Guest 로그인 포함)
- OpenSearch 통합검색 (backend proxy 연동)
- OpenMetadata 실행/API 검증
- 12개 주요 화면 mock 기반 구현
- 18개 화면 캡처 및 사용 설명서 작성
- 21개 SFR ↔ 155개 RFP 기능 매핑 및 역검증 보고서

### 9.2 실제 연동 미구현 범위

| 구분 | 미구현 항목 |
|------|-------------|
| 인증/권한 | Keycloak Admin/Event API 연동, role/group claim 전파, Permission Policy 실제 적용 |
| 데이터/검색 | OpenMetadata ↔ 포털 자동 동기화, OpenSearch 실제 업무 데이터 색인, 보안등급 기반 검색 필터 enforcement |
| 프로젝트/워크스페이스 | 실제 워크스페이스 생성 API, Kubernetes namespace 연동, 리소스 quota 적용 |
| 반입/반출 | 파일 저장소(S3/MinIO 등), 승인 workflow 엔진, DLP/마스킹/암호화, 감사로그 DB 저장 |
| 크레딧 | 실제 자원 사용량 수집, 크레딧 차감 로직, 부족 시 자원 제한 enforcement |
| 서비스 카탈로그/제안 | Docker Registry/Helm/PyPI 연동, Proposal DB/API, 첨부파일 저장소 |
| Tenant Management | Kubernetes/OpenStack/CMP 자원 풀 연동, 군별 쿼터 enforcement, 테넌트 경계 분리 |
| 운영/감사 | 감사로그 DB, 보안 이벤트 탐지, K-RMF 증빙 자동 수집, 설정 변경 이력 DB |
| 테스트/품질 | 단위/E2E 테스트 부재, 접근성/반응형/보안 취약점/성능 테스트 미실시 |
| 인프라 | CI/CD 파이프라인 없음, 로깅/모니터링/알림 미구축, 백업/복구 정책 없음 |

---

## 10. 기술부채 및 알려진 이슈

| # | 이슈 | 영향 | 조치 방향 |
|---|------|------|-----------|
| 1 | `packages/app/src/App.test.tsx`에서 `App.createRoot()` TypeScript 오류 | `yarn test` 실패, 개발 서버에는 영향 없음 | 테스트 코드 수정 또는 `@testing-library/react`로 렌더링 방식 변경 |
| 2 | MUI v4 `findDOMNode is deprecated` 경고 | 콘솔 노이즈, 향후 React 버전 호환성 위험 | MUI v5 또는 Backstage 권장 컴포넌트로 마이그레이션 |
| 3 | 모든 업무 기능이 `packages/app/src/components/`에 직접 구현됨 | 정식 Backstage Plugin 구조가 아니라 확장성/유지보수성 낮음 | 필요 시 `plugins/` 아래 정식 플러그인으로 분리 |
| 4 | 모든 업무 화면이 mock data 기반 | 실제 데이터 반영 불가 | 각 기능별 API 클라이언트 및 Backend API 구현 |
| 5 | Backstage permission은 `allow-all-policy` 사용 | 역할/메뉴/데이터 기반 접근 제어 미동작 | Keycloak role/group claim 연동 및 Permission Policy 구현 |
| 6 | OpenSearch 검색 결과에 보안등급/권한 필터 미적용 | 권한 없는 사용자가 고보안 등급 결과 열람 가능 | Backend 검색 API에서 사용자 역할 기반 필터 추가 |
| 7 | `.env` 기반 secret 관리 | 운영 환경에서 적절하지 않음 | Secret Manager/Vault/Kubernetes Secret 도입 |
| 8 | CI/CD 파이프라인 없음 | 수동 배포, 품질 관리 어려움 | GitHub Actions/GitLab CI 등 구축 |
| 9 | GitHub push 인증 이슈 (PAT 만료/노출) | 원격 저장소에 최신 커밋 반영 불가 | PAT 재발급 또는 `gh auth login` |
| 10 | Backend 보안등급 enforcement 미구현 | UI와 실제 데이터 접근 제어 불일치 | 검색/데이터 접근 API에서 보안등급 필터 강제 적용 |

---

## 11. Firebase 서비스 전환을 위한 핵심 고려사항

### 11.1 Firebase Hosting의 한계

- Firebase Hosting은 **정적 웹 호스팅**입니다.
- Backstage는 **Node.js 백엔드가 필수**이며, 개발 모드에서는 webpack-dev-server와 백엔드가 동시에 실행됩니다.
- 따라서 Firebase Hosting만으로는 이 프로젝트를 서비스할 수 없습니다.

### 11.2 가능한 Firebase 아키텍처 후보

#### 후보 A: Firebase Hosting + Cloud Run (권장 후보)

```text
[Internet]
  ↓ HTTPS
[Firebase Hosting]
  ├─ /static/* → 빌드된 React 정적 파일
  └─ /api/*, /auth/*, /api/proxy/* → Cloud Run (Backstage backend container)
[Cloud Run]
  └─ Backstage backend (Node.js 24 컨테이너)
     ├─ Cloud SQL for PostgreSQL (Backstage DB)
     ├─ Secret Manager (OIDC client secret, session secret, DB password, GitHub token)
     ├─ Memorystore for Redis (세션/캐시, 선택)
     └─ 외부 연동: Keycloak / Firebase Auth, OpenSearch, OpenMetadata, Cloud Storage
```

#### 후보 B: Firebase Hosting + Cloud Functions (2세대)

- Backstage backend를 Cloud Functions로 분해하는 방안.
- Backstage의 플러그인 아키텍처와는 맞지 않을 수 있으며, cold start와 request timeout(60분) 이슈.
- 권장하지 않음.

#### 후보 C: Firebase Hosting + Compute Engine / GKE

- 백엔드를 GKE(Google Kubernetes Engine) 또는 Compute Engine VM에서 운영.
- 기존 Docker Compose 기반 인프라를 그대로 Lift & Shift하기 가장 쉬움.
- Firebase Hosting은 단순 정적 파일 서빙 및 reverse proxy 역할.

### 11.3 Firebase 제품 매핑 제안

| 현재 구성 요소 | Firebase/Google Cloud 대안 | 고려사항 |
|----------------|----------------------------|----------|
| Backstage frontend | Firebase Hosting | 정적 빌드 출력물(`packages/app/dist`) 업로드 |
| Backstage backend | Cloud Run / GKE / Compute Engine | Node.js 24 컨테이너화, stateless 설계 필요 |
| 개발 DB (better-sqlite3 in-memory) | Cloud SQL PostgreSQL 또는 Firestore | 운영용 PostgreSQL 권장 |
| Keycloak OIDC | Firebase Authentication + Identity Platform 또는 Cloud Run 상 Keycloak | 군/정부 보안 정책에 따라 Keycloak 유지 가능성 |
| OpenSearch | Firebase에서 직접 대체 제품 없음 → Google Cloud Marketplace OpenSearch 또는 Cloud Logging + BigQuery | 검색 기능 유지를 위해 OpenSearch 클러스터 필요 |
| OpenMetadata | Google Cloud Marketplace OpenMetadata 또는 별도 VM/Cloud Run | 메타데이터 거버넌스 유지 |
| 파일 저장소 (반입/반출) | Cloud Storage for Firebase 또는 GCS | 보안등급별 버킷/ACL 분리 필요 |
| 세션/캐시 | Memorystore for Redis 또는 Firestore | 세션 공유 및 캐싱 |
| Secret | Secret Manager | `.env` 대체 |
| CI/CD | Cloud Build + Firebase Hosting deploy + Cloud Run deploy | GitHub Actions 연동 가능 |
| 모니터링/로깅 | Cloud Monitoring + Cloud Logging | 감사로그 장기 보관 및 알림 |

---

## 12. 컨설팅에 대해 질문하고 싶은 목록

### 아키텍처/배포

1. Firebase Hosting + Cloud Run 조합이 Backstage 백엔드를 운영하기에 적합한가? 아니면 GKE/Compute Engine이 더 나은가?
2. Backstage의 `app-config.production.yaml`에서 `app.baseUrl`과 `backend.baseUrl`을 Firebase Hosting / Cloud Run 도메인으로 설정할 때의 구체적인 값과 CORS 설정은?
3. OpenSearch와 OpenMetadata를 Firebase/Google Cloud에서 어떻게 호스팅하는 것이 비용·운영 측면에서 효율적인가?
4. Keycloak을 그대로 Cloud Run/Compute Engine으로 이전하는 것 vs Firebase Authentication으로 전환하는 것의 장단점은?

### 데이터/보안

5. 보안등급(`공개/내부/비밀`)에 따른 데이터 접근 제어를 Firebase Auth Custom Claims + Firestore Security Rules 또는 Cloud Run 레벨에서 어떻게 구현할 수 있는가?
6. 군별 테넌트 분리를 Firebase 프로젝트 단위 vs GCP 프로젝트 단위 vs 동일 프로젝트 내 tenancy 분리 중 어떤 방식으로 설계하는가?
7. K-RMF 감사로그 및 개인정보/군사정보 마스킹 요구사항을 Cloud Logging + BigQuery 또는 Firestore로 어떻게 충족할 수 있는가?
8. 반출/반입 파일의 안전한 저장과 다운로드 권한 제어를 Cloud Storage + VPC Service Controls 또는 Signed URL로 어떻게 구현하는가?

### 개발/운영

9. mock data 기반의 12개 화면을 실제 Firebase 서비스로 전환할 때의 우선순위와 단계별 접근법은?
10. Backstage Permission Framework를 Firebase Auth Custom Claims와 연동하는 구체적인 방법은?
11. MUI v4에서 MUI v5 또는 Backstage UI 컴포넌트로의 마이그레이션을 Firebase 배포 전에 선행해야 하는가?
12. CI/CD 파이프라인(Cloud Build 또는 GitHub Actions)과 Firebase Hosting/Cloud Run 배포 자동화 샘플은?

### 비용/규제

13. Firebase/Google Cloud로 운영 시 예상 월간 비용 산정에 필요한 최소 사양은?
14. 국방/정부 환경에서 Firebase/Google Cloud 사용 시 고려해야 할 규제/인증(ISMS-P, CC 인증, 클라우드 보안 인증제)은?
15. Firebase 프로젝트와 GCP 프로젝트의 IAM/RBAC을 어떻게 설계하여 운영자/개발자/감사자를 분리할 것인가?

---

## 13. 부록: 주요 문서 목록

| 문서 | 목적 |
|------|------|
| `docs/ARCHITECTURE.md` | 시스템 아키텍처 및 단계별 구현 이력 |
| `docs/TECH_DEBT.md` | 기술부채 및 후속 정리 계획 |
| `docs/INTERNAL_LOGIC_BACKLOG.md` | mock → 실제 연동 변환 목록 |
| `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md` | RFP 1~145 ↔ 화면 매핑 |
| `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md` | SFR-001~SFR-021 역검증 보고서 |
| `docs/SCREEN_USER_GUIDE.md` | 18개 화면 사용 설명서 |
| `docs/USER_MANAGEMENT_DESIGN.md` | 사용자 등록/승인/외부 사용자 설계 |
| `docs/RBAC_MENU_MANAGEMENT_DESIGN.md` | 권한/RBAC 및 메뉴/프로그램 설계 |
| `docs/SECURITY_POLICY_AUDIT_DESIGN.md` | 로그인/비밀번호 정책 및 감사로그 설계 |
| `docs/SERVICE_CATALOG_PROPOSAL_BOARD_DESIGN.md` | 서비스 카탈로그/제안 게시판 설계 |
| `docs/MY_PAGE_ENVIRONMENT_SETTINGS_DESIGN.md` | 마이페이지/환경설정 설계 |
| `docs/TENANT_MANAGEMENT_DESIGN.md` | 육해공군 멀티테넌트 설계 |
| `docs/SEARCH_DESIGN.md` / `SEARCH_IMPLEMENTATION.md` | 통합검색 설계 및 구현 |
| `docs/OPENMETADATA_DESIGN.md` | OpenMetadata 연동 설계 |
| `docs/KEYCLOAK_INTEGRATION.md` / `KEYCLOAK_SETUP.md` | Keycloak OIDC 연동 및 구성 |
| `docs/IMPLEMENTATION_ROADMAP.md` | 구현 로드맵 |
| `docs/RISK_RESPONSE_PLAN.md` | 리스크 및 대응 방안 |
| `docs/FINAL_DELIVERABLES.md` | 최종 산출물 목록 |
| `README.md` | 프로젝트 개요, 실행 방법, 연동 URL |

---

## 14. 부록: 최신 Git 커밋 정보

```text
Commit: 462bda0d646a65e6ee58101cec91cfe4cbdf0ca9
Author: kbitone-bot <bot@kbit.one>
Date:   Sun Jul 5 19:23:17 2026 +0900
Message: Add screen user guide with descriptions for 18 captured screens
```

- **브랜치:** `main`
- **원격:** `https://github.com/KBitone-Company/kt-ai-portal.git`
- **상태:** 로컬 커밋은 생성되었으나 PAT 인증 문제로 push되지 않은 상태입니다.

---

## 15. 마무리 요약

- 이 프로젝트는 **Backstage 기반의 국방 AI 포털 PoC**로, UI와 문서는 완료되었지만 **대부분의 비즈니스 로직은 mock data**입니다.
- Firebase로 서비스하려면 **Firebase Hosting(정적) + Cloud Run/GKE(백엔드) + Cloud SQL/Cloud Storage/Secret Manager** 등의 조합이 필요합니다.
- **OpenSearch와 OpenMetadata**는 Firebase 내 직접 대체 제품이 없어 별도 호스팅(Google Cloud Marketplace 또는 GKE/Compute Engine)이 필요합니다.
- **Keycloak OIDC**를 유지할지 Firebase Authentication으로 전환할지는 보안/규제 요건에 따라 결정해야 합니다.
- **보안등급, 테넌트 분리, K-RMF 감사로그, 반출/반입 파일 통제**는 Firebase/Google Cloud 보안 제품과 맞춤 개발이 병행되어야 합니다.
- 본 문서를 바탕으로 Firebase 기반 아키텍처, 비용, 보안 설계, 마이그레이션 로드맵에 대한 구체적인 조언을 요청합니다.
