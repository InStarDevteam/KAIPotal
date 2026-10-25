# 국방지능형플랫폼포털 개발 현황 총괄 (Handover Spec)

> 목적: 현재까지 개발된 포털의 전체 내용을 정리하여, 실제 동작하는 SW로 기능 개선하기 위한 인수인계 문서.
> 작성일: 2026-07-30 / 기준 커밋: `16feb14` (33.2단계 완료 시점)
> 이 문서만 읽어도 현재 구현의 구조·데이터·화면·권한·연계 설계를 전부 파악할 수 있도록 작성했다.

---

## 1. 프로젝트 개요

- **사업**: 국방 지능형 플랫폼 구축 사업 중 **포털(메인 포털, SFR-001~SFR-021)** 영역
- **전체 체계**: 포털 / 데이터 플랫폼 / AI 플랫폼 / 클라우드 플랫폼(CMP). 포털은 통합 진입점, 신청·승인, 조회, 권한통제, 연계 오케스트레이션만 담당. 플랫폼 본체 기능(AI 학습, 데이터 가공, 자원 생성)은 수행하지 않고 각 플랫폼의 데이터를 수신받아 전시·연계한다.
- **기준 문서**: 최종공고문 `260723_제안요청서(안)_최종_v1.pdf` (전체 요구사항 166개, SFR 67개 중 포털 직접 대응 21개)
- **저장소**: `kt-ai-portal` (GitHub: KBitone-Company/kt-ai-portal), 프론트엔드/백엔드는 `backstage-portal/` Backstage 모노레포

## 2. 현재 운영(데모) 상태

| 항목 | 값 |
|---|---|
| 데모 URL | https://kai-platform-d0ae0.web.app |
| 접근 코드 | `ictway` (env `PREVIEW_ACCESS_CODE`) |
| 프론트엔드 | Firebase Hosting (`kai-platform-d0ae0`) |
| 백엔드 | Cloud Run `kt-ai-portal-demo` (asia-northeast3, revision 00017), `/api/**`는 Firebase Hosting rewrite로 전달 |
| 인증 | 접근 코드 게이트(sessionStorage) → Backstage Guest 로그인 자동 진입. Google(Firebase Auth) 로그인도 구현됨 |
| DB | 현재 `better-sqlite3` in-memory (데모 전용, 재기동 시 초기화) |
| 역할 전환 | 캡처 모드(`app.proposalCapture.enabled=true` in demo config)에서 사이드바 하단 역할 전환 UI로 6개 역할 미리보기 가능 |

## 3. 기술 스택

| 계층 | 스택 |
|---|---|
| 프론트엔드 | Backstage 1.x (React 18), **Material-UI v4** (`@material-ui/core`, v5 아님), TypeScript |
| 백엔드 | Backstage backend (Node.js 20/24, Express), better-sqlite3(데모) → PostgreSQL(운영 설계) |
| 빌드 | yarn workspaces (Backstage CLI), Docker 멀티스테이지 (`Dockerfile.demo`), Cloud Build (`cloudbuild.yaml`) |
| 배포 | Firebase Hosting(정적) + Cloud Run(백엔드 API), `firebase.json` rewrite: `/api/**`→Cloud Run, SPA fallback |
| 검증 | Jest 27건, Playwright (캡처/전수검증/스모크) |
| 문서 | `docs/` 70+ md (목차: `docs/DOCUMENT_INDEX.md`) |

## 4. 디렉터리 구조 (핵심)

```text
kt-ai-portal/
├── backstage-portal/
│   ├── packages/app/src/
│   │   ├── App.tsx                      # 라우트/사이드바/SignInPage/레이아웃
│   │   └── components/
│   │       ├── authz/                   # ★ 권한 모듈 (역할→권한 단일 정책)
│   │       ├── navigation/              # 메뉴 정의, PortalJourneyBar
│   │       ├── common/                  # ★ 디자인 토큰 + 공통 컴포넌트 7종
│   │       ├── portal-dashboard/        # 통합 대시보드
│   │       ├── integrated-search/       # 통합검색
│   │       ├── service-catalog/         # 서비스/도구 카탈로그
│   │       ├── project-workspace/       # 프로젝트/워크스페이스 + 작업환경 Wizard + 실증
│   │       ├── credit-manager/          # 크레딧 관리
│   │       ├── export-approval/         # 반입·반출 승인
│   │       ├── my-page/                 # 마이페이지
│   │       ├── admin-console/           # 관리자 콘솔
│   │       ├── environment-settings/    # 환경설정
│   │       ├── tenant-management/       # 육해공군 관리
│   │       ├── krmf-evidence/           # ★ K-RMF 이행·증적관리
│   │       ├── role-menu-preview/       # 권한별 메뉴 미리보기
│   │       ├── requirement-coverage/    # 요구사항 대응현황 (메뉴 비노출, URL 직접 접근)
│   │       ├── requirement-progress/    # 요구사항 진도표 (메뉴 비노출)
│   │       ├── platform-api-integration/# 플랫폼 API 연계현황 (메뉴 비노출)
│   │       ├── workflow-scenarios/      # 업무흐름/연계 시나리오 (메뉴 비노출)
│   │       ├── proposal-board/          # 제안 게시판
│   │       └── preview-auth/            # 접근코드 게이트, Firebase Auth, DemoAdminContext
│   ├── packages/backend/                # Backstage backend (guest auth 등)
│   ├── app-config.yaml                  # 로컬 개발 설정
│   └── app-config.demo.yaml             # 데모 설정 (proposalCapture 활성)
├── scripts/                             # 캡처/스모크/PPT 생성/검증 스크립트
├── docs/                                # 전체 문서
├── notes/DECISIONS.md                   # 단계별 결정 기록
├── Dockerfile.demo, cloudbuild.yaml, firebase.json
└── .firebase/ (.firebaserc는 example만 커밋)
```

## 5. 화면·메뉴·라우트 전체 목록

사이드바 노출 13개(그룹 순서: 포털 공통 → 플랫폼 연계 → 프로젝트 운영 → 사용자/조직 → 사용자 지원 → 관리/보안). 비노출 3개+진도표는 URL 직접 접근 시 권한자만 사용 가능.

| 메뉴 | 라우트 | 그룹 | 여정 단계 | 필요 권한(anyOf) |
|---|---|---|---|---|
| 통합 대시보드 | `/` | 포털 공통 | 1 | portal.view |
| 통합검색 | `/integrated-search` | 플랫폼 연계 | 3 | catalog.view |
| 서비스/도구 카탈로그 | `/service-catalog` | 플랫폼 연계 | 3 | catalog.view |
| 프로젝트/워크스페이스 | `/project-workspace` | 프로젝트 운영 | 4 | project.request 또는 project.approve |
| 크레딧 관리 | `/credit-manager` | 프로젝트 운영 | 6 | credit.view 또는 credit.approve |
| 반입·반출 승인 | `/export-approval` | 프로젝트 운영 | 7 | export.request 또는 export.review |
| 마이페이지 | `/my-page` | 사용자/조직 | 8 | 로그인 사용자 |
| 환경설정 | `/environment-settings` | 사용자/조직 | 8 | settings.manage |
| 육해공군 관리 | `/tenant-management` | 사용자/조직 | 2 | tenant.manage |
| 제안 게시판 | `/proposal-board` | 사용자 지원 | 8 | portal.view |
| 관리자 콘솔 | `/admin-console` | 관리/보안 | 2 | user.manage 또는 rbac.manage 또는 menu.manage |
| 권한별 메뉴 미리보기 | `/role-menu-preview` | 관리/보안 | 2 | menu.manage 또는 rbac.manage |
| K-RMF 이행·증적관리 | `/krmf-evidence` | 관리/보안 | 8 | krmf.view |
| (비노출) 요구사항 대응현황 | `/requirement-coverage` | - | - | requirement.view |
| (비노출) 요구사항 진도표 | `/requirement-progress` | - | - | requirement.view |
| (비노출) 플랫폼 API 연계현황 | `/platform-api-integration` | - | - | integration.view |
| (비노출) 업무흐름/연계 시나리오 | `/workflow-scenarios` | - | - | integration.view 또는 requirement.view |

모든 라우트는 `PermissionGuard`로 직접 URL 접근도 차단. 차단 시 현재 역할/필요 권한 안내 카드 표시.

## 6. 역할·권한 체계 (authz 모듈)

**파일**: `components/authz/` — types.ts(역할/권한/라벨), rolePolicies.ts(단일 매핑), AuthzContext.tsx(역할 결정), PermissionGuard.tsx(가드), RolePreviewSwitcher.tsx(캡처 모드 전환)

### 역할 6종

| 역할 | 한국어 | 핵심 권한 |
|---|---|---|
| general-user | 일반 사용자 | portal.view, catalog.view, project/workspace.request, credit.view, export.request |
| project-manager | 프로젝트 관리자 | 일반 전부 + project.approve, workspace.approve, krmf.evidence.submit |
| branch-admin | 군별 관리자 | 일반 전부 + user.manage, credit.approve, audit.view |
| portal-admin | 포털 관리자 | 전체에서 krmf.review/krmf.manage 제외 (krmf.view는 보유) |
| security-manager | 보안 관리자 | 일반 전부 + export.review, audit.view, krmf 전부, requirement/integration.view |
| security-auditor | 보안 감사관 | 조회 전용: portal/catalog/audit/krmf/requirement/integration.view |

### 권한 22종

portal.view, catalog.view, project.request, project.approve, workspace.request, workspace.approve, credit.view, credit.approve, export.request, export.review, user.manage, rbac.manage, menu.manage, tenant.manage, settings.manage, audit.view, krmf.view, krmf.evidence.submit, krmf.review, krmf.manage, requirement.view, integration.view

### 역할 결정 우선순위

1. 캡처 모드(`app.proposalCapture.enabled=true`일 때만): URL `?captureRole=` 또는 sessionStorage `__kt_ai_portal_role_override__`
2. Firebase 로그인 이메일이 `app.auth.adminEmails`에 포함 → portal-admin
3. sessionStorage `__kt_ai_portal_admin_preview__` (하위호환) → portal-admin
4. 기본: general-user

**실구현 전환 포인트**: AuthzContext의 역할 결정부를 Keycloak role/group claim 어댑터로 교체. 나머지(hasPermission, Guard, 메뉴 필터)는 그대로 사용.

## 7. 화멸별 기능 상세

### 7.1 통합 대시보드 (`portal-dashboard/`)

- 히어로(navy 단색, 제목/영문명/설명/사용자 정보/역할 RoleBadge), 결합형 검색창
- 지표 4개 섹션(MetricCard Primary/Secondary): [업무 현황] 데이터셋 128·AI 모델 24·진행 프로젝트 12·반출 대기 5·신규/검토 제안 / [자원 및 크레딧] 잔여 482,500·월 예상 135,000·부족/GPU 제한/경고 / [플랫폼 현황] OpenSearch 10·OpenMetadata 정상·도구 13·테넌트 4·군별 프로젝트 30·쿼터 대기 5 / [보안 및 거버넌스] K-RMF 진척률·미흡·고위험 (`krmf.view` 권한자만)
- 하단: 공지사항 5건, 최근 등록 자산 5건, 내 프로젝트 4건, 반출 대기 4건, 크레딧 요약, 시스템 상태 9개, 바로가기(관리자 전용 필터)
- 데이터: `mockDashboardData.ts`

### 7.2 통합검색 (`integrated-search/`)

- 자산유형 15종: dataset, model, docker_image, pypi_package, container_library, analysis_tool, visualization_tool, labeling_tool, service_catalog, document, project, export_request, credit_record, krmf_control, krmf_evidence
- 필터: 유형/보안등급(공개·남부·비밀)/군/프로젝트/소유자/원천(포털·데이터·AI·클로우드 플랫폼)/버전/라이선스/태그 + 유사 명칭 토글
- 자동완성(MUI Autocomplete), 색인 상태 바(색인 시각·원천 동기화 상태)
- **권한 선필터**: general-user(+!isAdminArea)는 비밀 자산 결과·개수 모두 미노출 (`searchFiltering.ts`, 테스트 6건)
- OpenSearch 실연동 코드 경로 존재(`SearchApiClient`), 미연결 시 mock fallback
- mock 11+5건 (`mockSearchResults.ts`)

### 7.3 서비스/도구 카탈로그 (`service-catalog/`)

- 도구 22건(분석 프레임워크/개발도구/데이터 도구/시각화/라벨링/학습데이터 구축/Docker 이미지/PyPI), 카테고리 탭, 도구 선택 패널(프로젝트·워크스페이스 지정 신청), 요약 카드
- 관리자 전용 항목은 isAdminArea 필터. mock `mockServiceCatalogData.ts`

### 7.4 프로젝트/워크스페이스 (`project-workspace/`)

탭 3개:
1. **프로젝트 목록**: P-2025-001~005, 상세(ProjectDetail: 멤버/리소스/데이터셋/모델/활동 로그/승인 이력), **WorkspaceLifecyclePanel**(생애주기: 신청→승인→생성중→사용중→만료예정→종료, 실패/원복 분기, 멤버·RBAC, 할당량 프로그레스바, 접속 링크, 추가 자원 요청, 만료 배지, 종료 신청, 원복 상태, 실시간 CPU/GPU 사용량)
2. **작업 환경 생성 요청** (`WorkEnvRequestWizard`): SFR-007/008 7단계 Wizard — 유형 선택(AI형/데이터형) → ①프로젝트/워크스페이스 ②데이터셋·모델(AI형)/데이터·데이터모델(데이터형) ③CPU/GPU/Memory/Storage ④프레임워크 ⑤라벨링·도구 ⑥보안등급·기간·크레딧(+데이터형: 비식별화/영속보관/연계) ⑦확인·제출. 제출 시 로컬 신청 내역 추가, 승인 버튼은 project/workspace.approve 게이트. "실제 생성은 플랫폼 책임" 도움말 상시
3. **실증·데이터 준비** (`PilotDataPreparationPanel`): TER-008 — 과제 4건(육군종합정비창 3개: K-9 완성차 최종검사 예측/변속기 초기패턴 예측/설비 이상징후 탐지 + 후보 1), 데이터 수요/보유 비교(부족량), 확볼 방식(타 체계 연동/파일 반입/합성데이터/시뮬레이터), 9단계 흐름 Stepper, 생성 요청 목록+요청 버튼, 데이터 계보, 품질검증, 학습/검증/시험 분할, KPI

모델: `types.ts` Project(+WorkspaceLifecycle), PilotProject, DataGenerationRequest / mock: `mockProjects.ts`, `mockPilotProjects.ts`

### 7.5 크레딧 관리 (`credit-manager/`)

- 총 부여/사용/잔여 요약, 프로젝트별 크레딧, 충전/사용 이력, 예상 사용 가능 기간, 자원별 단가, 부족 시 비활성 표시, 알림/경고
- mock `mockCredits.ts`

### 7.6 반입·반출 승인 (`export-approval/`)

- 신청 목록/상세/등록(ExportRequestForm), 대상 유형, 보안등급/공개여부/사용권한, 다운로드 가능 여부, 감사로그
- **승인/반려 버튼은 `export.review` 권한자만** (미권한자는 '승인 권한 필요' 비활성 칩)
- mock `mockExportRequests.ts`

### 7.7 마이페이지 (`my-page/`)

탭: 프로필/이메일 확인/비밀번호 변경/활성 세션(강제 종료)/내 프로젝트·워크스페이스(접속 상태·만료 배지)/자원 사용 이력/크레딧 사용 내역/알림 설정(승인대기·기한임박·반려 배너)/개인 API Key/내 활동 로그/**실증 프로젝트**(참여 과제 카드)/**보안 과제**(본인 배정 K-RMF 증적 과제, 제출 버튼은 krmf.evidence.submit 게이트)/요구사항 대응 현황(requirement.view 게이트)
- mock `mockMyPageData.ts`

### 7.8 관리자 콘솔 (`admin-console/`)

- 요약 카드(등록 신청 대기/승인 대기/외부 사용자/활성 사용자/잠금/권한 그룹/로그인 정책/보안 이벤트), 사용자 등록 신청(승인/반려/보완/재신청), 사용자 관리, 권한/역할 관리, 로그인 정책, 비밀번호 정책(복잡도/만료/잠금), 이력/감사 로그, 메뉴 관리, 플랫폼 운영도구(OpenMetadata/OpenSearch/Keycloak 관리자 전용 링크)

### 7.9 K-RMF 이행·증적관리 (`krmf-evidence/`) ★

- PageHeader + 소요기관 권한 안남문(통제 선정·제외·대체 승인과 평가·인가 최종 판단은 소요기관 권한) + 헤더 RoleBadge
- **이중 stepper**: 전역 여정바(subdued 보조) + 'K-RMF 이행 단계' 8단계 주 stepper(1 적용범위·통제기준 / 2 이행계획 / 3 통제 구현 / 4 증적 제출·검토 / 5 미흡사항 보완 / 6 평가·인가 지원 / 7 운영전환 / 8 지속모니터링·변경영향)
- **탭 8개**: 대시보드 / 통제항목 / 이행계획 / 증빙자료 / 미흡·보완조치 / 타 수행사 자료 / 평가·인가 지원 / 운영전환·변경관리
- 대시보드: 전체 진척률(navy 주요 카드), 통제항목 18/적용 17/증빙 제출 8/승인 3/미흡 6/보완 2/고위험 4, 영역별 진척률(17개 영역), 최근 미흡사항
- **버튼 게이트**: 증적 등록=krmf.evidence.submit, 검토/승인/반려=krmf.review, 통제·계획 편집=krmf.manage (security-auditor는 버튼 미노출)

데이터 모델(`types.ts`):
- ControlItem(id, area 17개, applied, owner, checkStatus, evidenceCount, issueCount, targetSystems, auditLog 등) 18건 (KRMF-AC/LM/EN/NS/VM/DP/BR/CM/SA + KRMF-SER-002~008)
- Evidence(id, controlItemId, type 8종, submitter, status 6종, version) 8건
- RiskIssue(severity 4종, status 6종, dueDate, residualRisk) 6건
- ExternalSubmission(vendorName, status, revisionRequested) 7건
- KrmfImplementationPlan(phase: development/test/assessment/operation, owner, 일정, verificationMethod, expectedEvidenceTypes, status) 10건
- KrmfAssessment(assessmentType, scheduledAt, result, authorizationStatus, **decisionAuthority**, opinionCount, unresolvedIssueCount, packageVersion) 4건
- KrmfOperationalTransition(handoverStatus, monitoringPlan/backupRecovery/contactTransfer 상태, periodicReviewDate) 3건
- KrmfChangeImpact(**changeType 11종**: external-interface/security-boundary/classification/identity-access/encryption-key/platform-version/architecture/new-data-source/export-path/vulnerability-incident/control-exception, affectedControlIds, riskLevel, reassessmentRequired → '검토 필요'/'소요기관 판단 필요', status) 10건
- 집계: `summarizeKrmfProgress()`

### 7.10 기타

- **환경설정** (`environment-settings/`): 시스템 파라미터, 보안 정책, 자원할당 기준, 운영 설정, 변경 이력
- **육해공군 관리** (`tenant-management/`): 군별 테넌트 개요, 위임관리, 리소스 풀, 쿼터 할당/변경/회수, 사용량 대시보드, 테넌트 경계 정책, 쿼터 변경 이력
- **제안 게시판** (`proposal-board/`): 제안 목록/등록/상세, 공감, 관리자 승인/공지. 카테고리 탭(AI 모델 개발/빅데이터 분석/데이터셋 구축 등)
- **권한별 메뉴 미리보기** (`role-menu-preview/`): 역할 선택, 메뉴 트리(메뉴/라우트/여정/SFR/요구 권한/접근 수준), 요약(선택 역할/전체 13개/관리자 전용 수), 일반 사용자 비교 모드

### 7.11 비노출 관리 화면 (URL 직접 접근)

- **요구사항 대응현황** (`requirement-coverage/`): 메뉴/SFR/기능 대응현황, 변경이력, 질의사항, 최종공고문 변경사항 탭, CSV 다운로드 2종
- **요구사항 진도표** (`requirement-progress/`): SFR별 진도표(21), 기능목록 상세(163), 변경이력(13+5), 질의사항(7)
- **플랫폼 API 연계현황** (`platform-api-integration/`): API 38건, 포털/플랫폼 역할, 요청/응답, 책임 경계, 후속 조건, 오류/재처리, 감사로그, 확정 필요사항, CSV
- **업무흐름/연계 시나리오** (`workflow-scenarios/`): SCN-001~012

## 8. 플랫폼 API 연계 후보 (38건)

체계: `PAI-001~020` (인증/권한, 작업환경, 프로젝트, 과금/자원, 카탈로그/검색, 보안/승인/감사) + `PORTAL-*` 18건:

| ID | 명칭 | 대상 | RFP |
|---|---|---|---|
| PORTAL-AI-ENV-001 | AI 작업 환경(컨테이너) 생성 요청 | AI 플랫폼 | SFR-007 |
| PORTAL-DATA-ENV-001 | 데이터 작업 환경(컨테이너) 생성 요청 | 데이터 플랫폼 | SFR-008 |
| PORTAL-CATALOG-001/002/003 | 통합 카탈로그 검색 / Docker·PyPI 검색 / 서비스 카탈로그 조회 | 데이터/클로우드/포털 | SFR-014/015 |
| PORTAL-WORKSPACE-001/002/003 | 워크스페이스 신청·승인 / 멤버·RBAC 동기화 / GPU·CPU 사용량 | CMP/인증 | SFR-017/018 |
| PORTAL-CREDIT-001 | 크레딧 사용량 조회 | CMP | SFR-017 |
| PORTAL-PILOT-001~006 | 실증 등록·상태 / KPI·결과 / 합성데이터 생성 / 시뮬레이터 / 타 체계 수집 / 품질·계보 | 데이터/AI 플랫폼, 군수체계 | TER-008 |
| PORTAL-KRMF-001~003 | 통제 이행현황 / 증적·후속조치 / 변경영향·재평가 | 보안/K-RMF | SER-004/006/007/008 |

상태값: 화면 구현 / 연계 설계 / 후속 API 연동 / 타 플랫폼 제공 전제 / 확인 필요

## 9. 업무흐름 시나리오 (SCN-001~012)

001 포털 접속·권한 기반 진입 / 002 데이터셋 탐색·활용 신청 / 003 AI 작업환경 생성·모델 개발 / 004 크레딧 기반 사용량 모니터링 / 005 성과물 반출 승인·감사 추적 / 006 군별 관리자·멀티테넌트 / 007 RFP 대응·API 연계 검토 / 008 AI 작업환경 생성 요청 / 009 데이터 작업환경 생성 요청 / 010 군수체계 연계 실증(데이터 부족 대응 포함) / 011 K-RMF 이행·평가대응(변경영향 포함) / 012 합성데이터·시뮬레이터 생성 요청

## 10. 포털 8단계 여정 (전역)

1 체계접속(SFR-001/002/006/012) → 2 인증·권한(SFR-003/004/005/021) → 3 자산탐색(SFR-014/015) → 4 프로젝트개설(SFR-016, TER-008) → 5 작업환경생성(SFR-007/008/018) → 6 자원사용관리(SFR-017) → 7 성과반출(SFR-009/010/011) → 8 운영·보안감사(SFR-004/013/019/020/021, SER-002~008). `PortalJourneyBar`로 주요 페이지 상단 표시(K-RMF는 subdued).

## 11. UI/UX 디자인 시스템 (33.2단계)

- 토큰(`common/designTokens.ts`): primaryNavy #173B5E, primaryBlue #245FA6, background #F4F6F8, border #D9E2EC, 상태색(success/warning/error/info/neutral, AA 대비), spacing 8/16/24, sidebar 248/72px, pageMaxWidth 1680, radius 8
- 공통 컴포넌트: PageHeader, SectionHeader, SectionCard, MetricCard, StatusChip, RoleBadge, EmptyState
- 사이드바: 248px, 메뉴 전체 텍스트(2줄 wrap), 현재 메뉴 indicator, 역할 영역 하단(역할 Chip + 캡처 모드 전환 UI)
- 상세: `docs/UI_UX_DESIGN_SYSTEM.md`, `docs/UI_UX_DESIGN_REVIEW.md`, `docs/UI_UX_BEFORE_AFTER.md`

## 12. 빌드/배포/환경변수

### 환경변수 (빌드 타임, app-config.demo.yaml 치환)

`APP_BASE_URL`, `BACKEND_BASE_URL`, `PREVIEW_ACCESS_CODE`, `AUTH_SESSION_SECRET`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `DEMO_ALLOWED_EMAILS`, `DEMO_ALLOWED_DOMAINS`, `DEMO_ADMIN_EMAILS`

### 명령

```bash
cd backstage-portal
yarn tsc --noEmit                      # 타입 검증
yarn workspace app test --watchAll=false  # 테스트 27건
yarn workspace app build --config ../../app-config.demo.yaml  # 프론트엔드 빌드
firebase deploy --only hosting --project kai-platform-d0ae0   # 프론트엔드 배포
gcloud builds submit --config=cloudbuild.yaml ...              # 백엔드 이미지
gcloud run deploy kt-ai-portal-demo ...                        # 백엔드 배포
node scripts/smoke-check-demo-routes.mjs                       # 스모크 17개
AUDIT_ACCESS_CODE=<접근코드> node backstage-portal/scripts/full-audit-playwright.mjs  # 전수검증
ACCESS_CODE=ictway node scripts/capture-proposal-screenshots-prod.js  # 캡처 28종
```

## 13. 테스트/검증 인프라

- 단위 테스트 27건: authz(rolePolicies 8건 + 메뉴 정의 6건), searchFiltering 6건, krmfData 6건, 기존 App 1건
- 캡처 스크립트: DOM 검증 4종 게이트(portal-shell, data-capture-id, 금지 텍스트 부재, 해시 중복), 역할 전환 캡처 10종 + 레거시 18종, `docs/assets/final/`
- 디자인 전후 캡처: `docs/assets/design-stage33-2/{before,after}/` 18종씩

## 14. Mock → 실구현 전환 지점 (기능개선 우선순위 참고)

| 영역 | 현재(Mock) | 실구현 시 교체 대상 |
|---|---|---|
| 역할 결정 | sessionStorage/이메일 목록 | Keycloak role/group claim → AuthzContext 어댑터만 교체 |
| 인증 | 접근코드+Guest | Keycloak OIDC (코드상 프로바이더 존재, `previewAuthEnabled=false`로 전환) |
| DB | better-sqlite3 in-memory | PostgreSQL 16 (스키마: 사용자/프로젝트/승인/크레딧/감사/메뉴/RBAC) |
| 프로젝트/워크스페이스 | mockProjects + 로컬 state 신청 | PORTAL-WORKSPACE-001~003, PORTAL-AI/DATA-ENV-001 API |
| 검색 | mock + OpenSearch 클라이언트 뼈대 | 운영 OpenSearch 인덱스(군/프로젝트/버전 필드 추가), 서버 측 권한 필터 |
| 크레딧/자원 사용량 | mockCredits | PORTAL-CREDIT-001, PORTAL-WORKSPACE-003 |
| 반입·반출 | mock + 로컬 승인 | 승인 워크플로우 백엔드 + 파일 스토리지(MinIO) + 감사로그 DB |
| K-RMF | mock 59건 | K-RMF DB + 증빙 파일 스토리지 + 소요기관 평가 시스템 연계(PORTAL-KRMF-001~003) |
| 실증 | mockPilotProjects | PORTAL-PILOT-001~006 (합성데이터/시뮬레이터/수집/품질·계보) |
| 관리자 콘솔 | mock 사용자/정책 | Keycloak Admin API + DB |
| 감사로그 | 화면 mock | 중앙 로그 수집(로그 서버) + 감사 테이블 |
| 알림 | mock | 알림 서비스(알림 대기/기한/반려 이벤트) |

## 15. 인프라 설계 (운영 전환)

- VM 구성안: `docs/VM_INFRASTRUCTURE_DESIGN.md` (권장 15~16대: WEB 2 / WAS 2 / DB 2(PostgreSQL 주·대기, Keycloak 스키마 수용) / OpenSearch 3 / Keycloak 2 / 파일서버(MinIO) 2 / 로그 1 / 백업 1, L4 기반 A-A/A-S, Rocky Linux 9)
- 폐쇄망 전제: 사내 로컬 저장소(yum/npm 미러), 낶부 CA, 망분리(DMZ/업묵망/관리망)

## 16. 알려진 제약/기술부채

- 기존 lint 오류 19건(신규 파일은 0건) — `docs/TECH_DEBT.md` 참조
- 신청/승인/제출 액션은 로컬 state 기반(새로고침 시 초기화)
- 검색 권한 선필터는 클라이언트 측 — 운영 시 서버 측 필수
- Playwright E2E 스펙 미작성 (`yarn test:e2e` 설정만 존재)
- GitHub push: 토큰 인증 필요 시 `gh auth login`
- MUI v4 (v5 마이그레이션 계획 없음), findDOMNode 경고 존재

## 17. 문서 자산 (docs/ 주요)

- 요구사항: FINAL_RFP_*.md 6종, FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md, SCREEN_TO_RFP_MAPPING.md
- 권한: ROLE_PERMISSION_MATRIX.md, ROLE_MENU_CAPTURE_GUIDE.md
- K-RMF: KRMF_LIFECYCLE_AND_ROLE_DESIGN.md, FINAL_RFP_KRMF_MAPPING.md
- 실증: FINAL_RFP_PILOT_PROJECT_MAPPING.md
- 설계: UI_UX_DESIGN_SYSTEM.md, VM_INFRASTRUCTURE_DESIGN.md, PLUGIN_*.md (각 메뉴 설계)
- 연계: PLATFORM_API_INTEGRATION_PLAN.md, WORKFLOW_SCENARIO_GUIDE.md, USER_JOURNEY_AND_PLATFORM_FLOW.md
- 캡처: PROPOSAL_SCREENSHOT_CATALOG.md, SCREENSHOT_CAPTIONS.md (28종)
- 이력: CHANGE_SUMMARY.md, TODO.md, TECH_DEBT.md, notes/DECISIONS.md (1~35.2단계 전체 결정 기록)

## 18. 현재 상태 요약 (한눈에)

- **완성도**: 포털 21개 SFR 전체 화면 구현 완료(화면 구현 수준). 역할 기반 접근 제어, K-RMF 생애주기 관리, 실증 데이터 준비 흐름까지 UI 완성
- **실동작 수준**: 인증 게이트/역할/메뉴/가드/검색 필터/CSV 다운로드/캡처 자동화는 실제 동작. 업무 데이터는 mock(기준 데이터)
- **다음 목표**: 위 §14 전환 지점에 따라 백엔드(PostgreSQL/Keycloak/파일스토리지/플랫폼 API)를 연결해 실제 동작하는 SW로 만드는 것
