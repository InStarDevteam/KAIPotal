# 권한/RBAC 및 메뉴/프로그램 관리 설계

## 1. 요구사항 대응 범위

- 역할 관리 (견적용 기능목록 36)
- 그룹 관리 (37)
- 서비스별 권한 (38)
- 메뉴 접근 권한 (39)
- 데이터 접근 권한 (40)
- 프로젝트별 권한 (41)
- 승인 권한 관리 (42)
- 조직상태 변경에 따른 권한 회수/인계 (43)
- 권한 변경 감사이력 (44)
- 메뉴 트리 관리 (56)
- 메뉴 생성/이동/기능 연결 (57~59)
- 프로그램 등록 (61~62)
- 메뉴 별 권한 연결 (60)

## 2. 현재 구현 범위

- mock data 기반 화면
- mock 권한 매트릭스 (역할 × 자원)
- mock 메뉴 트리 및 프로그램 목록
- 실제 Keycloak role/group write 연동 없음
- 실제 DB 저장 없음
- 모든 저장/변경 버튼은 비활성화 또는 mock 상태 전환만 수행

## 3. 화면 구성

| 화면 | 컴포넌트 | 위치 |
|------|----------|------|
| 역할 목록/상세 | `RolePermissionPanel`, `RoleDetailPanel` | Admin Console > 권한 / 역할 |
| 역할별 권한 매트릭스 | `RolePermissionMatrix` | Admin Console > 권한 / 역할 > 권한 매트릭스 |
| 그룹 관리 | `GroupManagementPanel` | Admin Console > 권한 / 역할 > 그룹 관리 |
| 사용자/그룹 권한 매핑 | `UserGroupMappingPanel` | Admin Console > 권한 / 역할 > 사용자/그룹 매핑 |
| 프로젝트별 역할 매핑 | `ProjectRoleMappingPanel` | Admin Console > 권한 / 역할 > 프로젝트별 역할 |
| 서비스별 권한 | `ServicePermissionPanel` | Admin Console > 권한 / 역할 > 서비스별 권한 |
| 데이터 접근 등급 | `DataAccessLevelPanel` | Admin Console > 권한 / 역할 > 데이터 등급 |
| 승인 권한 | `ApprovalPermissionPanel` | Admin Console > 권한 / 역할 > 승인 권한 |
| 조직 변경 권한 인계 | `OrganizationTransferPanel` | Admin Console > 권한 / 역할 > 조직 변경 인계 |
| 권한 변경 감사이력 | `PermissionChangeHistoryPanel` | Admin Console > 권한 / 역할 > 권한 변경 이력 |
| 메뉴 트리 | `MenuTreePanel` | Admin Console > 메뉴 관리 > 메뉴 트리 |
| 메뉴 상세 | `MenuDetailPanel` | Admin Console > 메뉴 관리 > 메뉴 상세 |
| 메뉴 권한 연결 | `MenuPermissionPanel` | Admin Console > 메뉴 관리 > 메뉴 권한 연결 |
| 프로그램 등록 | `ProgramRegistryPanel` | Admin Console > 메뉴 관리 > 프로그램 관리 |

## 4. 핵심 데이터 모델

### 4.1 역할 (`AdminRole`)

- `id`, `name`, `description`, `target`
- `accessibleMenus`, `accessibleServices`
- `dataAccessLevel`, `projectPermission`, `approvalAuthority`
- `userCount`, `groupCount`, `enabled`, `createdAt`, `updatedAt`

### 4.2 그룹 (`AdminGroup`)

- `id`, `name`, `description`, `organization`
- `appliedRoles`, `userCount`
- `accessibleServices`, `dataAccessLevel`, `enabled`

### 4.3 서비스 권한 (`ServicePermission`)

- `service`
- `allowedRoles`, `allowedGroups`
- `authRequired`, `mfaRequired`, `externalAllowed`, `auditLogged`

### 4.4 데이터 접근 권한 (`DataAccessPermission`)

- `level`: `공개`, `내부`, `비밀`
- `allowedRoles`, `allowedGroups`
- `exportAllowed`, `additionalAuthRequired`, `auditRequired`, `retentionPolicy`

### 4.5 승인 권한 (`ApprovalPermission`)

- `type`
- `primaryApproverRoles`, `secondaryApproverRoles`, `finalApproverRoles`
- `delegationAllowed`, `externalApproverAllowed`, `auditLogged`

### 4.6 프로젝트 역할 매핑 (`ProjectRoleMapping`)

- `projectName`, `userName`, `accountId`, `projectRole`
- `workspaceAccess`, `dataAccessLevel`
- `canApprove`, `canManageResources`, `validFrom`, `validUntil`

### 4.7 조직 변경 권한 인계 (`OrganizationTransfer`)

- `changeType`: `인사이동`, `퇴직`, `파견종료`, `수행사 계약종료`
- `prevOrganization`, `newOrganization`, `prevRoles`
- `revokedPermissions`, `transferTargetUser`, `status`, `scheduledAt`

### 4.8 권한 변경 이력 (`PermissionChangeHistory`)

- `timestamp`, `actor`, `targetType`, `targetName`, `changeType`
- `previousPermission`, `newPermission`, `reason`, `approver`, `result`, `ip`

### 4.9 메뉴 (`MenuItem`)

- `id`, `name`, `parent`, `path`, `connectedFeature`, `displayOrder`
- `enabled`, `accessRoles`, `menuType`, `icon`, `description`
- `hidden`, `readWrite`, `external`

### 4.10 프로그램 (`Program`)

- `id`, `name`, `description`, `type`, `path`, `owner`
- `enabled`, `accessRoles`, `createdAt`, `updatedAt`

## 5. 후속 Keycloak 연동 방향

- Role 조회/생성/수정 (Keycloak Admin API `/roles`)
- Group 조회/생성/수정 (`/groups`)
- User Role Mapping (`/users/{id}/role-mappings`)
- Group Role Mapping (`/groups/{id}/role-mappings`)
- Token claim 반영 (client scope `groups`, `roles` mapper)
- Backstage permission policy 연동 (`PermissionPolicy`)

## 6. 후속 DB 설계 방향

- `menus` 메뉴 테이블
- `programs` 프로그램 테이블
- `role_menu_mappings` 역할-메뉴 매핑
- `role_service_mappings` 역할-서비스 매핑
- `user_project_permissions` 사용자-프로젝트 권한
- `permission_change_logs` 권한 변경 이력
- `organization_transfers` 조직 변경 권한 인계
- `approval_policies` 승인 정책
- `data_access_policies` 데이터 접근 정책
