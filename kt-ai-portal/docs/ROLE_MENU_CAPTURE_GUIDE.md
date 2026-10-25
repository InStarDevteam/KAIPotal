# 역할 전환·제안 캡처 실행 가이드 (ROLE_MENU_CAPTURE_GUIDE)

제안서 삽입용 화면 캡처를 역할별로 수행하는 절차를 정의한다.
구현 소스: `scripts/capture-proposal-screenshots-prod.js`, `backstage-portal/app-config.demo.yaml`.
역할·권한 정의는 `docs/ROLE_PERMISSION_MATRIX.md`를 따른다.

## 1. 캡처 모드 개요

| 항목 | 내용 |
|---|---|
| 활성화 조건 | `app.proposalCapture.enabled=true` (`app-config.demo.yaml`에서만 true, 운영 배포 기본 false) |
| 허용 역할 | `app.proposalCapture.allowedRoles`에 정의된 7개 역할 |
| 역할 override | URL `?captureRole=<role>` 또는 sessionStorage `__kt_ai_portal_role_override__` |
| 역할 전환 패널 | 화면 우하단 플로팅 패널(`data-testid="role-preview-switcher"`), 캡처 모드에서만 표시 |

캡처 모드가 비활성인 환경에서는 override가 무시되고 실제 로그인 역할이 적용된다.
역할 결정 우선순위는 `ROLE_PERMISSION_MATRIX.md` 5절(역할 결정 규칙)을 따른다.

## 2. 지원 역할과 캡처 대상 화면

| 역할 코드 | 한국어 명칭 | 캡처해야 하는 주요 화면 |
|---|---|---|
| general-user | 일반 사용자 | 대시보드(K-RMF 카드 숨김 상태), 통합검색, 서비스 카탈로그, 마이페이지, 크레딧 신청, 반출 신청 |
| project-manager | 프로젝트 관리자 | 프로젝트 워크스페이스(승인 포함), 작업 환경 생성 요청 Wizard, 실증·데이터 준비 탭, K-RMF 증빙 등록(본인 과제) |
| branch-admin | 군별 관리자 | 크레딧 승인, 사용자 관리, 감사 로그 조회, 군별 대시보드 |
| portal-admin | 포털 관리자 | 관리자 콘솔(`/admin-console`), 환경설정, 테넌트 관리, 메뉴/RBAC 관리, `/role-menu-preview` |
| security-manager | 보안 관리자 | K-RMF 증빙관리 전 탭, 증빙 검토/반려, 반출 검토, 변경영향 검토 |
| security-auditor | 보안 감사자 | K-RMF 조회 전용 화면(버튼 비활성 상태), 요구사항 커버리지, 감사 조회 |

## 3. 캡처 스크립트 사용법

```bash
ACCESS_CODE=<코드> node scripts/capture-proposal-screenshots-prod.js
```

### 3.1 환경변수

| 환경변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| ACCESS_CODE | 필수 | 없음 | 포털 접근코드. 미지정 시 스크립트 즉시 종료 |
| BASE_URL | 선택 | `https://kai-platform-d0ae0.web.app` | 캡처 대상 배포 URL |
| CAPTURE_OUT_DIR | 선택 | `docs/assets/final` | 캡처 저장 디렉터리 |
| CAPTURE_FULL_PAGE | 선택 | `true` | 전체 페이지 캡처 여부(`false`면 뷰포트만) |

### 3.2 품질 게이트

스크립트는 각 캡처 전후에 다음 4종 검증을 수행하며, 실패 시 해당 캡처를 FAIL로 기록한다.

| 게이트 | 내용 |
|---|---|
| portal-shell 존재 | `[data-testid="portal-shell"]` 요소가 렌더링되어야 함(로그인 실패 감지) |
| data-capture-id 존재 | 캡처 대상별 `data-capture-id` 요소가 DOM에 존재해야 함 |
| 금지 텍스트 부재 | 로그인/권한 오류 화면 문구(예: `Enter as a Guest User`)가 표시되면 실패 |
| 해시 중복 검사 | sha1 해시가 동일한 캡처가 2건 이상이면 중복(잘못된 화면 재사용)으로 표시 |

## 4. 수동 캡처 절차

1. 데모 배포(`app.proposalCapture.enabled=true` 환경)에 접근코드로 로그인한다.
2. 화면 우하단 역할 전환 패널(`role-preview-switcher`)에서 대상 역할을 선택한다.
   - 패널 선택 시 `__kt_ai_portal_role_override__`가 sessionStorage에 저장되고 화면이 해당 역할 기준으로 다시 렌더링된다.
   - URL에 직접 `?captureRole=security-manager` 형태로 지정할 수도 있다.
3. 대상 화면으로 이동해 메뉴 노출·버튼 활성 상태가 역할 정책과 일치하는지 확인한다.
4. 브라우저 캡처(전체 페이지)로 저장하고, 파일명은 `docs/assets/final`의 기존 명명 규칙을 따른다.
5. 다른 역할 캡처 전에는 반드시 패널에서 역할을 다시 선택한다(이전 override가 남아 있으면 잘못된 권한 화면이 캡처된다).

## 5. 검증 체크리스트

캡처 결과가 로그인 화면이나 권한 오류 화면이 아닌지 다음 DOM 기준으로 확인한다.

- [ ] `[data-testid="portal-shell"]`이 존재한다(포털 정상 렌더링).
- [ ] 대상 화면의 `data-capture-id` 요소가 존재한다.
- [ ] 금지 텍스트(`Enter as a Guest User` 등 로그인/권한 오류 문구)가 화면에 없다.
- [ ] 좌측 메뉴가 해당 역할의 메뉴 정책과 일치한다(`portalMenuDefinitions` 기준).
- [ ] 역할 전환 패널에 표시된 현재 역할이 의도한 역할과 같다.
- [ ] 캡처 해시가 다른 역할 캡처와 중복되지 않는다.

## 6. 산출물 위치

| 구분 | 위치 |
|---|---|
| 캡처 이미지 | `docs/assets/final/` |
| 캡처 스크립트 | `scripts/capture-proposal-screenshots-prod.js` |
| 역할·권한 정의 | `docs/ROLE_PERMISSION_MATRIX.md` |
| 캡처 설정 | `backstage-portal/app-config.demo.yaml` (`app.proposalCapture`) |
