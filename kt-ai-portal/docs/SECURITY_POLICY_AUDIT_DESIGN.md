# 로그인/비밀번호 정책 및 이력/감사로그 설계

## 1. 요구사항 대응 범위

- 로그인 정책 조회/등록/수정/삭제
- 사용자 로그인 가능 기간 설정
- 로그인 실패 관리
- 중복 로그인 정책
- 자동 로그아웃 정책
- 비밀번호 정책 관리
- 비밀번호 복잡도
- 비밀번호 만료
- 만료 시 계정 잠금
- 로그인 이력
- 로그아웃 이력
- 비밀번호 변경 이력
- 개인 상태 이력
- 사용자 접근 로그
- 사용자 정보수정 로그
- 보안 감사 조회
- 관리자 조치 이력

## 2. 현재 구현 범위

- mock data 기반 화면
- mock 정책 목록
- mock 감사로그
- 실제 Keycloak event log 연동 없음
- 실제 DB 저장 없음
- 실제 정책 enforcement 없음

## 3. 화면 구성

| 화면 | 컴포넌트 | 위치 |
|------|----------|------|
| 로그인 정책 목록/상세 | `LoginPolicyPanel`, `LoginPolicyDetailPanel` | Admin Console > 로그인 정책 |
| 로그인 실패 차단 정책 | `LoginFailurePolicyPanel` | Admin Console > 로그인 정책 > 로그인 실패 차단 |
| 중복 로그인 정책 | `ConcurrentLoginPolicyPanel` | Admin Console > 로그인 정책 > 중복 로그인 |
| 자동 로그아웃/세션 정책 | `SessionTimeoutPolicyPanel` | Admin Console > 로그인 정책 > 자동 로그아웃 |
| 비밀번호 정책 목록/상세 | `PasswordPolicyPanel`, `PasswordPolicyDetailPanel` | Admin Console > 비밀번호 정책 |
| 비밀번호 복잡도 | `PasswordComplexityPanel` | Admin Console > 비밀번호 정책 > 복잡도 |
| 비밀번호 만료/계정 잠금 현황 | `PasswordExpirationPanel` | Admin Console > 비밀번호 정책 > 만료/잠금 현황 |
| 계정 잠금 정책 | `AccountLockPolicyPanel` | Admin Console > 비밀번호 정책 > 계정 잠금 정책 |
| 감사로그 대시보드 | `AuditLogDashboard` | Admin Console > 감사 로그 상단 |
| 통합 감사로그 목록 | `AuditLogPanel` 통합 탭 | Admin Console > 감사 로그 |
| 감사로그 필터 | `AuditLogFilterPanel` | Admin Console > 감사 로그 > 필터 |
| 로그인/로그아웃 이력 | `LoginHistoryPanel`, `LogoutHistoryPanel` | Admin Console > 감사 로그 |
| 비밀번호 변경 이력 | `PasswordChangeHistoryPanel` | Admin Console > 감사 로그 |
| 사용자 접근 로그 | `UserAccessLogPanel` | Admin Console > 감사 로그 |
| 사용자 정보수정 로그 | `UserInfoChangeLogPanel` | Admin Console > 감사 로그 |
| 보안 감사 | `SecurityAuditPanel` | Admin Console > 감사 로그 |
| 관리자 조치 이력 | `AdminActionHistoryPanel` | Admin Console > 감사 로그 |

## 4. 핵심 데이터 모델

### 4.1 로그인 정책 (`LoginPolicy`)

- `id`, `name`, `target`, `appliedRoles`, `appliedGroups`
- `allowedStartDate`, `allowedEndDate`, `allowedPeriod`
- `maxFailedAttempts`, `dailyMaxFailedAttempts`, `blockDurationMinutes`, `blockMethod`
- `notifyAdmin`, `requireUserVerification`, `unlockMethod`
- `allowDuplicateLogin`, `maxConcurrentSessions`, `allowSameIpDuplicate`, `allowDifferentIpDuplicate`, `existingSessionAction`
- `adminException`, `externalUserException`, `auditLogged`, `mfaRequired`
- `enabled`, `createdAt`, `updatedAt`

### 4.2 비밀번호 정책 (`PasswordPolicy`)

- `id`, `name`, `target`, `appliedRoles`
- `minLength`, `requireUppercase`, `requireLowercase`, `requireNumber`, `requireSpecialChar`, `forbidUserId`
- `reuseLimit`, `changeCycleDays`, `expiredLockAction`, `gracePeriodDays`
- `tempPasswordExpiryMinutes`, `requireChangeOnFirstLogin`, `complexityDescription`
- `enabled`, `createdAt`, `updatedAt`

### 4.3 비밀번호 만료 상태 (`PasswordExpirationStatus`)

- `userName`, `accountId`, `policyName`, `lastChangedAt`, `expiresAt`
- `daysRemaining`, `gracePeriodDays`, `lockScheduled`, `accountStatus`, `actionRequired`

### 4.4 감사로그 (`AuditLog`)

- `timestamp`, `user`, `eventType`, `target`, `ip`, `result`, `riskLevel`, `detail`

### 4.5 이력/로그

- `LoginHistory`, `LogoutHistory`, `PasswordChangeHistory`, `UserAccessLog`, `UserInfoChangeLog`
- `SecurityAuditItem`, `AdminActionHistory`

## 5. 후속 Keycloak 연동 방향

- Keycloak Realm password policy 연동
- Brute force detection 설정 연동
- Session timeout / SSO idle/max 설정 연동
- User events 조회 (`/events`)
- Admin events 조회 (`/admin-events`)
- 계정 잠금/해제 연동 (`/users/{id}`)
- Required Action 연동 (UPDATE_PASSWORD, VERIFY_EMAIL)

## 6. 후속 DB 설계 방향

- `login_policies` 로그인 정책 테이블
- `password_policies` 비밀번호 정책 테이블
- `audit_logs` 감사로그 테이블
- `user_access_logs` 사용자 접근 로그 테이블
- `admin_action_histories` 관리자 조치 이력 테이블
- `security_audit_items` 보안 이벤트 조치 테이블
