# 육해공군 관리자 권한 및 멀티테넌트 관리 설계

## 1. 요구사항 대응 범위

- 육군/해군/공군별 독립 자원 관리 영역
- 국방부 최상위 관리자와 각 군 위임관리 구조
- 군별 리소스 풀 관리
- 군별 자원 쿼터 할당/변경/회수
- 전체 및 군별 사용량 통합조회
- 군별 프로젝트 사용량 조회
- 테넌트 경계/분리 정책
- 쿼터 변경 이력

## 2. 현재 구현 범위

- mock data 기반 화면
- mock 테넌트 목록(국방부 공통/육군/해군/공군)
- mock 리소스 풀(GPU/CPU/Storage/Training Job 등)
- mock 쿼터 관리(신규/증설/축소/회수/임시증설/기간연장)
- mock 사용량 대시보드(progress bar/table/7일 추이)
- mock 프로젝트 사용량
- mock 테넌트 경계/분리 정책
- mock 쿼터 변경 이력
- 실제 Kubernetes/OpenStack/CMP/Keycloak/DB 연동 없음
- 실제 자원 할당/변경/회수 없음

## 3. 화면 구성

- Tenant Management 메인(`/tenant-management`)
- 군별 테넌트 개요
- 위임관리 체계
- 군별 리소스 풀
- 군별 쿼터 관리
- 사용량 대시보드
- 군별 프로젝트 사용량
- 테넌트 경계/분리 정책
- 쿼터 변경 이력
- 요구사항 대응 현황

## 4. 파일 구조

```text
packages/app/src/components/tenant-management/
├─ index.ts
├─ types.ts
├─ mockTenantManagementData.ts
├─ TenantManagementPage.tsx
├─ TenantSummaryCards.tsx
├─ TenantManagementTabs.tsx
├─ BranchTenantOverviewPanel.tsx
├─ BranchAdminDelegationPanel.tsx
├─ BranchResourcePoolPanel.tsx
├─ BranchQuotaManagementPanel.tsx
├─ BranchUsageDashboardPanel.tsx
├─ BranchProjectUsagePanel.tsx
├─ TenantBoundaryPanel.tsx
├─ QuotaChangeHistoryPanel.tsx
├─ TenantRequirementCoveragePanel.tsx
├─ BranchChip.tsx
├─ ResourceStatusChip.tsx
└─ QuotaStatusChip.tsx
```

## 5. 메뉴 및 라우팅

- Sidebar: `Tenant Management`
- Route: `/tenant-management`
- Portal Dashboard Quick Links에 `Tenant Management` 추가
- Portal Dashboard 요약 카드에 테넌트/군별 프로젝트/쿼터 변경 대기/과다 사용 경고 추가

## 6. 후속 연동 방향

- Keycloak group/role 기반 군별 관리자 권한 연동
- Kubernetes namespace/resource quota 연동
- OpenStack project/quota 연동
- CMP 자원 할당 API 연동
- 프로젝트/워크스페이스 DB 연동
- 자원 사용량 수집 API 연동
- 크레딧 관리 연동
- 감사로그 연동
