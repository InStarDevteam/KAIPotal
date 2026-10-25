# 역할·권한 매트릭스 (ROLE_PERMISSION_MATRIX)

최종공고문 260723_v1 기준 포털 권한체계 정의 문서다.
구현 소스: `backstage-portal/packages/app/src/components/authz/rolePolicies.ts` (단일 정책 소스).
본 문서는 구현과 동일한 데이터를 설명하며, 정책 변경 시 코드와 함께 갱신한다.

## 1. 역할 정의

| 역할 코드 | 한국어 명칭 | 설명 |
|---|---|---|
| general-user | 일반 사용자 | 접근코드/Guest 로그인 기본 역할. 조회·신청 중심 |
| project-manager | 프로젝트 관리자 | 프로젝트/워크스페이스 승인, 본인 프로젝트 K-RMF 증적 제출 |
| branch-admin | 군별 관리자 | 소속 군(테넌트) 사용자 관리, 크레딧 승인, 감사 조회 |
| portal-admin | 포털 관리자 | 사용자/RBAC/메뉴/테넌트/환경설정/연계/요구사항 관리. K-RMF는 조회만(평가·인가 판단 없음) |
| security-manager | 보안 관리자 | K-RMF 이행·증적·평가지원·운영전환 전체 관리, 반출 검토, 요구사항/연계 조회 (35.1단계에서 krmf-manager 통합) |
| security-auditor | 보안 감사자 | K-RMF/감사/요구사항 조회 전용, 데이터 수정 불가 |

## 2. 역할별 권한 매트릭스

● = 보유, ○ = 읽기 전용 성격

| 권한 | general-user | project-manager | branch-admin | portal-admin | security-manager | security-auditor |
|---|---|---|---|---|---|---|
| portal.view | ● | ● | ● | ● | ● | ● |
| catalog.view | ● | ● | ● | ● | ● | ● |
| project.request | ● | ● | ● | ● | ● | |
| project.approve | | ● | | ● | | |
| workspace.request | ● | ● | ● | ● | ● | |
| workspace.approve | | ● | | ● | | |
| credit.view | ● | ● | ● | ● | ● | |
| credit.approve | | | ● | ● | | |
| export.request | ● | ● | ● | ● | ● | |
| export.review | | | | ● | ● | |
| user.manage | | | ● | ● | | |
| rbac.manage | | | | ● | | |
| menu.manage | | | | ● | | |
| tenant.manage | | | | ● | | |
| settings.manage | | | | ● | | |
| audit.view | | | ● | ● | ● | ● |
| krmf.view | | | | ● | ● | ● |
| krmf.evidence.submit | | ● | | ● | ● | |
| krmf.review | | | | | ● | |
| krmf.manage | | | | | ● | |
| requirement.view | | | | ● | ● | ● |
| integration.view | | | | ● | ● | ● |

## 3. 라우트별 필요 권한

| 라우트 | 필요 권한(anyOf) | 비고 |
|---|---|---|
| `/` | portal.view | 대시보드 |
| `/proposal-board` | portal.view | |
| `/integrated-search` | catalog.view | 비밀 자산 권한 선필터 적용 |
| `/service-catalog` | catalog.view | |
| `/project-workspace` | project.request 또는 project.approve | 실증·데이터 준비 탭 포함 |
| `/credit-manager` | credit.view 또는 credit.approve | |
| `/export-approval` | export.request 또는 export.review | 승인 버튼은 export.review |
| `/my-page` | 로그인 사용자 | 본인 데이터만 |
| `/admin-console` | user.manage 또는 rbac.manage 또는 menu.manage | |
| `/environment-settings` | settings.manage | |
| `/tenant-management` | tenant.manage | |
| `/krmf-evidence` | krmf.view | 메뉴 노출도 동일 정책 |
| `/requirement-coverage` | requirement.view | |
| `/requirement-progress` | requirement.view | |
| `/platform-api-integration` | integration.view | |
| `/workflow-scenarios` | integration.view 또는 requirement.view | |
| `/role-menu-preview` | menu.manage 또는 rbac.manage | 권한별 메뉴 비교 |

## 4. K-RMF 역할별 기능 범위

| 기능 | security-manager | security-auditor | portal-admin | project-manager | general-user |
|---|---|---|---|---|---|---|
| K-RMF 대시보드/통제 조회 | ● | ● | ● | | |
| 증빙 등록 | ● | | ●(권한 보유 시) | ●(본인 과제) | |
| 증빙 검토/반려 | ● | | | | |
| 통제항목/이행계획 관리 | ● | | | | |
| 평가·인가 지원 조회 | ● | ● | ● | | |
| 평가·인가 최종 판단 | 소요기관 권한 — 포털 역할 누구도 불가 | | | | |
| 운영전환·변경영향 등록/검토 | ● | ○(조회) | | | |
| 대시보드 K-RMF 카드 | ● | ● | ● | | 숨김 |
| 마이페이지 본인 증적 과제 | ● | | | ● | ●(배정 시) |

## 5. 역할 결정 규칙 (데모/제안 환경)

1. 캡처 모드(`app.proposalCapture.enabled=true`)일 때 URL `?captureRole=` 또는 sessionStorage `__kt_ai_portal_role_override__`가 유효한 역할이면 그 역할.
2. Firebase 로그인 이메일이 `app.auth.adminEmails`에 포함되면 portal-admin.
3. sessionStorage `__kt_ai_portal_admin_preview__` (하위호환) → portal-admin.
4. 그 외 → general-user.

운영 환경에서는 캡처 모드가 비활성(false)이며, Keycloak/Firebase 역할 claim 어댑터로 대체한다(후속 연계).
