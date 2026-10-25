# 마이페이지 및 환경설정 화면 설계

## 목적

본 문서는 국방지능화플랫폼(KAIPotal)에서 개인 사용자가 자신의 계정과 활동을 관리하는 **마이페이지(My Page)** 화면과, 포털 운영자가 전역 설정을 관리하는 **환경설정(Environment Settings)** 화면의 설계를 정리한다.

두 화면 모두 현재 단계에서는 mock data 기반의 UI/UX PoC이며, 실제 Keycloak User Profile/Session/Password, DB, Notification, API Key Vault, 운영 설정 반영은 후속 단계에서 연동한다.

---

## 마이페이지 (My Page)

### 위치

- 메뉴: 좌측 Sidebar `My Page`
- 라우트: `/my-page`
- 컴포넌트: `packages/app/src/components/my-page/`

### 주요 기능

| 탭 | 기능 | 컴포넌트 |
| --- | --- | --- |
| 프로필 | 사용자 기본 정보/조직 정보 조회 및 mock 수정 | `ProfilePanel` |
| 이메일 확인 | 현재 이메일 확인 상태, 변경 요청 email 입력 | `EmailVerificationPanel` |
| 비밀번호 변경 | 현재/새/확인 비밀번호 입력, 정책 요약 | `PasswordChangePanel` |
| 활성 세션 | 세션 목록, 현재 세션 표시, 강제 종료 mock | `ActiveSessionPanel` |
| 내 프로젝트/워크스페이스 | 참여 프로젝트/워크스페이스, 역할, 할당 자원, 크레딧 | `MyProjectWorkspacePanel` |
| 자원 사용 이력 | 사용일시, 자원 유형, 사용량, 환산 크레딧 | `ResourceUsageHistoryPanel` |
| 크레딧 사용 내역 | 부여/사용/충전/조정 이력, 잔액 | `MyCreditHistoryPanel` |
| 알림 설정 | 유형별 채널/임계치/시간대 설정 | `NotificationSettingPanel` |
| 개인 API Key | API Key 생성/폐기, 마스킹된 Key 표시 | `PersonalApiKeyPanel` |
| 내 활동 로그 | 로그인/조회/수정/제안 등 활동 이력 | `MyActivityLogPanel` |
| 요구사항 대응 현황 | 마이페이지 관련 요구사항 충족 현황 | `MyPageRequirementCoveragePanel` |

### 상단 요약 카드

`MyPageSummaryCards`에서 다음 지표를 표시한다.

- 내 프로젝트 수
- 내 워크스페이스 수
- 활성 세션 수
- 남은 크레딧
- 이번 달 자원 사용량
- 읽지 않은 알림 수
- 활성 API Key 수
- 최근 보안 이벤트 수

### 타입

`packages/app/src/components/my-page/types.ts`에 정의.

주요 타입:

- `UserProfile`
- `EmailVerification`
- `PasswordPolicyInfo`
- `ActiveSession`
- `MyProjectWorkspace`
- `ResourceUsage`
- `CreditHistory`
- `NotificationSetting`
- `ApiKey`
- `ActivityLog`
- `MyPageTab`

### mock 데이터

`packages/app/src/components/my-page/mockMyPageData.ts`에 정의.

---

## 환경설정 (Environment Settings)

### 위치

- 메뉴: 좌측 Sidebar `Environment Settings`
- 라우트: `/environment-settings`
- 컴포넌트: `packages/app/src/components/environment-settings/`

### 주요 기능

| 탭 | 기능 | 컴포넌트 |
| --- | --- | --- |
| 시스템 파라미터 | 세션 타임아웃, MFA, 언어, 로그 보관 주기 등 | `SystemParameterPanel` |
| 보안 정책 | 비밀번호/계정 잠금/세션/반출/API Key/감사로그 정책 | `SecuritySettingPanel` |
| 자원할당 기준 | 역할/조직별 CPU/GPU/Memory/Storage/Network/크레딧 | `ResourceAllocationPolicyPanel` |
| 운영 설정 | 화멸별 설정, 담당자, 사용 여부 | `PortalOperationSettingPanel` |
| 변경 이력 | 설정 변경/승인/반려 이력 | `SettingChangeHistoryPanel` |
| 요구사항 대응 현황 | 환경설정 요구사항 충족 현황 | `EnvironmentRequirementCoveragePanel` |

### 상단 요약 카드

`EnvironmentSettingsSummaryCards`에서 다음 지표를 표시한다.

- 전체 파라미터
- 활성 파라미터
- 변경 대기
- 보안 정책
- 자원할당 정책
- 운영 설정
- 최근 변경

### 타입

`packages/app/src/components/environment-settings/types.ts`에 정의.

주요 타입:

- `SystemParameter`
- `SecuritySetting`
- `ResourceAllocationPolicy`
- `PortalOperationSetting`
- `SettingChangeHistory`
- `EnvironmentSettingsSummary`
- `EnvironmentSettingsTab`

### mock 데이터

`packages/app/src/components/environment-settings/mockEnvironmentSettingsData.ts`에 정의.

---

## 공통 컴포넌트

`packages/app/src/components/common/RequirementCoveragePanel.tsx`는 마이페이지와 환경설정의 요구사항 대응 현황 탭에서 재사용한다.

---

## 라우팅 및 메뉴

`packages/app/src/App.tsx`에 다음 항목 추가.

- Sidebar: `My Page`, `Environment Settings`
- Route: `/my-page`, `/environment-settings`

---

## 연동 범위

현재 단계에서 다음 연동은 **제외**한다.

- Keycloak User Profile / Session / Password / Email API
- 실제 DB, Notification 서비스
- API Key Vault 생성/저장
- 운영 설정 실시간 반영

---

## 검증

1. `yarn tsc --noEmit`에서 신규 코드 타입 오류 없음 (기존 `App.test.tsx` 오류 제외)
2. `yarn start` 후 브라우저에서 `/my-page`, `/environment-settings` 접속 확인
3. 각 탭의 테이블/폴드/요약 카드 정상 표시 확인
