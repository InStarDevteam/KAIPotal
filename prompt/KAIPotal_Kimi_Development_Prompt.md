# Kimi Code 실행 프롬프트 — 국방지능형플랫폼 포털 운영 전환

이 문서 전체를 개발 지시로 실행하세요. 같은 폴더의 `KAIPotal_Setup_Guide.md`, `KAIPotal_Implementation_Test_Spec.md`도 필수 사양입니다. 기존 저장소를 개선하는 작업이며, 제안 시연을 위한 화면 제작이 아닙니다.

## 0. 임무와 완료의 의미

당신은 이 프로젝트의 책임 개발자입니다. `KBitone-Company/kt-ai-portal`의 `backstage-portal/`을 실제 운영 가능한 다중 테넌트 국방지능형플랫폼 포털로 개선하세요. 분석·계획만 제출하고 멈추지 말고, 구현·마이그레이션·자체시험·문서·운영 전환 패키지까지 진행하세요.

포털의 책임은 **통합 진입점, 서비스 발견, 신청·승인, 권한통제, 프로젝트/워크스페이스 운영, 플랫폼 API 오케스트레이션, 현황·감사·K-RMF 증적 관리**입니다. 데이터 플랫폼·AI 플랫폼·지능형 클라우드/CMP의 학습·가공·자원생성 기능을 포털 내부의 가짜 로직으로 대체하지 마세요.

개발 완료와 운영 승인, 계약시험 통과와 실제 플랫폼 연동 통과를 구분하세요. 외부 명세·계정·인프라가 없으면 해당 시험을 `BLOCKED`로 기록하되, 독립적으로 가능한 서버·DB·UI·계약시험은 계속 완료하세요. 불가능한 부분을 샘플 정상 데이터로 감추지 마세요.

### 필수 원칙

1. 기존 작업을 먼저 읽고 보존하세요. 사용자 변경을 덮어쓰거나 전체 앱을 새 프레임워크로 재작성하지 마세요.
2. 실제 동작은 `UI → 인증 → 서버 인가 → API → DB/원천 시스템 → 감사 → 재조회` 전체 경로로 판단하세요.
3. 운영 데이터·권한·상태를 local/sessionStorage 또는 React state에만 저장하지 마세요.
4. 운영에서 Guest, 접근코드 게이트, captureRole, 관리자 미리보기 승격, 자동 mock fallback을 제거하세요. 시험 fixture는 production 의존성 그래프와 분리하세요.
5. 신규 포털 업무 테이블은 `fc_` 접두어를 사용하세요. Backstage/Keycloak/OpenMetadata 등 제품 내부 테이블명은 임의 변경하지 마세요.
6. 비밀을 소스·클라이언트 설정·로그·문서에 넣지 마세요. Secret reference와 환경별 설정을 사용하세요.
7. 실제 API endpoint와 인증방식을 추정하여 ‘연동 완료’ 처리하지 마세요.
8. 기존 기능별 모든 버튼·탭·다이얼로그·폼의 실행 경로를 점검하세요. 활성 버튼의 무반응, 알림창만 띄우는 가짜 저장, 무조건 성공 응답을 남기지 마세요.
9. 구현 이유와 운영 경계를 한국어 주석으로 남기고, 복잡한 상태전이·인가·재시도에는 테스트를 연결하세요.
10. 작업 단계마다 CHANGE_SUMMARY와 검증 결과를 갱신하고 다음 단계로 이어가세요. 사용자가 같은 승인·설정값을 반복 제공하게 하지 마세요.

## 1. 시작 시 읽고 확인할 것

저장소 루트의 `AGENTS.md` 등 적용 지침, git 상태/브랜치/최근 커밋을 확인하세요. 현재 실제 소스를 기준으로 첨부 인수인계와 차이를 기록하세요. 첨부 기준 커밋이 현재 HEAD라고 단정하지 마세요.

- `docs/PORTAL_HANDOVER_SPEC.md`, `docs/DOCUMENT_INDEX.md`
- `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`, `docs/FINAL_RFP_IMPLEMENTATION_DELTA.md`
- `docs/PLATFORM_API_INTEGRATION_PLAN.md`, `docs/PORTAL_ROLE_AND_PLATFORM_BOUNDARY.md`
- `docs/VM_INFRASTRUCTURE_DESIGN.md`, `docs/UI_UX_DESIGN_SYSTEM.md`
- `docs/KRMF_LIFECYCLE_AND_ROLE_DESIGN.md`, `docs/FINAL_RFP_KRMF_MAPPING.md`
- `notes/DECISIONS.md`, `CHANGE_SUMMARY.md`, `TODO.md`, `docs/TECH_DEBT.md`
- App/authz/navigation/admin/tenant/search/KRMF 및 모든 mock 데이터, backend plugin 등록, infra/scripts, package/lock/config 파일

파일명이 달라지거나 빠졌으면 `rg --files`로 찾고 부재를 기록하세요. 다음을 먼저 생성하세요.

| 산출물 | 필수 내용 |
|---|---|
| `docs/production-upgrade/BASELINE_AUDIT.md` | 현재 구조/버전/실행결과, 소스 기반 P0/P1, 기존·신규 위험 |
| `FEATURE_ACTION_INVENTORY.csv` | route→tab→action→권한→원천→API→DB→시험→보존/교체/개발전용 |
| `REQUIREMENT_IMPLEMENTATION_MATRIX.csv` | 기존 SFR21 및 실증·K-RMF 관련 요구→구현→시험→증적; 원문 검증상태 |
| `API_CONTRACT_REGISTER.csv` | 기존 38개 후보 ID→canonical API/adapter→계약버전→책임자→검증상태 |
| `ARCHITECTURE_DECISIONS.md` | 아래 기술 선택과 적용방식, 바뀐 결정의 이유 |
| `EXECUTION_STATUS.md` | 단계/완료조건/현재상태/다음 작업/외부 차단 사유 |

27건 테스트나 과거 캡처 통과를 재실행 없이 최신 결과로 기록하지 마세요. 현재 E2E 기본 사양도 있으므로 ‘E2E 파일이 전혀 없다’고 단정하지 말고 실제 업무 검증 부족을 구분하세요.

## 2. 우선 제거할 운영 차단사항

첨부본에서 확인된 내용이며 현재 소스에서 다시 대조하세요.

- `IntegratedSearchPage.tsx`: `!backendBaseUrl.includes('localhost')`일 때 mock 결과로 즉시 반환하는 분기를 제거하세요.
- `AuthzContext.tsx`: `proposalCapture=false`에도 sessionStorage admin preview로 역할이 승격되는 경로를 제거하세요.
- backend `src/index.ts`: allow-all permission policy와 운영 Guest를 교체하세요. Scaffolder/MCP actions/기본 proxy/카탈로그 등록도 필요한 기능만 허용하고 관리 권한을 검증하세요.
- `app-config.yaml`: `dangerously-allow-unauthenticated` 검색 raw proxy를 제거하세요. 불특정 index·DSL·관리 API 전달을 막으세요.
- DB 설정이 `pg`라는 것만으로 업무 데이터가 저장된 것으로 간주하지 마세요. 실제 custom backend plugin, migration, repository, transaction을 작성하세요.
- 검색 상태·최신 시각·정상 배지·대시보드 실적 상수를 실제 API 응답으로 교체하세요.
- 운영 도구 localhost 링크, disabled 저장, handler 없는 신청 버튼, 고정 승인자, 샘플 감사로그를 교체하세요.
- 개발용 비밀번호·예시 자격증명은 운영 참조를 끊고 관련 자격증명 교체 항목을 기록하세요. 값을 보고서에 복사하지 마세요.

## 3. 아키텍처와 환경

### 3.1 공통 코드와 배포 프로파일

Backstage + React 18 + TypeScript를 유지하세요. 실제 첨부 package는 Backstage 1.52.0, Node `22 || 24`, Yarn 4.13.0입니다. 설치된 lockfile과 지원 버전을 확인하고 Node 24 등 호환되는 지원 LTS를 선택·고정하세요. `latest` 이미지나 lockfile 없는 설치를 사용하지 마세요.

Material-UI v4 의존성은 위험과 호환성을 기록하세요. 우선 공통 디자인 토큰·앱 셸·컴포넌트를 개선하고, 유지보수 가능한 UI 버전으로의 이관은 Backstage 호환성 실험·adapter·회귀시험을 갖춘 별도 단계로 실행하세요. 취약점 때문에 필수 업그레이드가 필요하면 먼저 해결하고, 여러 MUI 버전의 테마가 무작위로 충돌하는 상태를 남기지 마세요.

| 프로파일 | 실행 구성 |
|---|---|
| `local-integration` | 실제 PostgreSQL + Keycloak + OpenSearch 3노드 + 격리된 파일저장소 + BFF/worker. 플랫폼 원천은 독립 계약 시험 서버 사용 가능 |
| `gcp-staging` | 기존 프로젝트 `kai-platform-d0ae0`의 Firebase Hosting, 별도 Cloud Run API, Cloud SQL PostgreSQL, VPC 검색, GCS, Secret Manager |
| `onprem-production` | 첨부 전제인 VM+systemd 또는 승인된 컨테이너 방식, WEB/Kong/BFF/Keycloak/PG/OpenSearch/스토리지/관제 |

기본 운영 설치를 갑자기 Kubernetes 전제로 바꾸지 마세요. Kubernetes가 실제 표준이면 같은 OCI 이미지·환경계약으로 Helm/PDB/topology spread 등을 추가할 수 있지만 VM 배포물도 요구 범위에 맞게 유지하세요. 한 호스트 Compose 시험은 실제 3개 장애 도메인 검증과 구분하세요.

### 3.2 서버 모듈

Backstage custom backend plugin `portal`을 중심으로 `/api/portal/v1/...`를 명시 등록하세요. 내부는 auth/context, tenancy, preferences, navigation, projects/workspaces, approvals, credits, content, integration, search, audit, krmf 모듈로 분리하세요. 공통 API schema/type은 프런트와 서버가 공유하되 서버 검증을 생략하지 마세요.

Backstage database service의 Knex/pg 방식과 정합적인 migration 도구 하나를 사용하세요. 불필요하게 ORM 여러 개를 도입하지 마세요. 실제 사용하는 패키지는 직접 의존성으로 선언하세요. 업무 DB와 framework 내부 DB의 소유·권한·migration 실행 주체를 명확히 구분하세요.

Backstage가 기본적으로 plugin DB를 생성하거나 시작 시 migration을 실행하는 동작과 runtime 최소권한이 충돌하지 않게 하세요. DB/schema를 사전 생성하고 portal plugin은 현재 버전의 지원되는 migration skip 경로와 배포 job을 적용하세요. 각 vendor plugin도 startup DDL·migration 계정·업그레이드 동작을 별도로 확인하세요. 런타임에 광범위 CREATEDB/테이블 owner 권한을 주어 문제를 덮지 마세요.

Worker는 BFF 요청 프로세스와 독립 실행 가능하게 작성하세요. Cloud Run request 종료 후 `setInterval`이 계속 실행된다고 가정하지 마세요. staging은 outbox를 lease로 처리하는 Cloud Run Job + 승인된 scheduler 등 내구성 있는 실행 경로를 제공하고 지연목표를 만족하는지 확인하세요. 필요 시 상시 worker 런타임을 선택하고 이유를 기록하세요. on-prem은 systemd worker를 실행하세요.

### 3.3 인증 경로

최종 운영 IdP는 Keycloak OIDC입니다. issuer·audience·서명/JWKS·만료·허용 알고리즘을 검증하고 account approval/disabled/tenant membership을 확인하세요. OIDC 로그인에는 state/nonce 및 지원되는 Authorization Code/PKCE 경로를 사용하세요. IdP ID token과 원천 플랫폼 API access token을 혼동하지 마세요.

Backstage OIDC resolver/identity/token 흐름은 현재 버전의 공식 API로 연동하세요. 단순히 프런트 Firebase 로그인 후 backend에 Guest로 접속하는 경로는 제거하세요. 개발용 Firebase adapter가 필요하면 서버 Admin SDK 검증과 `(issuer, subject)` 매핑, 회수·정지 확인까지 구현하세요. 한 환경의 인증 원천과 role/membership 권위가 명확해야 합니다.

포털 plugin API의 기본 신원 경계는 Backstage `httpAuth`가 검증한 credentials → 서버 principal입니다. IdP token은 OIDC 로그인/지원되는 exchange 경계에서 검증하고 Backstage 발급 token과 혼동하지 마세요. Firebase도 정식 provider/지원되는 auth exchange로 연결하며 custom token 수용을 위해 Backstage 전체 인증을 비활성화하지 마세요. Keycloak 로그아웃·권한회수가 이미 발급된 Backstage token에 자동 전파된다고 가정하지 말고, 앱 session/security stamp·회수 정책을 정의하고 실제 시험하세요.

포털 경로뿐 아니라 Backstage 기본 `/api/catalog`, `/api/search`, `/api/proxy`, Scaffolder, TechDocs, notifications/signals, MCP actions 등의 접근도 점검하세요. 같은 객체가 기본 plugin 경로로 노출되어 tenant 정책을 우회하지 않아야 합니다. 필요한 plugin은 동등한 서버 인가를 적용하고 범위 분리를 보장할 수 없는 불필요 plugin은 운영에서 비활성화하세요.

Firebase Hosting은 쿠키 전달과 요청시간 제약이 있으므로 API/OIDC callback을 별도 origin으로 제공하는 안을 기본으로 구현하세요. 가능하면 UI/API를 같은 상위 도메인으로 구성하고 web.app/run.app처럼 다른 사이트 조합의 third-party cookie 제한도 확인하세요. 정확한 CORS allowlist, credential 전송, HttpOnly/Secure/SameSite 정책, CSRF 방어, trusted proxy, redirect URI, 세션 갱신·로그아웃을 실제 배포 origin에서 시험하세요. rewrite 유지 시 쿠키가 제거되지 않는다는 것을 실측 증명해야 합니다.

## 4. 테넌트·인가·사용자 관리

### 4.1 데이터 경계

군(육·해·공·공통)은 tenant의 속성입니다. 하나의 군 아래 여러 tenant/조직을 표현할 수 있게 하고, ‘공통’은 모든 데이터를 볼 수 있는 우회 tenant가 아닙니다. 공유 자산은 명시적 share grant와 보안 정책으로만 노출하세요.

공통 principal에 `userId, issuer, subject, activeTenantId, membershipId, projectScopes, roles, permissions, policyVersion, authenticationStrength` 등을 표현하세요. 민감 보안속성의 값·의미는 승인된 정책에 맞추세요. header/body의 tenantId·role·clearance를 신뢰하지 마세요. tenant 선택은 서버가 현재 membership과 일치 여부를 확인해야 합니다.

서버 RBAC + tenant/project/소유권/보안등급 ABAC를 모든 API에 적용하세요. 관리자 역할만으로 모든 보안등급 접근을 허용하지 마세요. DB RLS는 추가 방어선이며 앱 객체 인가를 대체하지 않습니다. 테넌트 관리자는 위임된 범위 밖의 계정·역할·할당량·정책을 수정할 수 없습니다.

### 4.2 기존 여섯 역할 보존

`general-user`, `project-manager`, `branch-admin`, `portal-admin`, `security-manager`, `security-auditor`를 기반으로 전환하세요. 기존 22개 permission ID의 추적성을 유지하고 필요한 세부 권한을 추가하세요. 역할명·개수 변경이 필요하면 migration/기존 사용자 영향과 변경 근거를 기록하세요.

- 일반사용자: 본인과 소속 프로젝트 범위의 조회·신청.
- 프로젝트 관리자: 담당 프로젝트 범위의 구성원·승인·환경 관리.
- 군별/테넌트 관리자: 자기 tenant의 위임된 사용자·브랜드·메뉴·쿼터 관리.
- 포털 관리자: 전역 운영 설정·tenant 생성·공통 registry, 보안업무 권한은 분리.
- 보안 관리자: 허용 범위의 반출 검토·통제·증적 검토·보안 정책.
- 보안 감사관: 조회·조사 범위, 업무 승인/정책 변경 없음. 내보내기는 별도 권한.

예: `tenant.branding.manage`, `tenant.menu.manage`, `integration.manage`, `audit.export`, `session.revoke`, `support.manage`를 범위와 함께 정의하세요. 역할 미리보기는 정책 평가 결과를 보여주는 읽기전용 기능으로 만들고 실제 사용자 impersonation을 기본 제공하지 마세요.

### 4.3 관리자 보완

사용자 등록·초대·검토·승인·반려·중지·종료, 외부사용자 만료, 조직이동, 그룹/프로젝트 권한, 기간 한정 위임, 계정 잠금 해제, 실제 세션 조회·회수를 구현하세요. 조직이동 시 기존 권한 유지/회수/재승인 규칙과 audit를 구현하세요.

비밀번호 복잡도·만료·로그인 실패·동시 로그인·유휴/최대 세션 시간 정책은 실제 IdP capability와 연결하세요. Firebase Google 로그인처럼 포털이 비밀번호 정책을 통제할 수 없는 경우 미지원 원천과 적용 범위를 표시하세요. 설정 저장과 원천 적용완료를 구분하고 실패 시 이전 정책을 유지하거나 재시도 상태를 남기세요.

권한 부여, 반출 승인, 위험 정책변경은 필요한 승인선·자기승인 금지·사유·만료를 지원하세요. 마지막 유효 관리자/보안 담당자의 접근권한을 실수로 모두 제거하지 못하게 하세요. 서비스 계정도 사용자와 구분하여 소유자·scope·키회전·만료를 관리하세요.

## 5. UI/UX/TX 구현 사양

TX는 이 작업에서 시스템 응답·업무 흐름·지원·운영까지 포함한 전체 사용경험으로 해석합니다. 이 의미를 문서화하고 사용자에게 마케팅 용어를 노출하지 마세요.

### 5.1 디자인 시스템

Samsung SDS FabriX 공개 자료의 자산 발견·업무공간·공유 구조를 참고하세요. 기업 AI 솔루션처럼 정보 계층·여백·검색·명확한 상태를 우선하고 국방 포털의 과업을 그대로 살리세요. 브랜드/이미지/상표를 복제하지 마세요.

- 공통 token: surface/background/text/border/focus/semantic status/brand primary/accent, spacing, radius, typography, density, z-index.
- 기본 light: 배경 `#F5F7FB`, 표면 흰색, 주요 텍스트 `#172033`, 기본 강조색 `#2457D6`를 출발점으로 실제 대비 검사. tenant 색상은 정해진 brand token만 덮어쓰기.
- 본문 14~16px, 행간 1.5 수준, 8px 간격 체계, 10~12px 카드 반경, 약한 그림자, 절제된 강조. 이메일·날짜·ID를 한 글자씩 줄바꿈하지 않기.
- 기본/compact 표 밀도, 명확한 제목·보조설명·핵심 행동, skeleton/empty/error/permissionDenied 공통 컴포넌트.
- WCAG 2.2 AA를 목표로 대비·키보드·focus·screen reader·200% 확대·reduced motion 검증. 자동 검사만으로 전면 준수를 선언하지 않기.
- 폰트·아이콘·정적 리소스는 폐쇄망 배포 가능한 라이선스의 로컬 자산. 외부 CDN/분석추적에 의존하지 않기.

### 5.2 앱 셸과 메뉴

상단 64px 기준: 메뉴 버튼, 포털 표시명/현재 tenant, 필요 시 프로젝트 context, 통합검색, 내 할 일·알림, 도움말, 사용자 메뉴.

sidebar 상태를 `expanded(256px) / compact(72px) / hidden(0px)`로 구현하세요. hidden에서도 상단 열기 버튼은 항상 유지하세요. compact 아이콘에 tooltip/접근성 이름, 현재 메뉴 강조, 그룹 접힘, 즐겨찾기, 최근 사용을 제공하세요. 1024px 미만에서는 overlay drawer, ESC 닫기·focus 복귀·배경 접근차단을 구현하세요. 반응형은 개인 선호와 분리해 작은 화면에서 저장된 expanded가 본문을 밀어내지 않게 하세요.

본문 폭은 하나의 grid/layout 상태로 계산하고 전역 CSS `!important` 보정 누적을 제거하세요. PC 1366/1440/1920, tablet 768, mobile 390 폭을 시험하세요. 관리자 목록은 넓은 표를 기본으로 하고 선택 시 drawer/전용 상세로 표시하세요. 표 자체의 수평스크롤은 허용하되 페이지 전체 넘침을 없애세요.

사용자 메뉴는 ‘홈/내 할 일, 자산 찾기, 프로젝트와 작업환경, 신청·승인, 지원’ 흐름으로 재배치하세요. 관리자 메뉴는 ‘사용자·권한, 테넌트·메뉴, 정책·세션, 연계·운영, 감사·보안’으로 묶으세요. 기존 URL은 유지하거나 권한을 적용한 명시 redirect를 제공하세요.

### 5.3 tenant 브랜드·메뉴

브랜드: 표시명, 로고 asset ID, primary/accent, light/dark/system 허용, 기본 밀도·시작페이지·홈 template. 로고는 PNG/WebP 등 검증된 형식으로 제한하거나 안전한 SVG 검증·정화 절차를 마련하세요. 임의 CSS/HTML/JavaScript 입력 기능은 만들지 마세요.

초안 → 접근성/정책 검사 → 역할별 미리보기 → 게시 → 이력/롤백을 구현하세요. 변경사유·version·If-Match로 충돌을 막으세요. 보안등급·오류·성공의 의미색은 브랜드 변경과 분리하세요. 게시된 테마의 갱신·캐시 무효화를 여러 인스턴스에서 검증하세요.

메뉴의 코드 `routeRegistry`는 지원하는 화면/권한/아이콘 식별자의 허용 목록입니다. DB 메뉴는 registry ID를 참조하세요. 메뉴 DB 문자열을 동적 코드로 실행하지 마세요. 외부 링크는 승인된 HTTPS/internal scheme·호스트·SSO 정책을 검증하고 token을 query로 전달하지 마세요.

`visible`은 탐색 표시, `featureEnabled`는 기능 제공 정책, `permission`은 API 접근권한으로 구분하세요. 숨겨진 메뉴의 직접 URL이 허용되는지 정책을 명시하고, 기능 비활성은 서버에도 반영하세요. 테넌트 관리자의 메뉴 편집으로 권한을 늘릴 수 없게 하세요. 메뉴 순환/고아/중복 route, 복구 진입점 제거를 검증하세요. 드래그와 키보드 이동을 함께 제공하세요.

### 5.4 개인화와 역할별 홈

DB의 `(tenant_id,user_id)` 기준으로 sidebar, 즐겨찾기, 시작페이지, widget 구성/배치, 표 열·밀도·정렬, 저장필터·알림설정을 저장하세요. 최근 조회기록은 민감정보를 줄이고 보존정책을 적용하세요. 브라우저 저장은 비민감 캐시로만 사용하고 logout/권한회수/tenant 변경에 정리하세요.

유효 설정은 `시스템 강제 → tenant 강제 → 허용된 개인설정 → tenant 기본 → 시스템 기본` 순서로 계산하세요. 강제 보안알림은 개인이 숨길 수 없게 하세요. widget은 검증된 ID·설정 schema만 허용하고 arbitrary query/SQL/script를 금지하세요.

홈에 `화면 편집`을 제공하고 위젯 추가/제거·허용된 크기/순서 변경 → 미리보기 → 저장·취소 → 기본값 복원으로 구현하세요. 드래그와 키보드/이동 버튼을 함께 제공하고, 저장된 레이아웃을 직접 조작해도 권한 없는 위젯이 노출되지 않게 하세요.

| 역할 | 홈의 우선 위젯/행동 |
|---|---|
| 일반 사용자 | 작업 이어가기, 내 환경, 최근/즐겨찾기 자산, 내 신청, 사용 한도 |
| 프로젝트 관리자 | 승인 대기, 팀/프로젝트 상태, 만료 임박, 자원·예산 |
| 테넌트 관리자 | 신규 사용자·쿼터·위임, tenant 장애/정책, 브랜드·메뉴 진입 |
| 포털 관리자 | 전체 연계 상태, API 오류·동기화 backlog, 운영 변경·작업 |
| 보안 관리자 | 반출 대기, 누락/만료 증적, 고위험 미해결 건, 검토기한 |
| 보안 감사관 | 권한 범위 사건·감사 조회, 증적 추적, 승인된 조사 작업 |

tenant 전환 시 서버 context 재검증, 진행 요청 abort, cache·선택 객체·drawer·검색추천·알림 구독 정리 후 새 화면을 표시하세요. 이전 tenant 응답이 늦게 도착해도 렌더링하지 마세요. 미저장 입력은 임시저장/유지·취소 흐름을 제공하세요.

### 5.5 기능별 실제 동작

| 기능 | 반드시 구현할 내용 |
|---|---|
| 대시보드 | 권한 범위 실제 집계, 개인/tenant/전체 구분, widget별 원천·asOf·상태. 미수집은 `—`와 이유 |
| 통합검색 | 기존 15종 자산, 한글검색·필터·추천·facet·정렬·pagination·권한 상세, 출처·버전·접근 신청 |
| 카탈로그 | 기존 전체 도구/이미지/패키지를 inventory 기준 보존(첨부 소스의 tool ID는 23개, 인수인계의 22개와 차이 확인), 유형별 버전/호환성/라이선스/비용/상태. 프로젝트 지정 후 실제 신청 |
| 프로젝트 | 실제 CRUD·멤버·기간·상태·연계 ID·삭제/종료 정책·승인·활동 이력 |
| 작업환경 | 신청·승인·예약·생성중·사용중·만료·종료·실패/보상, 접속링크·사용량·확장/연장/종료 |
| 신청 wizard | 기존 7단계 입력 항목·검증 보존. UI는 4단계로 묶을 수 있으나 목적/도구/이미지/자원/기간/비용/보안/프로젝트 누락 금지. 임시저장·재개 |
| 실증 | 기존 실증 프로젝트·합성데이터·시뮬레이터·타 체계 수집·품질/계보·KPI 결과. job ID/상태/원본버전/실패·취소·재시도 |
| 크레딧 | 할당/예약/확정/환불/조정 원장, 단가버전, 단위와 기준시각, 원천 사용량 중복 방지, 추정/확정 구분 |
| 반입·반출 | 대상 version/hash, 승인선, 검역·악성코드/DLP 연계, 보완·반려·재신청, 실제 전달·수신확인, 다운로드 인가·감사 |
| K-RMF | 기준판/통제, 이행계획, 증적·외부제출·미흡·평가·운영전환·변경영향·후속조치의 실제 저장·검토 |
| 알림/내 할 일 | 실제 이벤트→중복제거→대상자 scope→읽음/확인→안전한 상세 링크, 기한·만료 알림 |
| 환경설정 | 타입/범위 검증, 설정 원천·시행일·승인·반영 결과·재시작 필요·버전/롤백 |
| 마이페이지 | 프로필, 로그인/세션, 내 신청·프로젝트·알림·표시설정, API Key 발급·회수·일회 노출·hash 저장 |
| 게시판·지원 | 기존 아이디어 제안 기능 유지, CRUD·댓글/답변·검토상태·첨부검사·페이지·감사. 공지/FAQ·사용도움 제공 |
| 관리자 진단 | 연계별 health/lastSuccess/backlog/error, 권한 있는 연결시험·재처리, 설정변경과 실행결과 감사 |
| 개발지원 화면 | 요구사항 대응/진도표·API 후보·시나리오·역할 미리보기 보존, 일반 사용자 흐름 밖에 별도 권한으로 배치 |

기존 Spark, Presto, Kafka, Jupyter, VSCode Server, SQL Workbench, OpenMetadata, BI, Label Studio, Docker Registry, PyPI Mirror, LLM Fine-tuning, RAG, AI Factory, PyTorch/OpenCV 자산 등은 실제 fixture 목록과 대조하세요. 포털에 제품을 새로 설치하는 요구와 카탈로그/연계표시 요구를 구분하세요.

### 5.6 공통 TX

`loading/empty/ready/stale/disconnected/partial/permissionDenied/error/submitting/conflict`를 구분하세요. 잘못된 입력은 필드 가까이에 원인과 수정방법, 서버 오류는 사용자 메시지와 문의용 requestId를 제공하세요.

장시간 작업은 operation detail에서 현재 단계·시작시각·최종갱신·재시도·취소 가능성·원천 상태를 표시하세요. `접수`를 `완료`로 표시하지 마세요. 더블클릭/새로고침/탭 중복/네트워크 재전송에서 동일 쓰기의 중복 실행을 막으세요. 재시도는 멱등성이 보장된 요청만 자동화하세요.

## 6. PostgreSQL 구현

동반 상세 사양에 정의된 도메인 테이블·키·인가·감사 규칙을 실제 migrations로 구현하세요. UUID 식별자, `timestamptz`, version, FK/unique/check/index, 명확한 soft-delete/보존 정책을 적용하세요. 금액·크레딧·사용량은 float 오차가 없는 decimal 또는 정의된 최소단위 정수로 처리하세요.

테넌트 자원에 `(tenant_id,id)` 복합 제약과 참조를 적용하여 다른 tenant의 project/user/attachment를 연결할 수 없게 하세요. 전역 registry는 예외 테이블로 명시하세요. RLS의 `USING/WITH CHECK`와 no-context 거부를 시험하세요. runtime role은 owner/superuser/BYPASSRLS가 아니어야 하며 migration role과 분리하세요. 트랜잭션 범위 `SET LOCAL`/`set_config(...,true)` 방식으로 context를 설정하고 pool 재사용 누출을 막으세요.

전역 신원 테이블 `fc_users`의 FK는 user_id를 사용하고, tenant 안의 사용자 소속을 참조하는 업무 관계는 `fc_tenant_memberships(tenant_id,user_id)` 등 유효 membership에 연결하세요. 의도적인 cross-tenant 자산 공유는 명시된 grant 테이블/정책 경로에만 허용하고 일반 복합 FK 규칙의 무분별한 예외로 만들지 마세요.

업무 변경 + 감사 원장 + outbox는 하나의 DB 트랜잭션에 저장하세요. 외부 API 호출 동안 DB lock을 장시간 잡지 마세요. outbox claim/lease, idempotency key, operation 상태, 중복 callback과 reconciliation을 구현하세요. API 결과가 불명확한 timeout은 원천 상태를 조회한 뒤 재시도하세요.

production migrations를 API 인스턴스 3개가 동시에 수행하지 않게 별도 migration job·lock·배포순서로 관리하세요. expand/contract 방식과 백업·복원·rollback 검증을 제공하세요. 파괴적 down migration을 rollback의 유일한 수단으로 두지 마세요.

DB connection pool은 Cloud Run 최대 인스턴스 × 각 pool + worker + Keycloak/Backstage + 관리 여유가 DB 한도를 넘지 않게 산정하세요. 단순히 인스턴스별 pool 100을 설정하지 마세요. 모든 SQL은 parameter binding, 사용자 정렬 컬럼은 허용목록으로 제한하세요.

## 7. 플랫폼 API와 OpenSearch

### 7.1 계약과 adapter

기존 PAI 20개 + PORTAL 18개를 모두 추적하세요. 후보 ID는 문서 별칭으로 보존하고 중복 계약을 합리적으로 통합하세요. `FILE/EVENT`를 HTTP method로 구현하지 마세요. Guest refresh 후보는 운영 대상에서 제외하세요. API 요구가 실제 시스템의 method/path와 같다고 가정하지 마세요.

DataPlatform, AiPlatform, Cmp, OpenMetadata, ArtifactRegistry, ExportSecurity, KrmfAssessment, Pilot/ExternalData adapter를 실제 범위에 맞게 모듈화하세요. OpenMetadata의 기존 MySQL/Elasticsearch는 포털 PostgreSQL/OpenSearch와 별개입니다. 호환성 검증 없이 같은 DB/검색으로 합치거나 모두 PostgreSQL로 전환하지 마세요.

각 계약은 owner/source version/auth scope/tenant binding/request-response/단위/시간대/status mapping/pagination/timeout/retry/idempotency/webhook signature/freshness/error/삭제·권한 변경을 정의하세요. 원천 URL은 관리자 입력도 검증하고 임의 URL 프록시·SSRF·리다이렉트 우회·자격증명 유출을 막으세요.

일반 사용자에게 `연결 안 됨`, `마지막 확인값`, `갱신 지연`, `조회 실패`와 다음 행동을 이해하기 쉽게 표시하세요. 내부 관리자는 추가 error code·correlation ID·재시도 상태를 볼 수 있게 하세요. 원천 IP/토큰/민감 body를 사용자 화면에 노출하지 마세요.

### 7.2 검색 경로

`브라우저 → 인가된 /api/portal/v1/search → 서버 생성 DSL → OpenSearch`로 구현하세요. 브라우저의 임의 DSL/index/필터 삭제를 허용하지 마세요. 읽기 검색 계정·색인 계정·운영 계정을 분리하고 TLS/CA 검증을 강제하세요.

검색 문서에 tenant/project/source/sourceId/assetType/title/description/version/license/owner/tags/security classification/ACL/ACL version/sourceUpdatedAt/indexedAt을 정합적으로 넣으세요. 한글 analyzer는 선택 버전에서 지원되는 플러그인 설치·호환을 검증하고 외부망 없이 설치 가능한 이미지를 준비하세요.

인가 필터는 hits 전에 적용하고 total/facets/suggestions/highlight/export/detail 모두 동일 정책으로 보호하세요. 권한 회수/등급 변경 직후 지연된 index가 민감정보를 노출하지 않도록 authoritative ACL/version 검증과 stale partition 차단 전략을 구현하세요. hits의 사후 필터만으로 total·추천 누출을 해결했다고 주장하지 마세요.

등록·수정·삭제·소속/공유/등급변경 이벤트를 incremental indexer가 반영하고, 주기 reconciliation으로 누락을 복구하세요. 문서 ID 중복, tombstone, 재처리, backfill, index version + alias swap + rollback, schema drift를 처리하세요. 포털 색인을 바꿔 원천 플랫폼의 내부 색인을 훼손하지 마세요.

### 7.3 3노드 검증

single-node 옵션·보안 해제를 운영 구성에서 제거하세요. cluster_manager 3 eligible, 서로 다른 failure domain, bootstrap seed·노드명·TLS SAN·transport trust를 맞추세요. bootstrap 설정의 초기 구성과 재시작 동작을 구분하고 매번 새 cluster를 만들지 마세요.

3사본 정책이면 `replicas=2`, 각 사본 분산을 확인하세요. 정상 green, 한 노드 정지 시 허용된 yellow와 서비스 지속, 복귀 후 green, 두 노드 상실 시 정족수 보호를 시험하세요. `_cluster/health`, `_cat/nodes`, `_cat/shards`, allocation explain, 실제 검색/색인/스냅샷 복원 결과를 함께 증적으로 남기세요. 명령이 200을 반환한 것만으로 합격하지 마세요.

## 8. K-RMF 감사와 증적

공식 통제집/기관 적용 기준판이 없으므로 기존 mock의 통제명을 공식 항목으로 단정하지 마세요. internal ID, RFP ID, 공식 control ID, 기준판/출처/쪽수, 적용 여부, 책임자, 상태를 분리하세요. 기준판 import·검토·승인·변경이력을 구현하고 필요 기능은 기준 자료 없이도 시험 가능한 합성 fixture를 사용하세요.

감사 이벤트 최소 필드는 상세 사양을 따르세요. 로그인 성공/실패/로그아웃, 세션/토큰 회수, 사용자/역할/소속/위임, tenant/메뉴/브랜드/설정, 신청/승인/반려/취소, 중요조회/검색/다운로드/내보내기, 증적 변경, 외부 API 부작용, 권한 거부, 운영 복구를 기록하세요. 검색어/원문 body/토큰/비밀번호/민감 개인정보는 무조건 수집하지 말고 최소화·마스킹·정책화를 적용하세요.

원장은 runtime의 UPDATE/DELETE를 차단하고 별도 감사 관리자와 보존 아카이브를 사용하세요. OpenSearch는 검색용 복제본입니다. hash chain만으로 DBA까지 막는 불변성을 주장하지 마세요. batch digest·서명·별도 계정/스토리지의 보존·무결성 검증을 결합하고 키회전·복구 절차를 기록하세요.

중요 쓰기에서 필수 감사 원장 저장이 실패하면 업무 트랜잭션도 실패해야 합니다. 중앙 검색/수집 장애는 durable outbox에 보관 후 재전송하며 적체·디스크 포화 경보를 발생시키세요. 인증거부처럼 업무 DB 트랜잭션 밖의 이벤트도 안전한 내구성 경로와 실패정책을 정의하세요.

증적은 검역→검사→버전 등록→제출→검토→승인/반려→후속조치→완료 확인 흐름을 구현하세요. 승인된 파일/메타데이터 변경은 새 버전과 재검토로 처리하세요. SHA-256, 원본버전, 수집주체/시각/출처, 관련 구현·시험·로그 requestId를 연결하세요. 포털은 인가권자가 아니며 자동 ‘K-RMF 인증완료’ 버튼을 만들지 마세요.

## 9. 시험 데이터 정비

기존 mock 파일을 모두 inventory로 추출하고 실제 entity 관계에 맞게 변환하세요. summary count와 list count, project/user/tenant FK, 단위/기간/상태, 누락/중복 ID를 검사하세요. K-RMF의 증빙 합계 47 vs 목록 8 등 발견된 불일치를 고치고 분모·필터를 지표별로 정의하세요.

- `seed:reference`: permission/menu/status/catalog schema 등 최소 기준 데이터. 허구 사용자·성과·증적 없음.
- `seed:integration`: 육/해/공/공통 tenant, 여섯 역할, 다중 소속·공유 자산·권한 회수·이름 중복·빈 목록·대량 데이터·장애 시나리오. 합성 표기 및 고정 seed.
- `seed:performance`: 별도 DB/버킷/인덱스에서만 부하 규모 생성.

production에서 integration/performance seed를 실행하지 못하도록 환경·대상 식별 검사와 명시 플래그를 적용하세요. 합성 데이터의 완료·합격·정상 상태가 실제 운영 실적으로 이관되지 않게 하세요.

## 10. 단계별 실행과 합격 게이트

각 단계는 실제 구현·시험·변경기록을 완료하고 다음으로 진행하세요. 화면만 먼저 모두 바꾸고 서버 구현을 끝없이 미루지 마세요.

| 단계 | 구현 범위 | 다음 단계 진입 조건 |
|---|---|---|
| P0 | 현황/행동 inventory, 버전 baseline, 운영 우회 차단, 안전한 구성검증 | 기존 회귀 기준 확보, guest/admin preview/mock 운영 유입 차단 시험 |
| P1 | PostgreSQL, 인증/서버 인가, tenant/user/role, audit/outbox | A/B tenant negative test, 실제 저장·재시작, 감사 원자성 |
| P2 | 앱 셸·브랜드/메뉴·개인화·관리자 사용자/세션·정책 | 사용자별 저장/복원·모든 sidebar 상태·정책 적용·시각/접근성 시험 |
| P3 | 프로젝트·환경·승인·크레딧·파일·알림·게시판 | 실제 트랜잭션/상태전이·동시성·실패보상·다운로드 시험 |
| P4 | API adapter·실증·카탈로그·OpenSearch 인가/색인 | 38개 계약 상태 정리, 실 검색·삭제·회수·원천 오류시험 |
| P5 | K-RMF 전체 생애주기·증적·감사 관제 | 원본/증적/시험 추적, 집계 정합성, 감사 무결성·보존 시험 |
| P6 | Kong·3중화·백업/복구·관제·보안/성능·배포 | 장애/복원 실측, 운영 전환 체크리스트, 승인 가능한 배포 패키지 |

외부자료가 없어 P4 일부가 막혀도 준비된 adapter와 P5/P6의 독립 작업을 진행하세요. 금액·기간·테스트 수를 채우기 위해 가짜 구현이나 의미 없는 테스트를 늘리지 마세요.

## 11. 자체시험 및 증거

`KAIPotal_Implementation_Test_Spec.md`의 AT 항목을 실제 automated test/운영시험 절차로 구현하세요. 최소한 다음을 실행하세요.

- lockfile 기반 설치, typecheck, 전체 lint, production frontend/backend build, baseline/new unit test.
- 실제 PostgreSQL의 migrations/RLS/동시승인/원장/outbox integration test.
- 실제 Keycloak 로그인/권한회수/다중tenant/세션 만료 브라우저 E2E.
- 실제 OpenSearch 3노드의 색인·필터·ACL·장애·스냅샷 복구시험.
- API 계약 서버 장애주입과 제공된 실제 sandbox 시험을 별도 실행.
- Playwright 주요 역할·화면·반응형·키보드·저장/재로그인/재시작·download 파일내용 검증.
- 첨부 스크립트의 ‘버튼 클릭이면 성공’, SPA 200 성공, 개별 실패 후 exit 0을 수정. assertion 실패는 비정상 종료.
- 비밀검사·SBOM·의존성/이미지 취약점·기본 웹 보안·인가 negative test.
- 혼합부하·worker backlog·DB pool·검색지연 측정, 장애 및 복원 RPO/RTO 실측.

기존 무관한 lint 실패가 있으면 원인/범위를 분리해서 수정하거나 구체적 잔여 결함으로 남기세요. 시험을 지우거나 assertion을 약화해 green을 만들지 마세요. flaky 재실행 성공은 최초 실패 원인을 함께 기록하세요.

`TEST_REPORT.md`에 환경, commit SHA, 실행시각, 명령, 실제 case 수, PASS/FAIL/BLOCKED/SKIPPED, 로그·캡처·trace 경로를 기록하세요. 미실행은 0건 성공으로 보고하지 마세요. 합격 판정용 보고서와 사용자 데이터가 포함된 원본 증거의 접근권한도 분리하세요.

## 12. 운영 패키지·주석·최종 보고

최종 산출물:

1. 실제 frontend/backend/worker 소스와 한국어 핵심 주석, 형식화된 API schema, 서버 validation.
2. migrations/reference·integration seed/DB 권한·RLS/복구절차/ERD/데이터사전.
3. OpenAPI와 이벤트/파일계약, 38개 후보 추적표, source-of-truth·필드 매핑·지원 capability.
4. tenant theme/menu/home 설정, 개인정보·보안 정책, 역할별 사용가이드, 관리자 운영가이드.
5. 로컬 integration Compose, GCP staging 설정, VM/systemd 운영 설치, Kong 선언형 설정, PG/Keycloak/OpenSearch HA 설정.
6. 모니터링·로그·감사·snapshot/PITR·DR·인증서/키회전·오프라인 패키징 runbook.
7. TEST_REPORT, SECURITY_REVIEW, UX_REVIEW, BACKUP_RESTORE_REPORT, HA_TEST_REPORT, RELEASE_CHECKLIST, 알려진 제한과 외부 BLOCKED 목록.

주석에는 tenant/정책 경계, 지표 의미·단위·기준시각, 멱등성·재시도·보상 조건, 상태전이 불변식, RLS/pool 처리 이유, 외부 계약 버전·미지원 기능을 적으세요. 변경 의도를 설명하지 않는 반복 주석과 ‘TODO 나중에 연동’으로 핵심 로직을 대체하지 마세요.

기존 demo를 덮어쓰기 전에 staging에서 DB migration/백업/설정/rollback을 검증하고 대상·영향·비용이 드러나는 배포계획을 준비하세요. 사용자가 이미 승인한 대상에서는 재승인 요구 없이 진행하되, 승인되지 않은 운영 DB 변경·외부 공개·유료 자원 증설을 임의 실행하지 마세요. 외부 권한이 없어도 구현·로컬시험·배포 패키지까지 완성하세요.

작업 종료 시 저장소의 기존 규칙에 따라 `CHANGE_SUMMARY.md`에 다음을 기록하세요: 변경 목적·기능별 완료, 주요 파일, DB migration, 검증 명령·결과, 운영 설정, 위험·미완료·다음 조치. 이어서 반드시 다음 완료 스크립트를 실행하고 결과를 남기세요.

```bash
if [ -f "$HOME/ai-factory/orchestrator/scripts/kimi_done.sh" ]; then
  bash "$HOME/ai-factory/orchestrator/scripts/kimi_done.sh"
else
  printf '%s\n' 'BLOCKED: ~/ai-factory/orchestrator/scripts/kimi_done.sh 파일 없음'
fi
```

스크립트가 없거나 실패하면 성공으로 꾸미거나 같은 이름의 대체 스크립트를 만들어 우회하지 마세요. 실행 직전 CHANGE_SUMMARY를 기록하고, 실행 결과도 이어서 보완하세요.

최종 응답은 `구현 완료 / 실연동 완료 / 시험 완료 / 외부 차단 / 사용자 설정 / 운영 승인 전 남은 일` 표로 간결하게 보고하세요. 전체 완료 조건을 충족하지 못했으면 무엇이 남았는지 정확히 명시하세요.
