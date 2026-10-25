# ARCHITECTURE - 국방지능형플랫폼포털

## 개요

본 문서는 국방지능형플랫폼포털 PoC의 전체 아키텍처를 정의합니다.

## PoC 범위

- 포털 프레임워크: Backstage
- 인증/권한: Keycloak (OIDC)
- 데이터/AI 카탈로그: OpenMetadata
- 검색엔진: OpenSearch
- 업무 특화 기능: Backstage 자체 플러그인

## 전체 구성도

```text
[User]
  ↓ HTTP
[Backstage Portal]
  ↓ OIDC (3단계 완료)
[Keycloak]
  Realm: kt-ai
  Client: backstage
  ↓ Catalog API
[OpenSearch] ←──→ [OpenMetadata]
```

```text
┌─────────────────────────────────────────────────────────────┐
│                    User (macOS + VS Code)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────────┐
│              Backstage Portal (backstage-portal)            │
│  ┌──────────────┬──────────────┬─────────────────────────┐  │
│  │ project-     │ export-      │ credit-   │ krmf-       │  │
│  │ workspace    │ approval     │ manager   │ evidence    │  │
│  └──────────────┴──────────────┴───────────┴─────────────┘  │
└──────────────┬──────────────────────┬───────────────────────┘
               │ OIDC (3단계 연동 완료) │ Search API
┌──────────────▼──────┐      ┌────────▼─────────┐
│      Keycloak       │      │    OpenSearch    │
│  Realm: kt-ai       │      │ Index: portal-   │
│  Client: backstage  │      │ catalog          │
└─────────────────────┘      └────────┬─────────┘
                                      │ Catalog API
                           ┌──────────▼──────────┐
                           │    OpenMetadata     │
│                          │ (Data/AI Catalog)   │
│                          └─────────────────────┘
```

## 레이어 구성

### 1. 포털 레이어 (Backstage)

- Backstage 프레임워크 기반
- 플러그인 아키텍처로 확장
- Keycloak OIDC 연동을 통한 SSO (3단계 완료)
- OpenSearch 기반 통합검색 UI
- OpenMetadata 카탈로그 연동 UI

### 2. 인증/권한 레이어 (Keycloak)

- `kt-ai` Realm
- `backstage` Client
- 그룹/역할 기반 권한 관리
- 개발용 관리자: admin/<password>
- OIDC 연동: 3단계에서 Backstage와 연동 완료
- 11.1단계에서 `.env` 기반 clientSecret/session secret 로딩을 `scripts/start-dev.sh`로 안정화

### 3. 검색 레이어 (OpenSearch)

- OpenSearch: `http://localhost:9200`
- OpenSearch Dashboards: `http://localhost:5601`
- 컨테이너명: `kt-opensearch`, `kt-opensearch-dashboards`
- 개발용 단일 노드
- `portal-catalog` 인덱스
- 메타데이터 타입: dataset, model, docker_image, pypi_package, document
- 10단계에서 Backstage backend proxy를 경유한 통합검색 UI 연동 완료

### 4. 카탈로그 레이어 (OpenMetadata)

- OpenMetadata Server: `http://localhost:8585`
- OpenMetadata Admin/Health: `http://localhost:8586`
- 데이터셋, 테이블, AI 모델, 파이프라인 메타데이터 관리
- Backstage와의 API 연동 후보 확보 (10단계에서 직접 연동)

## 자체 플러그인 목록

| 플러그인 | 목적 | 상태 |
|----------|------|------|
| project-workspace | 프로젝트/워크스페이스 관리 | PoC 완료 (mock data) |
| export-approval | 반출/반입 관리 | PoC 완료 (mock data) |
| credit-manager | 크레딧 관리 | PoC 완료 (mock data) |
| krmf-evidence | K-RMF 증빙관리 | PoC 완료 (mock data) |
| integrated-search | 통합검색/카탈로그 검색 | PoC 완료 (OpenSearch `portal-catalog` 연동) |
| portal-dashboard | 메인 포털 대시보드 | PoC 완료 (mock data) |
| admin-console | 관리자 기능 허브 | PoC 1차 화면 (mock data) |

## Portal Dashboard 레이어

Portal Dashboard는 Backstage 포털의 최초 진입 화면(`/` 경로)으로, 기존 업무 기능들의 요약 정보를 mock data 기반으로 보여준다.

- 사용자가 로그인 후 처음 보는 화면
- 데이터셋, AI 모델, 프로젝트, 반출승인, 크레딧, K-RMF 증빙, 시스템 상태를 한눈에 표시
- 각 기능 페이지(Integrated Search, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence)로 이동하는 허브 역할
- 외부 관리도구(OpenMetadata, OpenSearch Dashboards, Keycloak Admin) 바로가기 제공
- 제안장표 및 데모 시나리오에 적합한 카드형 시각적 구성
- 후속 단계에서는 각 플러그인/API와 실제 연동하여 실시간 요약 정보를 제공할 예정

```text
[User]
  ↓
[Backstage Portal]
  ↓ /
[Portal Dashboard]
  ↓        ↓        ↓         ↓          ↓
integrated  project  export   credit    krmf
-search   -workspace -approval -manager  -evidence
  ↓
OpenSearch / OpenMetadata / Keycloak
```

## 개발 환경

- OS: macOS
- IDE: VS Code
- Container: Docker Desktop
- Runtime: Node.js 24 (Yarn 4.13 via Backstage .yarnrc.yml)
- Backstage: 1.38 (최신 stable)
- Keycloak: 26.2.4 (Docker 개발 모드)

## 1단계 완료 상태

- Backstage 기본 포털이 `http://localhost:3000`에서 실행 중
- 좌측 메뉴 구조 확인 완료 (Home, Search, Catalog, Create, APIs, Catalog Graph, Docs, Notifications, Settings)
- `backstage-portal/plugins/` 폴터가 있어 향후 자체 플러그인 추가 가능

## 2단계 완료 상태

- Keycloak Docker 컨테이너 `kt-keycloak`이 `http://localhost:8080`에서 실행 중
- `kt-ai` Realm 생성 완료
- `backstage` Client 생성 완료 (Client authentication On)
- Realm roles 5개 생성 완료 (portal-admin, project-manager, developer, analyst, external-user)
- Groups 5개 생성 완료
- 테스트 사용자 5명 생성 및 역할/그룹 매핑 완료
- OpenID Configuration URL 확인: http://localhost:8080/realms/kt-ai/.well-known/openid-configuration
- OIDC 연동은 3단계에서 완료

## 3단계 완료 상태

- Backstage `app-config.yaml`에 OIDC Provider (`oidc`) 설정 완료
- Keycloak `kt-ai` Realm의 OpenID Configuration URL 연결 완료
- Client Secret 및 session secret을 환경변수로 분리 (`.env` / `.env.example`)
- Backstage 로그인 페이지에 `Guest`, `Keycloak` 로그인 버튼 노출
- Keycloak 로그인 성공 후 Backstage로 복귀 및 인증 토큰 발급 확인
- Backstage identity에 Keycloak 사용자 정보(user ID, display name, email) 반영 확인
- 상세 설정은 `docs/KEYCLOAK_INTEGRATION.md` 참조

## 4단계 완료 상태

- OpenSearch Docker 컨테이너 `kt-opensearch`가 `http://localhost:9200`에서 실행 중
- OpenSearch Dashboards `kt-opensearch-dashboards`가 `http://localhost:5601`에서 실행 중
- `portal-catalog` 인덱스 생성 완료
- 메타데이터 기반 키워드 검색 및 필터링 검증 완료
- 샘플 데이터 10건 적재 (dataset 4건, model 2건, docker_image 1건, pypi_package 1건, document 2건)
- 상세 설정은 `docs/SEARCH_DESIGN.md` 참조

## 5단계 완료 상태

- OpenMetadata Docker 컨테이너 6개(`openmetadata_server`, `openmetadata_mysql`, `openmetadata_elasticsearch`, `openmetadata_ingestion`, `execute_migrate_all` 등)가 정상 실행 중
- OpenMetadata UI `http://localhost:8585` 접속 및 로그인 페이지 확인
- OpenMetadata API `/api/v1/system/version` 응답 확인 (버전 1.6.0)
- JWT 로그인(`POST /api/v1/users/login`) 및 `tables`, `mlmodels` API 호출 검증
- 기존 `kt-keycloak`(8080) 및 `kt-opensearch`(9200)와의 포트 충돌 회피를 위해 Elasticsearch/MySQL/Ingestion 호스트 포트 매핑 제거
- OpenMetadata 내장 Elasticsearch(`openmetadata_elasticsearch`)와 `kt-opensearch`를 분리 운영
- 상세 설정은 `docs/OPENMETADATA_DESIGN.md` 참조

## 6단계 완료 상태

- `project-workspace` PoC 컴포넌트 구현 완료
- Backstage 좌측 메뉴에 `Project Workspace` 항목 추가
- `/project-workspace` 경로에서 프로젝트 목록, 상세, 생성 신청 화면 확인
- mock data 기반 5건 이상의 샘플 프로젝트 표시
- 상태 Badge(Chip), 참여자/역할, 리소스 할당량 UI 구현
- Keycloak OIDC 로그인 유지 (admin01 사용자 로그인 상태에서 메뉴 접근 확인)
- 상세 설정은 `docs/PLUGIN_PROJECT_WORKSPACE.md` 참조

## 7단계 완료 상태

- `export-approval` PoC 컴포넌트 구현 완료
- Backstage 좌측 메뉴에 `Export Approval` 항목 추가 (`Home`, `Project Workspace`와 함께 유지)
- `/export-approval` 경로에서 반출/반입 신청 목록, 상세, 등록 화면 확인
- mock data 기반 8건 이상의 샘플 반출/반입 신청 데이터 표시
- 반출/반입 구분, 대상 유형 Chip, 승인 상태 Chip, 보안등급/공개여부/사용권한 UI 구현
- 첨부자료 목록, 감사로그 표시
- `Project Workspace` 화면 및 Keycloak OIDC 로그인 유지
- 상세 설정은 `docs/PLUGIN_EXPORT_APPROVAL.md` 참조

## 8단계 완료 상태

- `credit-manager` PoC 컴포넌트 구현 완료
- Backstage 좌측 메뉴에 `Credit Manager` 항목 추가 (`Home`, `Project Workspace`, `Export Approval`과 함께 유지)
- `/credit-manager` 경로에서 프로젝트별 크레딧 현황, 요약 카드, 충전/사용 이력, 자원별 단가, 자원 사용 가능 상태, 알림 패널 확인
- mock data 기반 5건 이상의 샘플 프로젝트 크레딧 데이터 표시
- 크레딧 상태(정상/주의/부족/소진/중지)에 따른 자원 제한/허용 UI 구현
- `Project Workspace`, `Export Approval` 화면 및 Keycloak OIDC 로그인 유지
- 상세 설정은 `docs/PLUGIN_CREDIT_MANAGER.md` 참조

## 9단계 완료 상태

- `krmf-evidence` PoC 컴포넌트 구현 완료
- Backstage 좌측 메뉴에 `K-RMF Evidence` 항목 추가 (`Home`, `Project Workspace`, `Export Approval`, `Credit Manager`와 함께 유지)
- `/krmf-evidence` 경로에서 통합진척률 대시보드, 통제항목 관리, 증빙자료 관리, 보안 미흡사항 조치관리, 타 수행사 제출자료 관리 화면 확인
- mock data 기반 10개 이상의 K-RMF 통제항목 및 관련 증빙/미흡/수행사 자료 데이터 표시
- `Project Workspace`, `Export Approval`, `Credit Manager` 화면 및 Keycloak OIDC 로그인 유지
- 상세 설정은 `docs/PLUGIN_KRMF_EVIDENCE.md` 참조

## 10단계 완료 상태

- `integrated-search` PoC 컴포넌트 구현 완료
- Backstage 좌측 메뉴에 `Integrated Search` 항목 추가
- `/integrated-search` 경로에서 OpenSearch `portal-catalog` 인덱스 키워드/필터 검색 화면 확인
- Backstage backend proxy(`/api/proxy/search`)를 경유하여 OpenSearch `portal-catalog/_search` 조회
- 검색어 `multi_match` 및 `bool filter`(유형, 보안등급, 소스 시스템, 태그) 적용
- OpenSearch 연결 실패 시 `mockSearchResults` fallback 처리
- `Project Workspace`, `Export Approval`, `Credit Manager`, `K-RMF Evidence` 화면 및 Keycloak OIDC 로그인 유지
- 상세 설정은 `docs/SEARCH_IMPLEMENTATION.md` 참조

## PoC 이후 확장 방향

- Kubernetes 기반 배포
- 데이터베이스(PostgreSQL) 연동
- 실제 Keycloak 운영 Realm 분리
- OpenSearch 클러스터 구성
- OpenMetadata 완전 연동
- CI/CD 파이프라인 구축

## 11단계 완료 상태

- `portal-dashboard` PoC 컴포넌트 구현 완료
- `/` 경로를 Portal Dashboard로 교체
- Hero, 통합검색 바로가기, 주요 현황 요약, 공지사항, 신규 자산, 내 프로젝트, 반출 대기, 크레딧, K-RMF, 시스템 상태, 바로가기 구성
- 제안장표 및 데모 시나리오에 적합한 카드형 시각적 레이아웃 적용
- 기존 메뉴 및 Keycloak OIDC 로그인 유지
- 상세 설정은 `docs/PORTAL_DASHBOARD.md` 참조

## 11.1단계 완료 상태

- `backstage-portal/scripts/start-dev.sh` 추가
- `.env` 기반 `AUTH_OIDC_CLIENT_SECRET`, `AUTH_SESSION_SECRET` 로딩 안정화
- macOS 기본 bash 3.2 호환성 확보
- `admin01` Keycloak OIDC 로그인 검증 완료
- Portal Dashboard에 Keycloak 사용자 정보(`Admin Kim`, `admin01@kt.ai`) 표시 확인
- 상세 설정은 `docs/OIDC_RUNTIME_FIX.md` 참조

## 12단계 완료 상태

- `docs/FINAL_DELIVERABLES.md` 작성
- `docs/DEMO_SCRIPT.md` 작성
- `docs/TECH_DEBT.md` 작성
- 주요 화면 캡처 10건을 `docs/assets/final/`에 정리
  - Portal Dashboard, Integrated Search, Project Workspace, Export Approval, Credit Manager, K-RMF Evidence, OpenMetadata, OpenSearch Dashboards, Backstage Sign-In, Keycloak Login
- PoC 한계사항, 운영 전환 고려사항, 후속 개발 과제, 보안 주의사항 정리

## 13단계 완료 상태

- 포털 명칭 `국방지능형플랫폼포털 (K-Defense Intelligence Platform)`으로 변경
- `admin-console` PoC 컴포넌트 추가
  - 사용자 등록 신청, 사용자 관리, 권한/역할, 로그인 정책, 비밀번호 정책, 감사 로그, 메뉴 관리, 요구사항 대응 현황 패널
- `/admin-console` 경로에서 Admin Console 확인
- `App.tsx` 사이드바에 `Admin Console` 메뉴 추가
- Portal Dashboard에 `Admin Console` 바로가기 추가
- `docs/REQUIREMENT_SCREEN_COVERAGE.md` 작성
- README 및 문서 갱신

## 14단계 완료 상태

- Admin Console 사용자 관련 화면 상세화
  - 사용자 등록 신청 상세 화면 (`UserRegistrationDetail`)
  - 본인확인 상태 Chip (`UserIdentityVerificationChip`)
  - 승인/반려/보완요청/재신청 mock workflow (`UserApprovalWorkflow`)
  - 외부 사용자 관리 패널 (`ExternalUserManagementPanel`)
  - 사용자 소속/역할/접속 가능 서비스 설정 패널 (`UserAccessServicePanel`)
  - 사용자 상태 변경 이력 패널 (`UserStatusHistoryPanel`)
- Admin Console 탭에 `외부 사용자 관리` 추가
- `docs/USER_MANAGEMENT_DESIGN.md` 작성
- 요구사항 화면 대응 현황 갱신

## 15단계 완료 상태

- Admin Console 권한/RBAC 화면 상세화
  - 역할 목록/상세 (`RoleDetailPanel`)
  - 역할별 권한 매트릭스 (`RolePermissionMatrix`)
  - 그룹 관리 (`GroupManagementPanel`)
  - 사용자/그룹 권한 매핑 (`UserGroupMappingPanel`)
  - 프로젝트별 역할 매핑 (`ProjectRoleMappingPanel`)
  - 서비스별 권한 (`ServicePermissionPanel`)
  - 데이터 접근 등급 (`DataAccessLevelPanel`)
  - 승인 권한 (`ApprovalPermissionPanel`)
  - 조직 상태 변경 권한 회수/인계 (`OrganizationTransferPanel`)
  - 권한 변경 감사이력 (`PermissionChangeHistoryPanel`)
- Admin Console 메뉴/프로그램 관리 상세화
  - 메뉴 트리 (`MenuTreePanel`)
  - 메뉴 상세/수정/이동/기능 연결 (`MenuDetailPanel`)
  - 메뉴 별 권한 연결 (`MenuPermissionPanel`)
  - 프로그램 관리 (`ProgramRegistryPanel`)
- `docs/RBAC_MENU_MANAGEMENT_DESIGN.md` 작성
- 요구사항 화면 대응 현황 갱신

## 16단계 완료 상태

- Admin Console 로그인/비밀번호 정책 화면 상세화
  - 로그인 정책 목록/상세 (`LoginPolicyPanel`, `LoginPolicyDetailPanel`)
  - 로그인 실패 차단 정책 (`LoginFailurePolicyPanel`)
  - 중복 로그인 정책 (`ConcurrentLoginPolicyPanel`)
  - 자동 로그아웃/세션 정책 (`SessionTimeoutPolicyPanel`)
  - 비밀번호 정책 목록/상세 (`PasswordPolicyPanel`, `PasswordPolicyDetailPanel`)
  - 비밀번호 복잡도 (`PasswordComplexityPanel`)
  - 비밀번호 만료/잠금 현황 (`PasswordExpirationPanel`)
  - 계정 잠금 정책 (`AccountLockPolicyPanel`)
- Admin Console 감사 로그 화면 추가
  - 감사 로그 대시보드 (`AuditLogDashboard`)
  - 통합 감사 로그 목록/필터 (`AuditLogPanel`, `AuditLogFilterPanel`)
  - 로그인/로그아웃 이력 (`LoginHistoryPanel`, `LogoutHistoryPanel`)
  - 비밀번호 변경 이력 (`PasswordChangeHistoryPanel`)
  - 사용자 접근 로그 (`UserAccessLogPanel`)
  - 사용자 정보수정 로그 (`UserInfoChangeLogPanel`)
  - 보안 감사 (`SecurityAuditPanel`)
  - 관리자 조치 이력 (`AdminActionHistoryPanel`)
  - 위험/이벤트 Chip (`AuditRiskChip`, `AuditEventTypeChip`)
- `docs/SECURITY_POLICY_AUDIT_DESIGN.md` 작성
- 요구사항 화면 대응 현황 갱신

## 17단계 완료 상태

- Service Catalog 화면 추가
  - 메인 페이지 (`ServiceCatalogPage`)
  - 요약 카드 (`ServiceCatalogSummaryCards`)
  - 도구 카테고리 탭 (`ToolCategoryTabs`)
  - 도구 목록/상세 (`ToolCatalogList`, `ToolCatalogDetail`)
  - 도구 선택 패널 (`ToolSelectionPanel`)
  - 직접 입력 요청 (`DirectToolRequestForm`, `DirectRequestList`)
  - 요구사항 대응 현황 (`CatalogRequirementCoveragePanel`)
- Proposal Board 화면 추가
  - 메인 페이지 (`ProposalBoardPage`)
  - 요약 카드 (`ProposalSummaryCards`)
  - 제안 탭 (`ProposalTabs`)
  - 제안 목록/상세 (`ProposalList`, `ProposalDetail`)
  - 제안 등록 폼 (`ProposalForm`)
  - 공감/추천/관심/댓글 UI (`ProposalDetail`)
  - 관리자 검토 (`ProposalAdminReviewPanel`)
  - 요구사항 대응 현황 (`ProposalRequirementCoveragePanel`)
- Portal Dashboard 확장
  - Quick Links에 Service Catalog/Proposal Board 추가
  - 요약 카드에 등록 도구/신규 제안/검토 대기 제안 추가
- Sidebar 메뉴에 Service Catalog/Proposal Board 추가
- `docs/SERVICE_CATALOG_PROPOSAL_BOARD_DESIGN.md` 작성
- 요구사항 화면 대응 현황 갱신

## 18단계 완료 상태

- My Page 화면 추가
  - 프로필/이메일/비밀번호/세션/프로젝트/자원/크레딧/알림/API Key/활동 로그 패널
- Environment Settings 화면 추가
  - 시스템 파라미터/보안 정책/자원할당 기준/운영 설정/변경 이력/요구사항 대응 패널
- 공통 `RequirementCoveragePanel` 추가
- Sidebar 메뉴 및 라우팅에 My Page, Environment Settings 추가
- `docs/MY_PAGE_ENVIRONMENT_SETTINGS_DESIGN.md` 작성

## 19단계 완료 상태

- Tenant Management 화면 추가 (`/tenant-management`)
  - 군별 테넌트 개요
  - 위임관리 체계
  - 군별 리소스 풀
  - 군별 쿼터 관리
  - 사용량 대시보드
  - 군별 프로젝트 사용량
  - 테넌트 경계/분리 정책
  - 쿼터 변경 이력
  - 요구사항 대응 현황
- Portal Dashboard Quick Links 및 요약 카드에 Tenant Management 관련 지표 추가
- Sidebar 메뉴에 Tenant Management 추가
- `docs/TENANT_MANAGEMENT_DESIGN.md` 작성

## 최종 PoC 구성 요약

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
  ↓ Search API
[OpenSearch :9200 / portal-catalog]
  ↓ Catalog API
[OpenMetadata :8585]
```

### 사용자 접근 흐름

1. 사용자가 Backstage(`http://localhost:3000`) 접속
2. Keycloak OIDC로 인증 (`admin01` 등)
3. Portal Dashboard에서 전체 현황 요약 확인
4. 통합검색 또는 사이드바 메뉴로 각 기능 이동
5. OpenSearch/OpenMetadata/Keycloak Admin 등 외부 도구 링크 사용 가능

### 운영 전환 구조 후보

```text
[Internet]
  ↓ HTTPS/WAF
[Ingress Controller]
  ├─ / → Backstage Pod
  ├─ /api/proxy/search → OpenSearch
  └─ /auth → Keycloak
[Kubernetes Cluster]
  ├─ Backstage (frontend + backend)
  ├─ Keycloak
  ├─ OpenSearch Cluster
  ├─ OpenMetadata
  └─ PostgreSQL
```


## 20단계: 최종 요구사항 추적표 및 제안서용 화면 정리

### 추가 산출물

- `docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md` — 견적용 기능목록 1~155 전체 요구사항 대응표
- `docs/SCREEN_TO_RFP_MAPPING.md` — 화멸별 RFP 매핑표
- `docs/PROPOSAL_SCREENSHOT_CATALOG.md` — 제안서용 화면 캡처 목록
- `docs/INTERNAL_LOGIC_BACKLOG.md` — 내부 로직 후속 개발 목록
- `docs/PROPOSAL_SUMMARY_TEXT.md` — 제안서 작성용 요약 문구
- `docs/DOCUMENT_INDEX.md` — 문서 인덱스

### 갱신 문서

- `docs/REQUIREMENT_SCREEN_COVERAGE.md` — 화면 기준 충족도 90% 이상으로 최종 평가
- `docs/DEMO_SCRIPT.md` — 15단계 데모 시나리오 최종 정리
- `docs/FINAL_DELIVERABLES.md` — 최종 산출물 목록 갱신
- `docs/TECH_DEBT.md` — GitHub push 인증 이슈 및 보안/운영 전 검토 필요사항 추가
- `README.md` / `backstage-portal/README.md` — 구현 화면/산출물/캡처 목록 최종 갱신
- `docs/CHANGE_SUMMARY.md` — 20단계 변경 이력 추가
- `docs/TODO.md` — 20단계 완료 및 21단계 추가
- `notes/DECISIONS.md` — 20단계 문서화 우선 전략 결정 추가

### 화면 캡처 자산

- `docs/assets/final/`에 18개 제안서용 캡처 파일 정리
- 누락되었던 Admin Console(사용자 관리, 권한/RBAC, 정책/감사), Service Catalog, Proposal Board, My Page, Environment Settings, Tenant Management 캡처 보강

### 아키텍처적 고려사항

- 20단계는 기능 구조 변경 없이 문서/캡처/추적표 정리에 집중
- 향후 운영 전환 시 `FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`와 `INTERNAL_LOGIC_BACKLOG.md`를 기반으로 실제 연동 우선순위 수립
- 제안서용 화면은 mock 데이터 기반 UI이므로 실제 인프라 연동 전까지 시연 범위로 활용


## 20.5단계: 포털 명칭, 메뉴 한글화, UI 색상 안정화

### 변경 사항

- 한글 공식 사이트명: `국방지능형플랫폼포털`
- 영문 보조명: `K-Defense Intelligence Platform` (유지)
- `app-config.yaml`: `app.title`, `organization.name`, `mcpActions.name` 변경
- `App.tsx` Sidebar 메뉴 한글화 (라우트 path는 그대로 유지)
  - Home → 통합 대시보드
  - Integrated Search → 통합검색
  - Project Workspace → 프로젝트/워크스페이스
  - Export Approval → 반입·반출 승인
  - Credit Manager → 크레딧 관리
  - K-RMF Evidence → K-RMF 증빙관리
  - Admin Console → 관리자 콘솔
  - Service Catalog → 서비스/도구 카탈로그
  - Proposal Board → 제안 게시판
  - My Page → 마이페이지
  - Environment Settings → 환경설정
  - Tenant Management → 육해공군 관리
- Portal Dashboard Quick Links 표시명/설명 한글화
- 주요 화면 제목 한글화
- Admin Console 탭 라벨 정리: `권한 / 역할` → `권한/역할`
- 색상 보완
  - Dashboard Hero: `linear-gradient(135deg, #0F2A44 0%, #1F4E79 100%)`
  - Summary Metric Card: 상단 accent border `#0F2A44`
  - Quick Link Card: 기본 border `#e0e6ed`, transition 적용

### 문서 반영

- `README.md`, `backstage-portal/README.md`, `docs/FINAL_DELIVERABLES.md`, `docs/DEMO_SCRIPT.md`, `docs/PROPOSAL_SUMMARY_TEXT.md`, `docs/SCREEN_TO_RFP_MAPPING.md`, `docs/DOCUMENT_INDEX.md`, `docs/ARCHITECTURE.md` 등 사이트명/메뉴 반영
- `docs/PORTAL_DASHBOARD.md`, 플러그인 문서 일부 사이트명 반영
- `docs/WBS.md`, `docs/TODO.md`, `docs/CHANGE_SUMMARY.md`, `notes/DECISIONS.md`에 20.5단계 기록
