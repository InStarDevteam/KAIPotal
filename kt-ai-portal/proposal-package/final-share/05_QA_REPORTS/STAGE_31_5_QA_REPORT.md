# 31.5단계 QA 보고서: 전 기능 전수점검·보완 및 화면 캡처용 문구 정리

> 작성일: 2026-07-12
> 대상: 국방지능형플랫폼포털 Front-end (`backstage-portal/packages/app`)
> 배포: https://kai-platform-d0ae0.web.app

## 1. 목적

- 제안서/PPT 캡처에 부적합한 문구를 제거·중립화
- 전체 메뉴/라우트/탭/버튼/CSV 다운로드 전수점검
- 관리자 전용 접근제어 재검증
- Firebase Hosting 재빌드·재배포 및 QA 결과 문서화

## 2. 점검 기준

제거·중립화 대상 문구:

- `제안서`, `제안팀`, `PoC`, `데모`, `검토용`, `프리뷰`, `preview`, `낮부 관리자`, `낮음 관리자`, `관리자 프리뷰`
- `Mock`, `mock data`, `캡처용`

권장 안내 문구:

- "이 화면은 권한이 부여된 관리자만 사용할 수 있습니다."
- "본 화면은 플랫폼 간 연계 항목과 상세 정보를 관리합니다."

## 3. 주요 변경 사항

### 3.1 로그인·배너 문구

| 화면/컴포넌트 | 변경 전 | 변경 후 |
| --- | --- | --- |
| `PreviewLoginPage` | "제안팀 검토용 PoC 데모" | "국방지능형플랫폼포털 접근 로그인" |
| `PreviewLoginPage` | "제안서 작성을 위해 제공되는 PoC 데모 사이트입니다." | "접근코드 또는 Google 계정으로 로그인할 수 있습니다." |
| `PreviewLoginPage` | "본 사이트는 제안팀 검토용 데모이며..." | "본 사이트는 시연 환경이며..." |
| `DemoModeBanner` | "제안팀 검토용 PoC 데모입니다. 현재 데이터는 mock data..." | "시연 환경입니다. 현재 데이터는 샘플 데이터..." |
| `App.tsx` | "등록된 제안팀 계정이 아닙니다." | "등록된 사용자 계정이 아닙니다." |

### 3.2 관리자 전용 페이지 안내 문구

| 페이지 | 변경 전 | 변경 후 |
| --- | --- | --- |
| `RequirementProgressPage` | "제안/사업관리용 납품 후 관리자 화면... 제안팀..." | "이 화면은 권한이 부여된 관리자만 사용할 수 있습니다." |
| `WorkflowScenarioPage` | "제안/사업관리용 납품 후 관리자 화면... 제안팀..." | "이 화면은 권한이 부여된 관리자만 사용할 수 있습니다." |
| `PlatformApiIntegrationPage` | "PoC 기준 포털 ↔ 플랫폼 연계 설계안..." | "본 화면은 플랫폼 간 연계 항목과 상세 정보를 관리합니다." |
| `AdminOnlyGuard` | "제안팀 일반 사용자에게는 제공되지 않습니다." | "이 화면은 권한이 부여된 관리자만 사용할 수 있습니다." |
| 메뉴 설명(`platform-api-integration`) | "PoC 기준 포털 ↔ 플랫폼 연계..." | "포털 ↔ 플랫폼 연계 설계안 및 API 후보 목록..." |

### 3.3 일반 페이지 부제목

| 페이지 | 변경 전 | 변경 후 |
| --- | --- | --- |
| `ProjectWorkspacePage` | "프로젝트/워크스페이스 관리 PoC (mock data 기반)" | "프로젝트/워크스페이스 관리" |
| `CreditManagerPage` | "프로젝트별 크레딧 관리 PoC (mock data 기반)" | "프로젝트별 크레딧 관리" |
| `ExportApprovalPage` | "반출/반입 관리 PoC (mock data 기반)" | "반입·반출 승인 관리" |

### 3.4 시연용 버튼·알림 문구

| 파일 | 변경 전 | 변경 후 |
| --- | --- | --- |
| `ProjectRequestForm` | "[Mock] 프로젝트 생성 신청이 접수..." | "프로젝트 생성 신청이 접수..." |
| `ProjectRequestForm` | "신청 (Mock)" | "신청" |
| `ExportRequestForm` | "[Mock] 반출/반입 신청이 접수..." | "반출/반입 신청이 접수..." |
| `ExportRequestForm` | "신청 등록 (Mock)" | "신청 등록" |
| `ProposalForm` | "새로운 AI/데이터 제안을 등록합니다. (mock 저장)" | "새로운 AI/데이터 아이디어를 등록합니다." |
| `ProposalForm` | "제안 저장 (mock)" | "등록" |
| `ProposalBoardPage` | "새로운 제안 (mock)" | "새로운 아이디어" |
| `ProposalBoardPage` | "화면 테스트용 mock 제안" | "화면 테스트용 아이디어" |

### 3.5 상태·역할·프로젝트명 중립화

- Workflow 시나리오 / 플랫폼 API 연계 상태
  - `PoC 화면구현` → `화면구현`
  - `Mock 기반` → `기반 자료`
  - `PoC Mock` → `모의 연동`
- Workflow 시나리오 역할
  - `제안/사업관리자` → `사업관리자`
- Workflow 테이블 레이블
  - `제안 발표 문구` → `핵심 메시지`
- 프로젝트/데이터 이름의 `PoC` 제거
  - `AI 데이터 거버넌스 PoC` → `AI 데이터 거버넌스`
  - `K-RMF 증빙 자동화 PoC` → `K-RMF 증빙 자동화`
  - `육군 정비예측 PoC` → `육군 정비예측`
- 대시보드 공지/상태
  - `K-Defense AI Data Portal PoC 2차 오픈 안내` → `K-Defense AI Data Portal 2차 오픈 안내`
  - `PoC Running` → `운영 준비`
- API 설명
  - `데모/프리뷰용 게스트 세션 갱신` → `게스트 세션 갱신`
  - `제안(아이디어) 등록/조회` → `아이디어 등록/조회`

## 4. 접근제어 재검증

- 관리자 전용 메뉴(`requirement-coverage`, `requirement-progress`, `platform-api-integration`, `workflow-scenarios`)는 `visibleTo: 'admin'` 설정 유지
- `AppLayout`에서 `showAdminMenu = isAdmin || isPreviewAdmin()` 조건으로 메뉴 필터링
- 관리자 페이지는 `AdminOnlyGuard`로 직접 URL 접근 차단
- 접근 거부 화면 문구 중립화 완료

## 5. 빌드·테스트 결과

| 항목 | 명령어 | 결과 |
| --- | --- | --- |
| TypeScript 체크 | `yarn tsc --noEmit` | 통과 |
| 단위 테스트 | `yarn workspace app test --watchAll=false` | 1 passed |
| 프로덕션 빌드 | `yarn workspace app build` | 성공 |
| Firebase 배포 | `firebase deploy --only hosting` | 성공 |

## 6. 알려진 이슈

- `/api/auth/guest/refresh` 404: Cloud Run backend 측 이슈로, 본 단계에서 Frontend 변경만 수행. Backend 변경 시 별도 재배포 필요.
- `git push` PAT 인증 실패: 사용자가 `gh auth login` 또는 PAT 갱신 후 직접 push 필요.
- MUI/Backstage 관련 `findDOMNode` / `WebSocket` 경고: production 무시 가능한 라이브러리 경고.

## 7. 다음 단계

- 배포 URL에서 관리자/일반 사용자 권한별 화면 최종 확인
- 캡처 대상 화면 스크린샷 확보
- `kimi_done.sh 31.5` 실행
