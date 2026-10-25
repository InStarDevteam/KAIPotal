# DECISIONS

## 1단계 결정사항

### Node.js 버전

- 현재 시스템에 Node.js 24가 설치되어 있음.
- Backstage 1.38 템플릿의 engines 필드는 `22 || 24`로 명시되어 있어 24를 지원.
- 추가 다운그레이드 불필요.

### 패키지 매니저

- 시스템에 Yarn이 설치되어 있지 않았음.
- Backstage는 Yarn 1.x (Classic)을 권장하지만, 생성된 템플릿은 Yarn 4.13.0을 사용.
- Node.js 내장 Corepack을 활성화하여 Yarn 4.13.0을 사용.

### Backstage 설치 방식

- 공식 CLI인 `npx @backstage/create-app@latest` 사용.
- `--path backstage-portal` 옵션으로 지정된 폴터에 생성.
- `--skip-install` 후 별도 `yarn install`로 의존성 설치.

### 디렉토리 구조

- 프로젝트 루트: `kt-ai-portal/`
- Backstage 앱: `kt-ai-portal/backstage-portal/`
- 인프라: `kt-ai-portal/infra/{keycloak,opensearch,openmetadata}/`
- 문서: `kt-ai-portal/docs/`
- 기록: `kt-ai-portal/notes/`

### 실행 방법

- `yarn start` 명령으로 프론트엔드(3000)와 백엔드(7007)를 동시에 실행.
- 개발용 기본 인증은 Guest로 설정되어 있음.

## 2단계 결정사항

### Keycloak 이미지

- `quay.io/keycloak/keycloak:26.2.4` 사용.
- 개발 모드(`start-dev`)로 실행.

### 관리자 계정

- 개발용으로 `admin/<password>` 사용.
- 운영 시 별도 관리자 계정 및 외부 DB 사용 필요.

### 포트

- Host 8080 / Container 8080 사용.
- 기존 `flask-app` 컨테이너가 8080을 사용 중이어서 중지 조치.

### Realm/Client

- Realm: `kt-ai`
- Client: `backstage`
- Client authentication: On (3단계에서 secret 사용)

### 사용자/역할/그룹

- Realm roles 5개, Groups 5개 동일한 이름으로 설계.
- 테스트 사용자 5명 생성 후 역할/그룹 매핑.

### 설정 방식

- 관리자 콘솔 UI로 기본 생성 수행.
- 반복적인 사용자/역할/그룹 생성은 Keycloak Admin REST API(`admin-cli`)로 자동화.
- 3단계 Backstage 연동 시 `groups`, `roles` Claim 사용 예정.

## 3단계 결정사항

### OIDC Provider 선택

- Backstage 공식 `@backstage/plugin-auth-backend-module-oidc-provider` 사용.
- Keycloak의 OpenID Connect 엔드포인트(`/.well-known/openid-configuration`)를 그대로 사용.

### Frontend API

- Backstage 1.38의 기본 `frontend-defaults`/`@backstage/plugin-auth` API에서는 OIDC 로그인 버튼을 바로 구성하기 어려움.
- PoC에서는 `@backstage/app-defaults`의 legacy `createApp` + `SignInPage` 방식을 채택하여 Keycloak 버튼을 빠르게 노출.

### 인증 흐름

- Frontend `OAuth2.create` API factory로 OIDC 세션 관리.
- `environment: 'development'`로 `auth.providers.oidc.development` 설정과 매핑.
- `defaultScopes`: `openid`, `profile`, `email`.

### 세션/보안

- OIDC PKCE/state 쿠키를 위해 `auth.session.secret` 설정이 필수.
- 환경변수 `AUTH_SESSION_SECRET`으로 분리.
- Client secret은 `AUTH_OIDC_CLIENT_SECRET`으로 분리.
- `.env` 파일은 `.gitignore`에 포함하여 커밋하지 않음.

### 사용자 식별

- `emailLocalPartMatchingUserEntityName` resolver 사용.
- `kt.ai` 도메인 제한 및 catalog에 사용자가 없어도 로그인 허용 (`dangerouslyAllowSignInWithoutUserInCatalog: true`).

### 권한

- 3단계에서는 인증(Authentication)까지만 검증.
- 그룹/역할 기반 권한(Authorization)은 Keycloak client mapper 추가 및 Backstage permission 정책 설계 후 확장.

## 4단계 결정사항

### OpenSearch 버전

- `opensearchproject/opensearch:2.19.1` 및 `opensearchproject/opensearch-dashboards:2.19.1` 사용.
- 2.x 안정 버전 중 최신 버전을 선택.

### 배포 모드

- 개발용 단일 노드(`discovery.type=single-node`)로 구성.
- 볼륨을 통해 데이터 지속성 확보.

### 보안 플러그인

- 개발 편의를 위해 보안 플러그인 비활성화(`DISABLE_SECURITY_PLUGIN=true`).
- OpenSearch 2.12 이상에서 초기 관리자 비밀번호가 필요하여 `OPENSEARCH_INITIAL_ADMIN_PASSWORD` 설정.
- 운영환경에서는 보안 플러그인, TLS, 인증, 계정관리 필수.

### 인덱스 설계

- 인덱스명: `portal-catalog`
- 명시적 mapping으로 `name`은 `text + keyword`, 필터 필드는 `keyword`, 날짜는 `date`로 구성.
- `description`은 풀텍스트 검색 대상으로 `text` 타입 사용.

### 데이터 초기화

- Shell 스크립트(`01-create-index.sh`, `02-seed-sample-data.sh`, `03-search-test.sh`)로 인덱스 생성, 샘플 적재, 검증 수행.
- `run-all.sh`로 전체 절차를 한 번에 실행.

### Backstage 연동 범위

- 4단계에서는 Backstage와 OpenSearch를 직접 연동하지 않음.
- Backstage 통합검색 UI 및 OpenMetadata 연동은 5단계, 10단계에서 진행.

## 5단계 결정사항

### OpenMetadata 버전

- OpenMetadata **1.6.0** 공식 Docker Compose(quickstart) 사용.
- 최신 안정 버전이며, 공식 문서 및 커뮤니티 자료가 풍부함.

### 배포 모드

- Docker Compose 기반 개발용 올인원 실행.
- MySQL, Elasticsearch, OpenMetadata Server, Airflow Ingestion을 단일 Compose로 구성.

### 포트 충돌 회피

- 기존 PoC 서비스와 충돌하는 포트를 회피하기 위해 Elasticsearch(`9200`), MySQL(`3306`), Ingestion(`8080`)의 호스트 포트 매핑 제거.
- OpenMetadata Server UI/API 포트(`8585`)와 Admin/Health 포트(`8586`)만 호스트에 노출.
- OpenMetadata 내장 Elasticsearch(`openmetadata_elasticsearch`)와 `kt-opensearch`를 분리 운영.

### 인증

- PoC에서는 OpenMetadata 기본 로컬 계정(`admin@open-metadata.org`/`admin`) 사용.
- Keycloak SSO 연동은 OIDC provider 등록으로 가능하며, 운영 확장 단계에서 검토.

### Backstage 연동 범위

- 5단계에서는 OpenMetadata API 연계 후보 확보 및 실행 검증에 집중.
- Backstage와의 직접 연동(REST API 호출, OpenSearch 싱크, UI 임베드 등)은 10단계에서 구현.

## 6단계 결정사항

### 플러그인 구현 방식

- 정식 Backstage Plugin(`plugins/project-workspace`) 대신 **PoC 컴포넌트 방식**(`packages/app/src/components/project-workspace/`)을 선택.
- 이유: 현재 Backstage 앱이 `createApp` legacy 방식으로 단순화되어 있어, 정식 플러그인 등록 시 기존 OIDC 로그인 흐름을 해칠 위험이 있음.
- 후속 안정화 단계에서 정식 플러그인 구조로 전환 검토.

### 데이터 연동 범위

- 6단계에서는 **mock data 기반**으로만 화면을 구현.
- 실제 DB/API 연동, Keycloak 그룹 연동, OpenMetadata 연동 등은 7~10단계 및 운영 확장 단계에서 진행.

### 레이아웃

- Backstage `SidebarPage` + `Content`를 사용하여 Sidebar와 메인 콘텐츠 영역을 분리.
- 이를 통해 Sidebar drawer가 콘텐츠를 가리는 문제를 방지하고 기존 Backstage 레이아웃 패턴을 따름.

### 인증

- 기존 Keycloak OIDC 로그인 연동을 유지.
- `Project Workspace` 메뉴는 로그인한 사용자에게 노출되며, 현재 단계에서는 별도 권한 제어 없음.
- 향후 Backstage permission 정책과 Keycloak 역할/그룹을 연계하여 메뉴 접근 제어 검토.

## 7단계 결정사항

### 플러그인 구현 방식

- 6단계와 동일하게 **PoC 컴포넌트 방식**(`packages/app/src/components/export-approval/`)으로 구현.
- 정식 Backstage Plugin 전환은 후속 안정화 단계에서 검토.
- `Project Workspace` 화면과 동일한 패턴을 재사용하여 개발 일관성과 안정성 확보.

### 데이터/파일 연동 범위

- 7단계에서는 **mock data 기반**으로만 화면을 구현.
- 실제 파일 업로드/다운로드, DB/API 연동, 반출 서버 연계는 8~10단계 및 운영 확장 단계에서 진행.

### 보안등급 기준

- `공개`, `내부`, `비밀` 3단계로 통일하여 Project Workspace 및 OpenSearch 샘플 데이터와 일관성 유지.

### 메뉴/라우팅

- `Home`, `Project Workspace`에 이어 `Export Approval` 메뉴를 추가.
- 기존 메뉴와 라우팅을 유지하며 최소한의 `App.tsx` 수정만 수행.

## 8단계 결정사항

### 보안등급 정정

- 7단계 및 이전 단계에서 보안등급을 `공개`, `내부`, `비밀` 3개로 통일.
- 보안등급은 `공개`, `내부`, `비밀` 3개로 통일하여 Project Workspace, Export Approval, OpenSearch 샘플 데이터 간 일관성 유지.

### 플러그인 구현 방식

- 6~7단계와 동일하게 **PoC 컴포넌트 방식**(`packages/app/src/components/credit-manager/`)으로 구현.
- 동일한 패턴을 재사용하여 `Project Workspace`, `Export Approval` 화면과의 일관성 및 안정성 확보.

### 데이터/연동 범위

- 8단계에서는 **mock data 기반**으로만 크레딧 관리 화면 구현.
- 실제 크레딧 차감, 자원 사용량 수집, 과금/결제, 클라우드 자원 제어는 9~10단계 및 운영 확장 단계에서 진행.

### 크레딧 정의

- PoC 기준으로 크레딧은 내부 사용량 관리 단위로 정의.
- 자원별 단가(CPU core-hour, GPU gpu-hour, Memory GB-hour 등)는 내부 계산 예시로 사용.

### 메뉴/라우팅

- `Home`, `Project Workspace`, `Export Approval`에 이어 `Credit Manager` 메뉴 추가.
- 기존 메뉴 및 라우팅을 유지하며 `App.tsx` 수정 최소화.


## 9단계 결정사항

### K-RMF 증빙관리 범위

- PoC 단계에서는 **K-RMF 통제항목, 증빙자료, 보안 미흡사항, 타 수행사 제출자료, 통합진척률 대시보드** 화면을 구현.
- 실제 K-RMF 심사, 감사 보고서, 외부 평가 연동은 운영 확장 단계에서 진행.

### 플러그인 구현 방식

- 6~8단계와 동일하게 **PoC 컴포넌트 방식**(`packages/app/src/components/krmf-evidence/`)으로 구현.
- 동일한 패턴을 재사용하여 `Project Workspace`, `Export Approval`, `Credit Manager` 화면과의 일관성 및 안정성 확보.

### 데이터/연동 범위

- 9단계에서는 **mock data 기반**으로만 증빙관리 화면 구현.
- 실제 파일 업로드/다운로드, DB/API 연동, 감사 시스템 연계, Project Workspace/Export Approval 연동은 10단계 및 운영 확장 단계에서 진행.

### 보안등급 통일

- 보안등급은 `공개`, `내부`, `비밀` 3개로 통일.
- K-RMF 증빙 자료, 데이터 분류 기준, OpenSearch 샘플 데이터 간 일관성 유지.

### 메뉴/라우팅

- `Home`, `Project Workspace`, `Export Approval`, `Credit Manager`에 이어 `K-RMF Evidence` 메뉴 추가.
- 기존 메뉴 및 라우팅을 유지하며 `App.tsx` 수정 최소화.


## 10단계 결정사항

### 통합검색 범위

- 10단계에서는 OpenSearch `portal-catalog` 기반 **키워드/필터 검색**을 우선 구현.
- OpenMetadata 실시간 연동은 후속 단계로 분리.
- 자체 플러그인 데이터 색인은 후속 단계로 분리.
- 임베딩 기반 유사도 검색은 설계만 작성하고 후속 고도화로 분리.
- 권한 기반 검색 결과 필터링은 후속 단계에서 Backstage backend 또는 검색 API 계층에서 처리.

### OpenSearch 연동 방식

- 브라우저에서 직접 OpenSearch를 호출하면 CORS 문제가 발생할 수 있음.
- 따라서 **Backstage backend proxy**(`/api/proxy/search`)를 경유하여 OpenSearch에 접근.
- 개발 편의상 `credentials: dangerously-allow-unauthenticated`를 적용하여 인증 세션 없이도 검색 가능하도록 설정.
- 운영 환경에서는 Keycloak 사용자 인증 기반으로 proxy 접근을 제한해야 함.

### 검색 보안

- PoC 단계에서는 검색 결과 필터링 없이 OpenSearch `portal-catalog` 전체를 조회.
- 실제 운영용 검색보안, 권한 필터링, 임베딩 검색은 이번 단계에서 구현하지 않음.

### 프론트엔드 프록시 호출 방식

- `useApi(configApiRef)`로 `backend.baseUrl`(`http://localhost:7007`)을 읽어 절대 URL을 조합.
- 초기에는 `/api/proxy/search/...` 상대 경로를 사용했으나 webpack-dev-server에서 404가 발생하여 절대 URL로 변경.
- Backstage backend proxy의 rewrite 규칙(`^/api/proxy/search/?` → `/`)에 따라 `portal-catalog/_search`로 전달됨.

### Proxy 인증 설정

- 개발 편의상 `proxy.endpoints.'/search'.credentials: dangerously-allow-unauthenticated` 적용.
- `allowedMethods`에 `GET`, `POST`, `OPTIONS`를 명시하여 OpenSearch `_search` POST 요청이 허용되도록 설정.
- 운영 환경에서는 Keycloak 인증 세션 기반으로 proxy 접근을 제한해야 함.
## 10.1단계 결정사항

### 보안등급 정규화

- 보안등급 enum/타입은 `public`/`internal`/`secret`을 그대로 유지.
- 화면 표시 라벨은 `public` → `공개`, `internal` → `내부`, `secret` → `비밀`로 통일.
- OpenSearch 샘플 데이터의 보안등급은 `공개`, `보안등급 오타`, `비밀`로 유지하며, `normalizeSecurityLevel`에서 `public`/`internal`/`secret`로 정규화한다.
- `SearchFilterPanel`과 `SearchResultList`/`SearchResultDetail`에서는 절대 `보안등급 오타`를 표시하지 않음.
- `SearchApiClient`의 OpenSearch query 생성 시 `internal` 필터는 `내부`로 변환하여 실제 데이터와 일치.

### OpenSearch 데이터

- 현재 `portal-catalog` 인덱스의 `securityLevel` 값은 `공개`, `내부`, `비밀`로 이미 정리되어 있음.
- 향후 재적재가 필요한 경우 `infra/opensearch/scripts/`의 스크립트를 수동으로 실행하도록 안내.
## 10.2단계 결정사항

### 보안등급 최종 정정

- 보안등급은 `공개`, `내부`, `비밀` 3단계로 통일한다.
- 과거 오타 `보안등급 오타`는 정상값으로 사용하지 않는다.
- 코드/문서/샘플 데이터/검색 UI의 보안등급 표시값은 `내부`로 일치해야 한다.
- `normalizeSecurityLevel`에서 `보안등급 오타`는 정상 보안등급으로 처리하지 않으며, UI에도 표시하지 않는다.
## 10.3단계 결정사항

### 보안등급 최종 정정

- 보안등급은 `공개`, `내부`, `비밀` 3단계로 통일한다.
- `보안등급 오타`는 오타이며 정상값으로 사용하지 않는다.
- 코드/문서/샘플 데이터/검색 UI의 `internal` 표시값은 `내부`로 일치해야 한다.
- `보안등급 오타`는 `normalizeSecurityLevel`에서 정상 보안등급으로 처리하지 않는다.
## 11단계 결정사항

### 메인 포털 대시보드 구성

- Home 화면(`/` 경로)을 메인 포털 대시보드로 재구성한다.
- 대시보드는 mock data 기반으로 구성하고, 실제 API 연동은 후속 단계로 분리한다.
- 기존 업무 메뉴 4종(Project Workspace, Export Approval, Credit Manager, K-RMF Evidence)과 Integrated Search로 이동하는 허브 역할을 수행한다.
- 통합검색 바로가기는 `/integrated-search?q=<검색어>`로 이동하며, `IntegratedSearchPage`는 URL 파라미터를 초기 검색어로 반영한다.
- 제안장표 캡처에 적합한 카드형 레이아웃과 큰 숫자 강조를 우선한다.
- 외부 관리도구(OpenMetadata, OpenSearch Dashboards, Keycloak Admin)는 새 탭 링크로 제공한다.

## 11.1단계 결정사항

### OIDC 런타임 환경변수 관리

- Backstage 개발 실행 시 OIDC clientSecret과 session secret은 `backstage-portal/.env`에서 로딩한다.
- `.env` 파일은 `.gitignore`에 포함하여 Git에 포함되지 않도록 관리한다.
- macOS 기본 bash 3.2 호환성을 위해 `scripts/start-dev.sh`에서 `export $(grep -v '^#' .env | grep -v '^$' | xargs)` 방식으로 환경변수를 로딩한다.
- OIDC 로그인 검증은 `admin01` 사용자로 수행하며, 로그인 후 Portal Dashboard에 Keycloak 사용자 정보가 표시되어야 한다.
- 실제 secret 값은 문서나 Git에 기록하지 않는다.

## 12단계 결정사항

### 최종 산출물 정리

- 12단계에서는 기능 추가보다 최종 산출물과 시연자료 정리를 우선한다.
- 최종 산출물은 `docs/FINAL_DELIVERABLES.md`, 데모 시나리오는 `docs/DEMO_SCRIPT.md`, 기술 부채는 `docs/TECH_DEBT.md`에 각각 정리한다.
- 주요 화면은 `docs/assets/final/`에 캡처하여 제안장표 및 시연자료로 활용한다.
- 캡처가 어려운 화면은 문서에 보류 사유를 기록하고, 시연 시 실제 URL로 대체한다.

### PoC 범위와 운영 전환

- 현재 PoC는 mock data 기반 업무 화면과 일부 실제 인프라(Keycloak, OpenSearch, OpenMetadata) 연동을 결합한 구조다.
- 운영 전환 시 DB/API/권한/보안/배포 구조를 재설계한다.
- 정식 Backstage Plugin 전환은 중장기 과제로 분리한다.

### 보안/secret 관리

- 실제 secret 값은 문서와 Git에 기록하지 않는다.
- `.env`는 `.gitignore`에 포함하여 Git에 포함되지 않도록 관리한다.
- PoC 환경에서 노출된 Keycloak Client Secret은 필요 시 재생성한다.

## 13단계 결정사항

### 포털 명칭 변경

- 공식 명칭을 `국방지능화플랫폼`으로 확정하고, 영문 보조명 `K-Defense Intelligence Platform`을 함께 사용한다.
- 기존 `K-Defense AI Data Portal`은 더 이상 메인 타이틀로 사용하지 않으며, 문서에서는 이전 명칭으로만 언급한다.
- `app-config.yaml`, Portal Dashboard Hero, README 및 주요 문서 제목에 새 명칭을 반영한다.

### Admin Console 구현 방식

- 6~11단계와 동일하게 **PoC 컴포넌트 방식**(`packages/app/src/components/admin-console/`)으로 구현한다.
- 내부 DB/API/Keycloak 관리 로직은 13단계에서 구현하지 않으며, mock data 기반 화면을 우선 확보한다.
- Admin Console은 사용자 등록 신청, 사용자 관리, 권한/역할, 로그인 정책, 비밀번호 정책, 감사 로그, 메뉴 관리, 요구사항 대응 현황 패널로 구성한다.
- 사이드바 메뉴와 Portal Dashboard Quick Links에 `Admin Console`을 추가하여 관리자 접근 경로를 노출한다.

### 요구사항 대응 현황 문서화

- `docs/REQUIREMENT_SCREEN_COVERAGE.md`를 신규 작성하여 요구사항 PDF 대비 현재 화면 충족도와 후속 단계를 정리한다.
- Admin Console 추가 후 화면 기준 충족도를 약 80% 내외로 판단하고, 내부 로직 연동은 14~18단계로 분리한다.

## 14단계 결정사항

### 사용자 관리 화면 상세화 범위

- 13단계에서 추가한 `Admin Console` 내부 탭을 유지하고, 사용자 등록/승인/외부 사용자 관리 영역을 상세화한다.
- 신규 메뉴를 별도로 추가하지 않고, Admin Console 기존 탭 구조 내에서 `외부 사용자 관리` 탭을 추가한다.
- 실제 Keycloak 사용자 생성/수정 API는 호출하지 않으며, mock state 변경으로만 workflow를 보여준다.

### 사용자 등록 승인 workflow

- 등록 신청 상태는 `신청 → 본인확인완료 → 검토중 → 승인` 또는 `반려/보완요청 → 재신청 → 검토중` 흐름을 mock으로 구현한다.
- 상태 변경 시 `UserStatusHistoryPanel`에 이력이 추가되도록 하여 감사 추적성을 시각적으로 보여준다.

### 외부 사용자 관리

- 외부 사용자 전용 목록 패널을 추가하여 접속 기간, 계약사, 부여 역할, 접근 서비스를 한눈에 확인할 수 있게 한다.
- 등록/수정/연장/잠금 버튼은 mock 동작 또는 비활성 처리하여 실제 연동 전 UI 예시를 제공한다.

### 설계 문서화

- 사용자 관리 영역의 요구사항 대응 범위, 현재 구현 범위, 후속 Keycloak/DB 연동 방향을 `docs/USER_MANAGEMENT_DESIGN.md`에 정리한다.

## 15단계 결정사항

### 권한/RBAC 화면 상세화 범위

- 13~14단계 `Admin Console` 기존 탭 구조를 유지하고, `권한 / 역할` 탭 내부부에 10개 서브 화면을 추가한다.
- 추가 영역: 역할 목록/상세, 권한 매트릭스, 그룹 관리, 사용자/그룹 매핑, 프로젝트별 역할, 서비스별 권한, 데이터 접근 등급, 승인 권한, 조직 변경 인계, 권한 변경 감사이력.
- 실제 Keycloak Role/Group API는 호출하지 않으며, mock data 및 상태 전환으로 화면을 구성한다.

### 메뉴/프로그램 관리 상세화 범위

- `메뉴 관리` 탭 내부부에 4개 서브 화면을 추가한다.
- 추가 영역: 메뉴 트리, 메뉴 상세/이동/기능 연결, 메뉴 권한 연결, 프로그램 관리.
- 메뉴 생성/이동/저장 버튼은 mock 동작 또는 비활성 처리하여 실제 연동 전 UI 예시를 제공한다.

### 설계 문서화

- 권한/RBAC 및 메뉴/프로그램 관리 영역의 요구사항 대응 범위, 현재 구현 범위, 후속 Keycloak/DB 연동 방향을 `docs/RBAC_MENU_MANAGEMENT_DESIGN.md`에 정리한다.

## 16단계 결정사항

### 로그인/비밀번호 정책 화면 상세화 범위

- 13~15단계 `Admin Console` 기존 탭 구조를 유지하고, `로그인 정책` 탭 내부 탭에 4개 서브 화면을 추가한다.
- 추가 영역: 로그인 정책 상세, 로그인 실패 차단, 중복 로그인, 자동 로그아웃/세션.
- `비밀번호 정책` 탭 내부 탭에 4개 서브 화면을 추가한다.
- 추가 영역: 비밀번호 정책 상세, 비밀번호 복잡도, 비밀번호 만료/잠금 현황, 계정 잠금 정책.
- 실제 Keycloak password policy / event API는 호출하지 않으며, mock data 및 상태 전환으로 화면을 구성한다.

### 감사 로그 화면 상세화 범위

- `감사 로그` 탭 내부 탭에 8개 서브 화면을 추가한다.
- 추가 영역: 감사 로그 대시보드, 통합 감사 로그, 로그인 이력, 로그아웃 이력, 비밀번호 변경 이력, 사용자 접근 로그, 사용자 정보수정 로그, 보안 감사, 관리자 조치 이력.
- 위험 등급 및 이벤트 유형은 `AuditRiskChip`, `AuditEventTypeChip` 컴포넌트로 시각화한다.
- 실제 Keycloak event log / DB 감사 테이블 연동은 하지 않으며, mock data 및 상태 전환으로 화면을 구성한다.

### 설계 문서화

- 로그인/비밀번호 정책 및 이력/감사로그 영역의 요구사항 대응 범위, 현재 구현 범위, 후속 Keycloak/DB 연동 방향을 `docs/SECURITY_POLICY_AUDIT_DESIGN.md`에 정리한다.

## 17단계 결정사항

### 서비스/도구 카탈로그 화면 범위

- 기존 Admin Console 내부 탭 구조를 건드리지 않고, 포털 업무 메뉴로 별도 `Service Catalog` 기능을 추가한다.
- 경로는 `/service-catalog`, Sidebar 메뉴는 `Service Catalog`로 표시한다.
- 구성 요소: 요약 카드, 카테고리 탭, 도구 목록/상세, 도구 선택 패널, 직접 입력 요청, 요구사항 대응 현황.
- 실제 OpenMetadata/Docker Registry/PyPI Mirror 연동은 하지 않으며, mock data 및 상태 전환으로 화면을 구성한다.
- 보안등급은 `공개`/`내부`/`비밀`로 표시한다.

### 제안 게시판 화면 범위

- 기존 Admin Console 구조를 건드리지 않고, 포털 업무 메뉴로 별도 `Proposal Board` 기능을 추가한다.
- 경로는 `/proposal-board`, Sidebar 메뉴는 `Proposal Board`로 표시한다.
- 구성 요소: 요약 카드, 구분 탭, 제안 목록/상세, 제안 등록 폼, 공감/추천/관심/댓글 UI, 관리자 검토, 요구사항 대응 현황.
- 실제 Proposal DB/API/알림/첨부파일 연동은 하지 않으며, mock data 및 상태 전환으로 화면을 구성한다.
- 제안 구분은 `AI 모델 개발`, `빅데이터 분석 모델 개발`, `데이터셋 구축`, `LLM/RAG 서비스`, `MLOps 자동화`, `데이터 시각화`, `기타`로 표시한다.

### Portal Dashboard 반영

- Quick Links에 `Service Catalog`, `Proposal Board`를 추가한다.
- 요약 카드에 `등록 도구`, `신규 제안`, `검토 대기 제안`을 추가하되, 기존 레이아웃을 최소한으로 수정한다.

### 설계 문서화

- 서비스/도구 카탈로그 및 제안 게시판 영역의 요구사항 대응 범위, 현재 구현 범위, 후속 OpenMetadata/Docker/PyPI/DB 연동 방향을 `docs/SERVICE_CATALOG_PROPOSAL_BOARD_DESIGN.md`에 정리한다.


## 18단계 결정사항

### 마이페이지/환경설정 화면 범위

- 기존 화면을 건드리지 않고, 포털 업무 메뉴로 별도 `My Page`, `Environment Settings` 기능을 추가한다.
- 경로는 각각 `/my-page`, `/environment-settings`이며, Sidebar 메뉴에 동일 이름으로 표시한다.
- My Page 구성: 프로필, 이메일 확인, 비밀번호 변경, 활성 세션, 내 프로젝트/워크스페이스, 자원 사용 이력, 크레딧 사용 내역, 알림 설정, 개인 API Key, 내 활동 로그, 요구사항 대응 현황.
- Environment Settings 구성: 시스템 파라미터, 보안 정책, 자원할당 기준, 운영 설정, 변경 이력, 요구사항 대응 현황.
- 실제 Keycloak User Profile/Session/Password/Email, DB, Notification, API Key Vault, 운영 설정 반영 연동은 하지 않으며, mock data 및 상태 전환으로 화면을 구성한다.

### 요구사항 대응 현황 공통화

- 마이페이지/환경설정/향후 화면에서 재사용할 수 있도록 `packages/app/src/components/common/RequirementCoveragePanel.tsx`를 추가한다.

### 설계 문서화

- 마이페이지 및 환경설정 영역의 요구사항 대응 범위, 현재 구현 범위, 후속 연동 방향을 `docs/MY_PAGE_ENVIRONMENT_SETTINGS_DESIGN.md`에 정리한다.

## 19단계 결정사항

### 육해공군 관리자 권한 및 멀티테넌트 관리 화면 범위

- 기존 화면을 건드리지 않고, 포털 업무 메뉴로 별도 `Tenant Management` 기능을 추가한다.
- 경로는 `/tenant-management`, Sidebar 메뉴는 `Tenant Management`로 표시한다.
- 구성: 요약 카드, 군별 테넌트 개요, 위임관리 체계, 군별 리소스 풀, 군별 쿼터 관리, 사용량 대시보드, 군별 프로젝트 사용량, 테넌트 경계/분리 정책, 쿼터 변경 이력, 요구사항 대응 현황.
- 실제 Kubernetes namespace/resource quota, OpenStack project/quota, CMP 자원 할당 API, Keycloak group/role, DB 연동은 하지 않으며, mock data 및 상태 전환으로 화면을 구성한다.
- 차트 라이브러리를 추가하지 않고, MUI Card/Table/LinearProgress/Chip 중심으로 구현한다.

### Portal Dashboard 반영

- Quick Links에 `Tenant Management`를 추가한다.
- 요약 카드에 `테넌트 수`, `군별 프로젝트`, `쿼터 변경 대기`, `과다 사용 경고`를 추가하되, 기존 레이아웃을 최소한으로 수정한다.

### 설계 문서화

- 육해공군 관리자 권한 및 멀티테넌트 관리 영역의 요구사항 대응 범위, 현재 구현 범위, 후속 연동 방향을 `docs/TENANT_MANAGEMENT_DESIGN.md`에 정리한다.


## 20단계: 최종 요구사항 추적표 및 제안서용 화면 정리

### 결정사항

1. **문서화 우선 전략**  
   20단계에서는 신규 기능 개발보다 기존 14~19단계 산출물을 정리하고 제안서용 문서/캡처를 만드는 것을 우선으로 하였다.  
   이를 위해 6개 신규 문서(FINAL_REQUIREMENT_TRACEABILITY_MATRIX, SCREEN_TO_RFP_MAPPING, PROPOSAL_SCREENSHOT_CATALOG, INTERNAL_LOGIC_BACKLOG, PROPOSAL_SUMMARY_TEXT, DOCUMENT_INDEX)를 작성하고 9개 문서를 최종 갱신하였다.

2. **요구사항 추적표 작성 방식**  
   원본 견적용 기능목록 1~155 파일이 저장소에 없으므로, 사용자가 제공한 그룹핑 기준과 구현된 화면을 바탕으로 155개 행을 유추하여 작성하였다.  
   RFP ID는 기능번호를 `RFP-001` 형태로 매핑하였으며, 외부 견적 문서와 대조하여 보강할 수 있도록 비고를 남겼다.

3. **화면 캡처 보강**  
   기존 `docs/assets/final/`에 없었던 Admin Console(사용자 관리, 권한/RBAC, 정책/감사), Service Catalog, Proposal Board, My Page, Environment Settings, Tenant Management 캡처를 신규로 보강하였다.  
   OpenMetadata/OpenSearch 캡처 파일명을 제안서 권장명(15, 16)으로 변경하였다.

4. **보안등급 오타 최종 정리**  
   19단계에서 누락된 `tenant-management/types.ts`와 `mockTenantManagementData.ts`의 `보안등급 오타` 오타를 `내부`로 최종 수정하였다.  
   문서 내역(CHANGE_SUMMARY, SEARCH_IMPLEMENTATION, DECISIONS)의 역사적 기록은 그대로 유지한다.

5. **GitHub push 실패 처리**  
   15~20단계까지 PAT 인증 문제로 push가 실패할 것으로 예상되며, 로컬 커밋을 생성하고 보고서에 기록한 뒤 `kimi_done.sh`를 실행한다.  
   push 실패를 이유로 문서 갱신이나 후처리를 중단하지 않는다.

### 선택/대안

- 대안: 일부 누락 캡처(도구 상세, Credit Manager 차트 등)를 21단계에서 추가 보강하기로 보류
- 대안: 실제 연동이 필요한 후속 개발 항목은 `INTERNAL_LOGIC_BACKLOG.md`로 분리하여 제안/견적 단계에서 활용


## 20.5단계: 포털 명칭, 메뉴 한글화, UI 색상 안정화

### 결정사항

1. **한글 공식 사이트명 변경**  
   기존 `국방지능화플랫폼`에서 `국방지능형플랫폼포털`로 변경한다.  
   영문 보조명 `K-Defense Intelligence Platform`은 유지한다.  
   CHANGE_SUMMARY/WBS/TODO의 과거 단계 기록과 DECISIONS의 13단계 결정사항은 역사적 이력으로 남기며, 현재 문서/화면에는 새 명칭을 사용한다.

2. **메뉴 한글화 범위**  
   Sidebar 표시명, Portal Dashboard Quick Links 표시명, 주요 화면 제목만 한글화한다.  
   라우트 path, 컴포넌트명, 파일명, 영문 보조명은 그대로 유지한다.

3. **Admin Console 탭 라벨 정리**  
   `권한 / 역할`에서 슬래시 앞뒤 공백을 제거하여 `권한/역할`로 통일한다.

4. **색상 보완 방식**  
   글로벌 MUI theme 변경은 Backstage 기본 theme와의 충돌 위험이 있으므로 최소화한다.  
   Dashboard Hero 그라데이션과 Summary Card 상단 accent, Quick Link Card border 색상만 조정하여 국방/공공 플랫폼 느낌을 낸다.

5. **캡처 재촬영은 21단계로 이관**  
   20.5단계에서 사이트명/메뉴/색상이 변경되므로 기존 캡처는 21단계에서 한글 메뉴 기준으로 재촬영한다.  
   PROPOSAL_SCREENSHOT_CATALOG.md에 재촬영 필요 상태를 기록한다.


## 22단계: 제안서 초안 및 견적서 초안 작성

### 결정사항

1. **제안서 초안 문서화 방식**  
   제안서 본문, 목차, 발표자료, 견적서, RFP 매핑 근거, 로드맵, 리스크 대응방안을 각각 별도 Markdown 파일로 분리하여 작성한다.  
   이는 23단계에서 HWP/DOCX/PPTX/Excel로 변환할 때 섹션별로 재사용하기 용이하도록 하기 위함이다.

2. **견적서는 M/M 기준 초안만 작성**  
   실제 금액 산정은 인력 단가, 일정, 외부 연동 범위에 따라 변동 가능하므로, 본 단계에서는 M/M 기준 초안만 작성한다.  
   `ESTIMATION_TABLE.md`는 6개월/148 M/M 기준의 개략 산정이며, `ESTIMATE_DRAFT.md`는 기능별 세부 공수 기준의 133.5 M/M 초안이다.

3. **발표자료는 PPT로 변환하지 않음**  
   22단계에서는 슬라이드별 제목/메시지/캡처/멘트만 Markdown으로 정리하고, 실제 pptx 파일은 23단계에서 생성한다.

4. **보안등급 문맥 최종 정리**  
   제안서 제출용 문서와 패키지 README에는 보안등급 오타 표현을 남기지 않는다.  
   CHANGE_SUMMARY, WBS, DECISIONS의 과거 기록은 역사적 이력으로 유지하되, 제안서 패키지에는 포함하지 않는다.

5. **proposal-package는 문서 + 캡처 + zip으로 구성**  
   22단계 산출물을 `proposal-package/`에 복사하고 README를 갱신하여, 제안서 작성자가 별도로 파일을 찾지 않아도 되도록 한다.  
   zip 파일은 screenshots와 모든 초안 문서를 포함하여 재생성한다.




## 22.2단계: 보안등급 표준값 최종 재검증 및 수정

### 결정사항

1. **보안등급 표준값 확정**
   보안등급 표준은 반드시 `공개` / `내부` / `비밀`로 통일한다.
   잘못된 보안등급 표기는 코드, 문서, proposal-package 어디에도 남기지 않는다.

2. **이력 기록 원칙**
   CHANGE_SUMMARY나 DECISIONS에 잘못된 표기를 반복 인용하지 않는다.
   필요한 경우 “잘못된 보안등급 표기를 정정했다”로만 기술한다.

3. **제출용 문서 검증**
   `docs/*`, `proposal-package/*`, `README.md`, `backstage-portal/README.md`에서
   보안등급 오타 문자열이 없음을 grep으로 확인한다.

4. **proposal-package 갱신**
   보안등급 표기를 정정한 문서를 `proposal-package/`에 다시 복사하고 zip을 재생성한다.


---

## 23단계: 제안서/PPT/견적서 최종 산출물 작성

### 결정사항

1. **최종 제안서 형식**
   Markdown 최종본(`docs/FINAL_PROPOSAL.md`)과 동일 내용의 패키지 본문(`proposal-package/국방지능형플랫폼포털_제안서.md`)을 동시에 작성한다.

2. **발표자료 형식**
   `docs/PROPOSAL_SLIDE_DRAFT.md` 초안을 바탕으로 23장 PPTX를 생성하고, 관련 화면 캡처를 직접 삽입한다.

3. **견적서 형식**
   `docs/ESTIMATE_DRAFT.md`와 `docs/ESTIMATION_TABLE.md`를 통합하여 5시트 Excel 파일로 작성한다.

4. **제출 패키지**
   screenshots, README.md, 제안서.md, PPTX, XLSX, 핵심 초안 문서를 포함하여 `kt-ai-portal-proposal-materials.zip`을 재생성한다.

---

## 23.5단계: 최종 산출물 요구사항 역검증

### 결정사항

1. **검증 대상**
   제안서 본문, PPTX, XLSX, 요구사항 추적표, 화면-RFP 매핑, RFP 매핑 근거, 견적 초안, 캡처 목록/캡션을 모두 검증한다.

2. **검증 기준**
   - 기능목록 1~155 모두 매핑되어야 한다.
   - SFR-001~SFR-021은 별도 정의가 없을 경우 매핑 불가로 기록한다.
   - 제안서/PPT/견적서의 기능명·화멸명이 일치해야 한다.
   - 화면 캡처 18개가 설명과 일치해야 한다.
   - 보안등급은 `공개 / 내부 / 비밀`만 사용해야 한다.
   - 미구현 항목은 PoC 한계 또는 후속 구축 범위로 명확히 표시해야 한다.

3. **산출물**
   검증 결과를 `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`로 작성한다.
---

## 23.6단계: 최종 검증 보고서 Hotfix

### 결정사항

1. **보안등급 표준 확정**
   모든 문서와 proposal-package에서 보안등급은 반드시 `공개 / 내부 / 비밀`로 통일한다.

2. **SFR-001~SFR-021 매핑**
   SFR-001~SFR-021은 상위 요구사항으로 정의되며, 기능목록 1~155 및 제안서 주요 화면과 매핑 완료로 처리한다.

3. **검증 보고서 수정**
   `docs/FINAL_REQUIREMENT_VALIDATION_REPORT.md`의 SFR 평가를 `통과`로 수정하고 매핑표를 추가한다.

4. **산출물 동기화**
   SFR 매핑 및 보안등급 표기 정정 내용을 proposal-package의 Markdown/PPTX/XLSX/zip에도 반영한다.

---

## 24단계: Firebase + Cloud Run 데모 배포 준비

### 결정사항

1. **데모 배포 목표**
   인터넷에서 `<sub>.kbcosmos.com`으로 국방지능형플랫폼포털 PoC 사이트에 접속할 수 있도록 한다.
   기능 완성보다 **제안팀의 인터넷 데모 접속 가능성**이 1차 목표다.

2. **외부 연동 금지**
   데모 배포에서는 Keycloak 운영 전환, OpenSearch/OpenMetadata 외부 연동, 실제 DB/API, Kubernetes/OpenStack/CMP 연동, 크레딧/반출 실제 구현을 하지 않는다.
   통합검색은 OpenSearch proxy 실패 시 mock fallback을 사용한다.

3. **인증 방식**
   데모 config에서는 Guest 인증만 사용한다.
   추가로 브라우저 세션 기반의 간이 접근코드(`PreviewAuthGate`)를 적용하여 데모 URL 유출 시 최소한의 보호를 제공한다.
   접근코드는 실제 운영 인증/인가 수단이 아니며, 번들에 포함될 수 있다는 한계를 문서화한다.

4. **인프라 선택**
   정적 프론트엔드는 Firebase Hosting에 배포하고, 백엔드 컨테이너는 Cloud Run(asia-northeast3)에 배포한다.
   Firebase Hosting rewrite 규칙으로 모든 경로를 Cloud Run 서비스로 연결한다.

5. **커스텀 도메인**
   코드/설정에 도메인을 고정하지 않고 환경변수/문서로 처리한다.
   가비아에서 `<sub>.kbcosmos.com` CNAME을 Firebase Hosting 대상으로 연결하고, Firebase가 HTTPS 인증서를 자동 발급하도록 한다.

6. **배포 자동화 범위**
   로컬에서 실행하는 빌드/배포 스크립트(`build-demo.sh`, `deploy-demo-cloudrun.sh`, `deploy-demo-firebase.sh`)를 먼저 작성한다.
   CI/CD 자동화는 25단계 이후 후속 검토한다.


## 27단계 결정사항

### 요구사항 확장 범위

- 기존 155개 기능목록을 최신 사전규격 기준 163개로 확장
- 신규 8개 기능은 기존 화면(Integrated Search, Project Workspace, Credit Manager, Export Approval)에 매핑하되, 실제 연동은 후속 개발로 분리
- SFR-012(플랫폼 연동), SFR-016(프로젝트 관리), SFR-017(크레딧) 범위 확대

### 데이터 관리 방식

- 실제 DB/Firestore 연동 없이 `mockRequirementProgressData.ts`에 정적 mock data로 관리
- 추후 API 연동 시 동일한 `types.ts` 인터페이스를 재사용

### 문서 갱신

- 14개 문서에 155→163 확장, 신규 기능, 변경 SFR, 후속 개발 항목을 반영
- 보안등급 표기 `공개 / 내부 / 비밀` typo를 `공개 / 내부 / 비밀`로 최종 정정


## 28단계 결정사항

### 메뉴 재정렬 기준

- RFP/SFR 요구사항 흐름에 맞춰 12개 메뉴를 6개 그룹으로 재분류
- 기존 라우트 URL과 컴포넌트 파일명은 그대로 유지
- 관리자 전용 메뉴 제어는 29단계에서 구현하며, 이번 단계에서는 `visibleTo` 필드만 준비

### Sidebar 구현 방식

- Backstage `SidebarGroup`을 이용해 그룹 라벨 표시
- `Tooltip`으로 메뉴 항목에 관련 SFR 정보 표시
- 메뉴 정의를 `portalMenuDefinitions.ts` 상수로 분리하여 향후 관리자 제어에 재사용

### Quick Links 정렬

- Dashboard Quick Links를 왼쪽 메뉴 순서와 동일하게 재정렬
- 마이페이지, 환경설정 Quick Link를 추가


## 29단계 결정사항

### 관리자 전용 메뉴 제어 기준

- 왼쪽 메뉴 항목에 `visibleTo: 'admin'` 속성을 추가하여 관리자 전용 메뉴 표시
- `AppLayout`에서 `useDemoAdmin()`의 `isAdmin` 또는 `sessionStorage.__kt_ai_portal_admin_preview__ === 'true'`일 경우 관리자 메뉴 표시
- 관리자 메뉴: `관리자 콘솔`, `요구사항 진도표`

### 관리자 판별 방식

- Firebase Auth Google 로그인 사용자 중 `app.auth.adminEmails` 설정에 포함된 이메일을 관리자로 판별
- 로컬 개발/검증용으로 `sessionStorage.__kt_ai_portal_admin_preview__ = 'true'` 설정 시 관리자 화면 접근 가능
- sessionStorage 프리뷰 모드는 검증용이며 운영 환경에서는 제거 필요

### 직접 URL 접근 차단

- `AdminOnlyGuard.tsx`를 통해 관리자가 아닌 사용자의 `/requirement-progress` 직접 접근 차단
- 차단 시 "접근 권한이 없습니다" 안내 화면과 "통합 대시보드로 이동" 버튼 표시

### 요구사항 진도표 화면 구성

- 4개 탭으로 구성: SFR별 진도표, 기능목록 상세, 변경이력, 질의사항
- 요약 카드에서 전체 SFR 21개, 전체 기능 163개, 화면 구현/부분 구현/후속 개발/검토 필요 건수를 한눈에 표시
- mock data 기반으로 운영 연동 전까지 제안/사업관리 검토용으로 활용

### 이미지 처리 오류 대응

- 이전 채팅방에서 이미지 처리 오류가 반복되어 새 컨텍스트에서 작업을 이어 받음
- 29단계 검증 결과는 Playwright snapshot과 콘솔 로그로 기록하며, 스크린샷 파일 저장은 보류


## 29.1단계 결정사항

### Firebase Web App 설정값 주입 방식

- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`를 빌드 시 환경변수로 주입
- 실제 값은 문서/README/CHANGE_SUMMARY/로그에 기록하지 않음
- `storageBucket`, `messagingSenderId`, `measurementId`, `getAnalytics`는 이번 단계에서 추가하지 않음
- Firebase Auth용 `initializeApp` 설정만 사용

### 데모 배포 범위

- 29.1단계에서는 Firebase Hosting 정적 frontend 재배포만 수행
- Cloud Run backend는 이전 revision을 그대로 사용하며, `/api/auth/guest/refresh` 404는 별도 Cloud Run 재배포로 해소
- Docker daemon 구동 후 `deploy-demo-cloudrun.sh`로 backend 재배포 예정

### 로컬 gcloud CLI 설치

- Homebrew 설치가 권한 문제로 실패하여 프로젝트 루트 `.gcloud/`에 로컬 SDK 설치
- `uv`로 Python 3.12 설치 후 `CLOUDSDK_PYTHON` 환경변수로 gcloud 실행
- `.gcloud/`는 `.gitignore`에 추가하여 커밋 대상에서 제외

### 검증 방식

- Playwright로 데모 사이트 접근 코드 입력, 일반 사용자 메뉴 제한, 관리자 프리뷰 모드, 4개 탭 데이터 건수를 자동화하여 확인
- SFR별 진도표 21건, 기능목록 상세 163건, 변경이력 13건, 질의사항 7건 표시 확인



## 29.2단계 결정사항

### Cloud Run backend 재배포 방식

- 29.1단계에서 빌드한 `kt-ai-portal-demo:latest` image를 그대로 사용
- Artifact Registry push 후 `gcloud run deploy`로 revision 업데이트
- Firebase Hosting rewrite는 `serviceId` 기반으로 자동으로 새 revision을 가리키므로 별도 수정 불필요

### docker-credential-gcloud PATH 문제

- 로컬 `.gcloud/` SDK 설치로 인해 `docker-credential-gcloud`가 PATH에 없어 `./scripts/deploy-demo-cloudrun.sh`의 `docker push`가 실패
- `gcloud auth configure-docker`로 docker config 등록 후에도 동일 증상
- 해결: 직접 `docker tag` / `docker push` 실행 시 절대 PATH로 `.gcloud/google-cloud-sdk/bin` 포함
- 이후 `gcloud run deploy`도 동일 PATH 환경에서 실행

### auth refresh 404 원인 및 조치

- 원인: Cloud Run이 이전 backend revision을 Serving 중이어서 `/api/auth/guest/refresh` route가 없음
- 조치: 최신 backend image로 revision 교체
- 결과: `/api/auth/guest/refresh`가 200 응답 반환

### 남은 경고 처리

- `findDOMNode is deprecated`: Material-UI/Backstage 낸  deprecation 경고, 이번 단계에서 수정하지 않음
- `WebSocket connection to ws://localhost:3000/ws failed`: 개발 서버 HMR용 WebSocket, production 빌드에서도 남아있으나 기능 영향 없음
- 위 경고들은 TECH_DEBT에 기록하고 추후 정리


## 30단계 결정사항

### 요구사항 진도표 → 대응현황 메뉴 전환

- 기존 `/requirement-progress` 메뉴는 `/requirement-coverage`로 통합
- `/requirement-progress` route는 `/requirement-coverage`와 동일한 `RequirementCoveragePage`를 렌더링하도록 별칭 처리
- Sidebar 메뉴 이름을 `요구사항 대응현황`으로 변경하고, `요구사항 진도표` 메뉴는 노출하지 않음

### 신규 메뉴 설계

- `요구사항 대응현황`: 메뉴/SFR/기능 단위로 RFP 요구사항 대응 현황 조회
- `플랫폼 API 연계현황`: 포털 ↔ 플랫폼 연계 설계안/API 후보 목록 조회
- 두 메뉴 모두 `group: 관리/보안`, `visibleTo: 'admin'`, `AdminOnlyGuard` 적용

### 데이터/화면 구성

- 요구사항 대응현황은 기존 `requirement-progress` mock 데이터를 재사용
- 메뉴 단위 커버리지는 `portalMenuDefinitions` 기준 14개 메뉴(13개 일반 + 2개 관리자 포함, requirement-progress/coverage 통합 후 14개)에 매핑
- 플랫폼 API 연계현황은 20개 연계 후보를 mock 데이터로 정의, 실제 연동 완료 API가 아님을 명시

### CSV 다운로드

- `xlsx` 라이브러리 추가 지양
- UTF-8 BOM이 포함된 CSV로 생성하여 Excel 호환성 확보
- 다운로드 대상: 메뉴 대응현황, 기능 대응현황, 플랫폼 API 연계현황

### 문서화

- 관리자 가이드, API 연계 설계 계획, 포털/플랫폼 역할 경계 문서를 별도 Markdown으로 작성
- README, backstage-portal/README, DOCUMENT_INDEX 등 인덱스 문서에 신규 문서 반영
- 보안등급은 기존 결정(`공개 / 낮음(낮) / 비밀`)을 유지하되, 신규 문서에서도 통일하여 기술

### 보안

- 관리자 메뉴는 Sidebar 필터링 + 페이지 가드 이중으로 제어
- production에서 직접 URL 접근 시에도 `AdminOnlyGuard`에 의해 차단됨

## 31단계 결정사항

### 업무흐름/연계 시나리오 메뉴 추가

- 신규 관리자 전용 메뉴 `업무흐름/연계 시나리오`(`/workflow-scenarios`) 추가
- `group: 관리/보안`, `visibleTo: 'admin'`, `AdminOnlyGuard` 적용
- 아이콘은 `MapIcon` 사용

### 화면 구성

- 3개 탭: 포털 역할 요약, 사용자 여정, 업무흐름 시나리오
- 시나리오는 Accordion으로展開하여 상세 단계(수행 주체, 행위, 메뉴, 플랫폼, 교환 데이터, API, SFR, 상태) 표시
- 사용자 여정은 카드 형태로 역할별 목표/메뉴/플랫폼/산출물/SFR 표시

### 데이터/문서

- 7개 시나리오(SCN-001~SCN-007)와 7개 사용자 여정을 mock data로 정의
- 플랫폼 역할 요약은 `docs/PORTAL_ROLE_AND_PLATFORM_BOUNDARY.md`와 일관되게 작성
- 신규 문서 3개(`WORKFLOW_SCENARIO_GUIDE.md`, `USER_JOURNEY_AND_PLATFORM_FLOW.md`, `PROPOSAL_EXPLANATION_MESSAGES.md`) 작성

### 기존 화면 보강

- 통합 대시보드에 `MenuScenarioPanel` 추가
- 관리자 권한(`useDemoAdmin` + `isPreviewAdmin`)일 때만 표시
- 일반 사용자에게는 전혀 노출되지 않음

### 문구 기준

- "포털이 모든 기능을 직접 구현한다"라는 표현 사용 금지
- "포털은 통합 진입점/오케스트레이션 계층"으로 표현
- API/연계는 "PoC 기준 설계안/후보"로 표현, 실제 확정 명세가 아님을 명시


## 31.6단계 결정사항

### 전수검증 방식

- 실제 배포된 Firebase Hosting 사이트(`https://kai-platform-d0ae0.web.app`)를 대상으로 Playwright E2E 전수검증 수행
- `backstage-portal/node_modules/@playwright/test`를 사용하며, 실행 위치는 `backstage-portal/scripts/full-audit-playwright.mjs`
- 일반 사용자 라우트 12개, 관리자 직접 URL 4개, 관리자 권한 라우트 4개를 각각 다른 페이지/세션으로 검증

### `/api/auth/guest/refresh` 404 처리

- curl 및 Cloud Run 직접 호출은 200 응답, 브라우저에서만 404로 노출되는 현상 확인
- 원인은 브라우저 캐시에 `/api/auth/guest/refresh`의 404 응답이 남아 있던 것으로 판단
- `packages/app/src/index.tsx`에서 refresh 호출 시 `?_=<timestamp>` 캐시 버스팅 추가
- 근본 해결책은 Firebase Hosting `/api/**`에 `Cache-Control: no-store`를 설정하는 것이나, 우회 적용으로 데모 시연에는 문제없음

### 통합검색 OpenSearch proxy 401 처리

- 데모/배포 환경에서는 운영 OpenSearch 인스턴스를 연동하지 않으므로 proxy 호출 시 401 발생
- 401 발생 시 샘플 데이터를 직접 사용하도록 fallback
- fallback 메시지는 "OpenSearch 연결 실패, 샘플 데이터 결과를 표시합니다"로 중립화

### mock/PoC/데모/제안 문구 중립화

- 캡처 대상 화면에 노출되는 `mock`, `Mock`, `MOCK`, `PoC`, `데모`, `제안팀`, `제안서`, `검토용`, `난제`, `preview`, `프리뷰` 등 부적합 문구 최종 제거
- 문서 이력(`STAGE_31_5_QA_REPORT.md` 등)에는 유지하되, UI에는 남기지 않음
- 버튼/레이블에서 `(mock)` 접미사 제거, action 설명에서 "mock action" → "데모 action" 등 중립 표현 사용

### Smoke test

- 17개 route/API에 대해 fetch 기반 200 확인 스크립트 `scripts/smoke-check-demo-routes.mjs` 추가
- Playwright 전수검증과 별개로 경량 smoke test 제공

### Git 처리

- 로컬 커밋은 생성, 원격 push는 PAT 인증 문제로 실패
- token/password/secret은 어떤 문서에도 기록하지 않음
- 사용자가 직접 `gh auth login` 또는 PAT 갱신 후 push 수행


## 32단계 결정사항

### 캡처 대상

- production URL(`https://kai-platform-d0ae0.web.app`)에서 캡처하여 실제 배포된 UI 반영
- 기존 18개 캡처 중 01~14를 production에서 재촬영
- 29~31단계에서 추가된 관리자 전용 화면 3개(`요구사항 대응현황`, `플랫폼 API 연계현황`, `업무흐름/연계 시나리오`)를 17~19번으로 추가
- OpenMetadata, OpenSearch, Keycloak, Backstage 로그인 화면은 기존 로컬 자료 유지

### 캡처 환경

- 접근 코드 `ictway` 입력 후 Guest 로그인
- 관리자 전용 화면은 `sessionStorage.__kt_ai_portal_admin_preview__ = 'true'` 설정 후 캡처
- 상단 `시연 환경입니다. 현재 데이터는 샘플 데이터...` 배너는 자동으로 숨김(접근 코드 화면의 `시연 환경` 문구는 제안서 캡처 대상이 아님)

### PPT 생성 방식

- python-pptx(`pptx`) 라이브러리 사용
- 16:9 와이드 슬라이드, 좌측 텍스트/우측 이미지 레이아웃
- 각 장표에 RFP ID, 요구사항명, 요구내용, 대응 화면, 구현 기능, 구현 수준, 후속 연동 범위 포함
- PPT 파일명: `proposal-package/국방지능형플랫폼포털_RFP대응_발표자료_32단계.pptx`

### 문구 기준

- PPT 본문 및 캡처 화면에 `데모`, `PoC`, `제안서 작업용`, `프리뷰`, `mock` 등 부적합 문구를 사용하지 않음
- `샘플 데이터`, `설계안/후보`, `본 사업 초기 단계` 등 중립 표현 사용

### 산출물 관리

- 캡처 스크립트: `scripts/capture-proposal-screenshots-prod.js`
- PPT 생성 스크립트: `scripts/generate-proposal-ppt.py`
- 캡처 카탈로그/캡션 문서 갱신: `docs/PROPOSAL_SCREENSHOT_CATALOG.md`, `docs/SCREENSHOT_CAPTIONS.md`


## 32.2단계 결정 사항

### 기능흐름 중심 발표자료 구성

- 기존 32단계 PPT를 RFP ID 나열 중심에서 사용자 흐름·플랫폼 연계 역할 중심으로 재구성
- 표지, 전체 체계, 사용자 유형별 흐름, 메뉴 구조, RFP 대응 총괄, SFR별 기능 장표, 관리자 추적 기능, 4개 대표 업무흐름, 플랫폼 연계 역할, 구현 수준/후속 로드맵, 마무리로 구성
- python-pptx 기반 자동 생성 스크립트(`scripts/generate-feature-flow-ppt.py`)로 재생산성 확보

### 발표자 스크립트 및 쉬운 설명자료

- 슬라이드별 30초~1분 분량의 발표 문구를 별도 문서로 작성
- 비개발자·제안 발표 청중을 위해 ‘포털=종합 안내소+신청 창구+현황판’ 등 쉬운 비유 사용
- 데이터 플랫폼/AI 플랫폼/클리우드/CMP 역할을 명확히 구분하여 설명

### 문구 기준

- 발표자료 본문 및 캡처에 `데모`, `PoC`, `mock`, `프리뷰`, `제안서 작업용` 문구 사용 금지
- 구현 수준은 `화면 구현 완료`, `연동 확인 완료`, `샘플 데이터 기반` 등으로 표기
- 후속 연동 범위는 `후속 연동`, `실제 연동 시 개발` 등으로 명확히 구분

### 화면 캡처 활용

- `docs/assets/final/`의 21개 캡처를 모두 활용
- `docs/SCREENSHOT_CAPTIONS.md`에 RFP ID, 강조 포인트, 후속 연동 포인트 추가


## 33단계 결정 사항

### 최종 공유 패키지 구성

- `proposal-package/final-share/` 디렉터리를 생성하고, README/PPT/설명자료/캡처/RFP매핑/QA보고서/스크립트로 분류
- 최종 ZIP에는 필요한 산출물만 포함하고, 임시/백업/개발 산출물 및 민감 정보는 제외
- ZIP 파일명: `국방지능형플랫폼포털_최종제안공유패키지_33단계.zip`

### 민감정보 및 부적합 문구 관리

- `scripts/verify-final-package.py`로 구조, 파일 수량, 민감정보 패턴, 부적합 문구, 금지 확장자, ZIP 무결성을 검증
- 사용자 공유용 README와 발표자료에는 `데모`, `PoC`, `mock`, `프리뷰`, `제안서 작업용` 문구를 직접 사용하지 않도록 정리
- RFP 매핑/QA 보고서 등 역사적 문서에는 기존 문구가 남을 수 있으나, 최종 공유 본문과는 구분

### GitHub push

- 32.1~33단계 커밋이 로컬에 쌓여 있으나 PAT 인증 문제로 push는 사용자 직접 처리
- Kimi는 PAT/token/password를 요구하지 않음


## 33.1단계 결정 사항

### 화면 캡처 부적합 문구 제거

- `DemoModeBanner` 컴포넌트를 삭제하고 `App.tsx`에서도 제거하여, 모든 페이지 상단에 `시연 환경입니다. 현재 데이터는 샘플 데이터이며 실제 운영 시스템과 다를 수 있습니다.` 문구가 노출되지 않도록 함
- 접근 코드 로그인 화면(`PreviewLoginPage`)의 `본 사이트는 검증 환경이며, 실제 운영 시스템과 다를 수 있습니다.` 문구도 제거
- 코드 주석이나 문서 이력에 남은 문구는 유지하되, 실제 화면에는 절대 노출되지 않도록 함

### 운영자용 외부 도구 링크 권한 제한

- `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리`는 일반 사용자 업무 메뉴가 아닌 플랫폼 운영도구로 분류
- 포털 대시보드의 바로가기 카드에서 완전히 제거하고, 관리자 콘솔의 `플랫폼 운영도구` 탭으로 이동
- 해당 탭은 `showAdminPanel` 조건 없이도 관리자 콘솔 낸부에 있으나, 진입 자체가 관리자 메뉴 활성화에 의존
- 서비스/도구 카탈로그의 `OpenMetadata` 항목에 `adminOnly: true`를 추가해 일반 사용자에게는 미노출
- 대시보드 바로가기 카드에도 `adminOnly` 속성을 추가하여 `관리자 콘솔` 링크가 비관리자에게 노출되지 않도록 일관성 확보

### 문구 기준 보완

- 화면에 노출되는 `샘플 데이터`라는 표현을 `예시 데이터`로 변경
- `데모`, `PoC`, `mock`, `프리뷰`, `제안서 작업용`, `시연 환경` 등의 문구는 UI에서 사용하지 않음
- 관리자 전용 섹션의 안내 문구로 `권한이 부여된 관리자만 사용할 수 있습니다.`는 사용 가능


## 34단계 결정 사항

### 화면 재촬영 범위

- 33.1단계 UI 변경(시연 배너 제거, 외부 운영도구 관리자 전용 이동)을 반영하기 위해 production URL(`https://kai-platform-d0ae0.web.app`)에서 20개 화면 재촬영
- 기존 21개 캡처에서 `15-openmetadata-catalog.png`, `16-opensearch-catalog-index.png` 제외
- `09-admin-console-platform-ops-tools.png`를 신규 추가하여 관리자 콘솔의 `플랫폼 운영도구` 탭을 대표 장표로 사용

### PPT 생성/보정 방식

- 화면중심 PPT(`scripts/generate-proposal-ppt.py`)는 21개 화면 슬라이드 데이터를 갱신하여 이미지 교체
- 기능흐름중심 PPT(`scripts/generate-feature-flow-ppt.py`)는 34장으로 재구성하고 `slide_counter` 클래스를 추가해 슬라이드 번호/푸터/제목 바를 통일
- OpenMetadata/OpenSearch 일반 장표는 제거하고, `플랫폼 운영도구` 관리자 장표를 추가

### 최종 ZIP 파일명

- 34단계 내용을 반영하되 ZIP 파일명은 `국방지능형플랫폼포털_최종제안공유패키지_33단계.zip`으로 유지
- 낸부 팀 공유 시 33단계 파일명 그대로 사용하고, 내용만 34단계로 갱신

### 제안서 본문 삽입 가이드

- `docs/PROPOSAL_BODY_IMAGE_GUIDE.md`를 신규 작성하여 장/절별 추천 이미지, 캡션 예시, 삽입 크기 정리
- 제안서 본문(Word/PPT) 작성 시 이미지/캡션을 바로 활용할 수 있도록 가이드화

### 검증 기준

- `scripts/verify-final-package.py`로 구조, 파일 수량, 민감정보, 부적합 문구, 금지 확장자, ZIP 무결성 검증
- `preview` 등 부적합 문구는 `PORTAL_ADMIN_FEATURE_GUIDE.md` 등에서 `미리보기`로 교체하여 통과

### GitHub push

- 34단계 커밋까지 로컬에 쌓여 있으나 PAT 인증 문제로 push는 사용자 직접 처리
- Kimi는 PAT/token/password를 요구하지 않음

## 35단계: 권한체계 개선, K-RMF 고도화, 최종공고 실구현

### 배경

- 외부 프롬프트(Kimi Code 개발 프롬프트) 기반으로 P0(권한/메뉴/캡처), P1(최종공고 실구현), P2(안정화) 작업 수행.
- 34단계까지는 문서/매핑 정리 중심이었고, 이번 단계에서 실제 소스코드에 반영한다.

### 결정사항

1. **역할 결정 우선순위**: ① 캡처 모드 역할 override(`app.proposalCapture.enabled=true`일 때만, URL `?captureRole=` 또는 sessionStorage `__kt_ai_portal_role_override__`) → ② Firebase 로그인 이메일이 `app.auth.adminEmails`에 포함되면 `portal-admin` → ③ 기존 sessionStorage `__kt_ai_portal_admin_preview__`(하위호환, `portal-admin`으로 매핑) → ④ 기본값 `general-user`.
   - 근거: 기존 데모 운영 방식(관리자 프리뷰 세션키)을 깨지 않으면서 캡처 자동화가 요구하는 다중 역할 전환을 수용하기 위함.
2. **`visibleTo` 필드 폐기**: `PortalMenuDefinition.visibleTo`를 제거하고 `requiredAnyPermissions: PortalPermission[]`로 대체. 메뉴 노출과 라우트 Guard가 같은 `hasPermission()` 판정을 사용하도록 단일화.
   - 근거: `/admin-console`처럼 메뉴 숨김만 적용되고 라우트 가드가 누락되는 불일치의 구조적 원인 제거.
3. **K-RMF 라우트 유지**: URL은 `/krmf-evidence`를 유지하고 명칭만 `K-RMF 이행·증적관리`로 변경.
   - 근거: 기존 문서/캡처/시나리오 링크 호환 유지.
4. **K-RMF 책임 표현**: 화면 상단에 "통제 선정·제외·대체 승인과 평가·인가 최종 판단은 소요기관 권한" 안내를 상시 표시. 변경영향의 재평가 필요 여부는 `검토 필요`/`소요기관 판단 필요` 상태로만 표현하고 자동 확정하지 않는다.
   - 근거: 포털이 평가·인가를 수행하는 것처럼 오핱되지 않게 해야 한다는 프롬프트 금지사항.
5. **캡처 모드 설정**: `app.proposalCapture.enabled`는 `app-config.demo.yaml`(제안/데모 환경)에서만 `true`, 로컬 `app-config.yaml`과 운영 기본은 `false`. 역할 override는 capture 모드가 활성일 때만 동작.
   - 근거: 운영 배포에서 역할 override가 활성화되면 안 된다는 금지사항.
6. **실증 프로젝트 화면 배치**: 별도 메뉴를 늘리지 않고 `/project-workspace` 낮부에 `실증·데이터 준비` 탭으로 배치.
   - 근거: 메뉴 과도 증가 방지(34단계 결정과 동일한 원칙).
7. **`/requirement-progress` 처리**: 별도 라우트는 유지하되 메뉴는 `요구사항 대응현황` 하나로 유지, 두 페이지 상호 링크.
   - 근거: 34단계에서 분리된 페이지를 유지하면서 메뉴 중복은 방지.
8. **캡처 검증 기준**: 파일 생성/크기가 아니라 ① `[data-testid="portal-shell"]` 존재 ② 화멳별 `data-capture-id` 존재 ③ 본문에 `Enter as a Guest User`/`접근 권한이 없습니다` 부재 ④ 캡처 간 바이트 중복 없음, 4종을 만족해야 성공으로 기록.
   - 근거: `docs/assets/final` 18개가 모두 Guest 로그인 화면(56,150B 동일)으로 저장된 실패 재발 방지.

## 35.1단계: 메뉴 순서·여정 매핑 보정 및 역할 간소화

### 배경

- 사용자 피드백: ① 제안 게시판이 여정 1단계(체계접속)로 표시되는 문제, ② 통합검색 위치가 낮고 반입·반출 승인이 높은 메뉴 순서, ③ 유사 권한 역할이 많은 역할 구성.

### 결정사항

1. **제안 게시판 journeyStep 1 → 8**: SFR-013은 제안서 8단계 여정표상 8단계(운영·보안감사, SFR-004·013·019·020·021)에 속하므로 8단계로 정정. 1단계는 잘못된 매핑이었음.
2. **메뉴 순서를 여정 흐름에 맞게 재배치**: 그룹 순서를 `포털 공통 → 플랫폼 연계 → 프로젝트 운영 → 사용자/조직 → 사용자 지원 → 관리/보안`으로 변경(관리/보안은 맨 뒤). 통합검색을 서비스/도구 카탈로그 위로, 반입·반출 승인을 '프로젝트 운영' 그룹으로 옮겨 크레딧 관리 다음에 배치(여정 4→6→7 흐름과 일치). 최종 일반 사용자 메뉴: 대시보드 → 통합검색 → 카탈로그 → 프로젝트/워크스페이스 → 크레딧 → 반입·반출 → 마이페이지 → 제안 게시판.
3. **역할 7 → 6개로 간소화**: `krmf-manager`를 `security-manager`(보안 관리자)에 통합. 두 역할은 K-RMF 전체 권한을 공유해 구분 실익이 없었고, security-manager에 requirement.view/integration.view를 추가해 krmf-manager의 고유 권한을 흡수. `security-auditor`는 유일한 조회 전용 역할이라 구분이 명확해 유지. 캡처 스크립트·allowedRoles·테스트·문서도 동기화.
4. **하위호환 없이 제거**: 데모/제안 환경 전용 역할 체계이므로 마이그레이션 없이 타입에서 제거하고 전 참조를 일괄 갱신.

## 35.2단계: 낶부 추적 메뉴 비노출 처리

### 결정사항

1. **요구사항 대응현황, 플랫폼 API 연계현황, 업무흐름/연계 시나리오 3개 메뉴 비노출**: 제안서 대상 화면이 아니라 개발/사업관리 낶부 추적 도구이므로 `portalMenuDefinitions`에서 제거. 단, 라우트와 PermissionGuard는 유지하여 개발자가 직접 URL(`/requirement-coverage`, `/platform-api-integration`, `/workflow-scenarios`)로 접근하면 권한자에 한해 사용 가능. 레거시 캡처(17~19)도 라우트 직접 이동 방식이라 영향 없음.
2. **role-menu-preview에도 동일 적용**: 메뉴 정의에서 제거되므로 권한별 메뉴 비교 화면에도 표시되지 않음(전체 메뉴 16 → 13개).


## 33.2단계: 기능 변경 없는 UI/UX 디자인 시스템 정비

### 결정사항

1. **디자인 토큰/공통 컴포넌트 신설**: `components/common/designTokens.ts` + 공통 7종. 기존 컴포넌트는 삭제하지 않고 래퍼로 감싸는 방식. MUI v4 유지.
2. **사이드바 폭 우회**: Backstage 공식 `sidebarOptions={{drawerWidthOpen:248}}`을 쓰되, SidebarPage가 본문 padding을 기본값으로 계산하는 core-components 한계를 `SidebarWidthStyle`(핀 상태 연동 style 주입)로 우회.
3. **메뉴 말줄임 해소 방식**: ellipsis 제거 + 2줄 wrap 허용(260px 확장/폰트 축소 대신).
4. **역할 전환 UI 위치**: 페이지 헤더가 아니라 사이드바 하단 정적 배치 — 모든 페이지에서 동일 위치를 유지하고 페이지별 헤더 구조 변경을 피하기 위함.
5. **지표 섹션 매핑**: mock 데이터 무수정 원칙에 따라 `SECTION_MAP` 상수로 분류. 대응 필드 없는 지표(보완 진행)는 임의 산출하지 않고 미표시.
6. **Firebase 배포 경로 변경(일시)**: firebase CLI 계정 불일치로 Hosting REST API(gcloud 토큰 + x-goog-user-project 헤더, gzip 해시 등록 방식)로 배포. 기존 rewrites/headers config는 이전 버전에서 읽어 재사용해 /api Cloud Run 라우팅 유지.

## 2026-09-16 운영 전환 P0/P1 결정

1. **업무 DB 분리(ADR-010)**: Backstage database service가 플러그인별 DB(`backstage_plugin_portal`)를 자동 생성하는 것을 시험으로 확인. 포털 업무 데이터(fc_*)는 `portal.database` 설정의 전용 DB(portal_business, schema portal) + 별도 knex 풀로 분리. framework 자동 생성 동작에 업무 스키마 소유를 맡기지 않기 위함.
2. **migration 실행 주체**: 운영은 `scripts/run-portal-migrations.mjs` + portal_migrator 계정. `portal.migrations.runOnStartup`은 local-integration 전용. 런타임 광범위 CREATEDB/owner 권한 부여로 문제를 덮지 않음.
3. **신원 매핑(잠정)**: Backstage credentials가 OIDC issuer/subject를 노출하지 않아, Keycloak 직접 연동 전까지는 검증된 userEntityRef를 (issuer='backstage', subject=userEntityRef)로 fc_external_identities에 기록. OIDC 전환 시 마이그레이션 계획 필요. 최초 관리자 자동 프로비저닝 금지(403 identity_not_provisioned).
4. **검색 미연결 표시**: mock fallback 제거로 demo의 통합검색 화면이 BFF(P4) 구현 전까지 "미연결"로 표시됨. 지시서의 "미연결 원천을 정상으로 가장 금지" 원칙을 따른 의도된 변화.
5. **demo 인증 한계 명시**: staging/demo는 접근코드 게이트 + Firebase 로그인 + backend guest 경로를 유지(개발 프로파일). onprem 운영 프로파일에서는 제거 — 릴리스 게이트 항목.

## 2026-09-16 P1-2 결정

1. **system 역할의 tenant 선택 예외**: portal-admin(system scope)은 전역 운영(tenant 생성·공통 registry)이 임무이므로 membership 없는 tenant도 선택 가능하게 함. 그 외 역할은 선택 tenant의 활성 membership이 필수(서버 확인, 미보유 시 403 + 감사). 지시서 §4.1 membership 검증 요구와 §4.2 포털 관리자 임무의 절충 — 근거를 여기에 기록.
2. **기준 데이터 단일 원천**: seed:reference는 rolePolicies.ts를 esbuild 번들로 직접 평가해 적재(Node strip-types가 확장자 없는 상대 import를 해석 못함). 스냅샷 복제 대신 원본 참조로 drift 방지.
3. **역할 회수는 soft revoke**: DELETE 대신 valid_until 설정 + 감사. 이력 보존·재조회 가능성 우선.
4. **자기 역할 부여 금지**: rbac.manage 보유자도 본인 membership에 신규 역할 부여 불가(403 self_assignment_not_allowed). 대리/긴급은 별도 승인 절차 도입 시까지 금지 유지.

## 2026-09-16 staging DB 연결 결정

1. **staging 업무 DB**: Cloud SQL `kai-platform-d0ae0-instance`(PostgreSQL 18.6)에 `portal_business` 생성. SQL Connect가 만든 DB와 분리해 포털 업무 전용으로 사용. PG 16 권고 대신 18.6 사용 — 스키마 호환 확인됨(migration/seed/RLS 시험 통과).
2. **개발 단계 네트워크**: 공개 IP + authorizedNetworks(개발맥 218.233.65.220/32). 운영 전환 시 Private IP + connector로 교체(릴리스 게이트).
3. **GRANT 실행 주체**: Cloud SQL postgres 계정은 cloudsqlsuperuser로 타인 소유 스키마에 GRANT 불가 — 스키마 owner(portal_migrator)가 실행하도록 roles.sql 절차 보정.

## 2026-09-20 backend 배포 결정

1. **배포 경로**: gcloud 부재로 Cloud Run Admin API v2 REST(firebase CLI 세션 토큰)로 배포. 재사용 가능하도록 `scripts/deploy-cloudrun-rest.mjs`로 남김. 병렬 세션의 Cloud Build 이미지(digest 고정)를 그대로 사용해 빌드 중복 방지.
2. **DB 비밀 경로**: `portal-runtime-db-password`를 Secret Manager에 등록하고 Cloud Run env는 secretKeyRef로 참조. 계정 비밀번호는 이미지/소스/로그 미기록 원칙 유지(다만 현재 3계정 동일 비밀번호·채팅 노출 이력은 로테이션 게이트로 기록).
3. **migration 적용 범위**: 커밋된 0003만 staging 적용. 미커밋 WIP(0004 tenant_settings)는 해당 코드가 이미지에 없으므로 적용하지 않음 — 스키마와 배포 코드의 버전 일치 원칙.
