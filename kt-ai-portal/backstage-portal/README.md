
> 33.2단계 UI/UX 디자인 시스템 정비(2026-07-30): 디자인 토큰/공통 컴포넌트/사이드바/대시보드/K-RMF/역할 UI/반응형 개선. 상세는 `docs/UI_UX_DESIGN_SYSTEM.md`, `docs/UI_UX_DESIGN_REVIEW.md`, `docs/UI_UX_BEFORE_AFTER.md` 참조.
# 국방지능형플랫폼포털 (K-Defense Intelligence Platform)

Backstage 기반 포털 앱 디렉터리입니다.

## 구성

- `packages/app`: Backstage 프론트엔드 앱
- `packages/backend`: Backstage 백엔드 (인증, proxy, catalog, search 등)
- `plugins/`: 향후 정식 플러그인 추가 예정

## 설치 및 실행

### 사전 준비

- Node.js 22/24
- Yarn 4.x
- Docker Desktop

### 인프라 기동

```bash
cd ..
docker-compose up -d
```

### 환경 변수

```bash
cp .env.example .env
# .env에 AUTH_OIDC_CLIENT_SECRET, AUTH_SESSION_SECRET 등 입력
```

### 개발 서버

```bash
./scripts/start-dev.sh
```

### 빌드

```bash
yarn tsc
yarn build:all
```

## 주요 화면

| 메뉴 | 경로 | 그룹 | 관련 SFR |
|------|------|------|----------|
| 통합 대시보드 | `/` | 포털 공통 | SFR-001, SFR-012 |
| 관리자 콘솔 | `/admin-console` | 관리/보안 | SFR-003~006 |
| 요구사항 대응현황 | `/requirement-coverage` | 관리/보안 | SFR-001~021 |
| 플랫폼 API 연계현황 | `/platform-api-integration` | 관리/보안 | SFR-012/014/015/016/017/018/021 |
| 업무흐름/연계 시나리오 | `/workflow-scenarios` | 관리/보안 | SFR-001/012/014/016/017/018/021 |
| 요구사항 진도표 (legacy) | `/requirement-progress` | 관리/보안 | SFR-001~021 |
| K-RMF 증빙관리 | `/krmf-evidence` | 관리/보안 | SFR-002, SFR-004 |
| 서비스/도구 카탈로그 | `/service-catalog` | 플랫폼 연계 | SFR-007/008/014 |
| 반입·반출 승인 | `/export-approval` | 플랫폼 연계 | SFR-009~012 |
| 통합검색 | `/integrated-search` | 플랫폼 연계 | SFR-014/015 |
| 프로젝트/워크스페이스 | `/project-workspace` | 프로젝트 운영 | SFR-016/018 |
| 크레딧 관리 | `/credit-manager` | 프로젝트 운영 | SFR-016~018 |
| 마이페이지 | `/my-page` | 사용자/조직 | SFR-019 |
| 환경설정 | `/environment-settings` | 사용자/조직 | SFR-020 |
| 육해공군 관리 | `/tenant-management` | 사용자/조직 | SFR-021 |
| 제안 게시판 | `/proposal-board` | 사용자 지원 | SFR-013 |

## 연동 서비스

| 서비스 | URL |
|--------|-----|
| Backstage Portal | http://localhost:3000 |
| Keycloak | http://localhost:8080 |
| OpenSearch | http://localhost:9200 |
| OpenSearch Dashboards | http://localhost:5601 |
| OpenMetadata | http://localhost:8585 |

## 데모 배포

- 데모 배포 구성: Firebase Hosting(프론트엔드) + Cloud Run(백엔드, `asia-northeast3`)
- 설정 파일: `app-config.demo.yaml`, `firebase.json`, `.firebaserc.example`
- 빌드/배포 스크립트: `scripts/build-demo.sh`, `scripts/deploy-demo-cloudrun.sh`, `scripts/deploy-demo-firebase.sh`
- 데모 가이드: `docs/FIREBASE_DEMO_DEPLOYMENT.md`
- 데모 체크리스트: `docs/FIREBASE_DEMO_CHECKLIST.md`
- 배포 이력: `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md`

### 29.1단계 재배포 현황

- Firebase Hosting에 요구사항 진도표 화면을 포함한 frontend 재배포 완료
- 데모 URL: `https://kai-platform-d0ae0.web.app`
- 접근 코드: `ictway`
- Firebase Web App 설정값은 환경변수로 주입하여 빌드

### 29.2단계 재배포 현황

- Cloud Run backend를 최신 Docker image로 재배포 완료
- Cloud Run URL: `https://kt-ai-portal-demo-e2ik6gboua-du.a.run.app`
- Revision: `kt-ai-portal-demo-00009-v6d`
- `/api/auth/guest/refresh` 404 문제 해소
- Firebase Hosting rewrite를 통해 `/api/**` 요청이 Cloud Run으로 정상 연결됨

### 30단계 재배포 현황

- 관리자 전용 `요구사항 대응현황`(`/requirement-coverage`) 및 `플랫폼 API 연계현황`(`/platform-api-integration`) 추가
- 기존 `/requirement-progress`는 `/requirement-coverage`와 동일한 화면으로 별칭 처리
- 메뉴/SFR/기능 단위 대응 현황과 포털 ↔ 플랫폼 API 연계 설계안/후보 목록 CSV 다운로드 제공
- `visibleTo: 'admin'` + `AdminOnlyGuard`로 일반 사용자 접근 차단

### 31단계 재배포 현황

- 관리자 전용 `업무흐름/연계 시나리오`(`/workflow-scenarios`) 추가
- 7개 사용자/플랫폼 연계 시나리오 및 사용자 여정 시각화
- 통합 대시보드에 관리자 전용 업무흐름/연계 정보 패널 추가
- 신규 문서 3개(`WORKFLOW_SCENARIO_GUIDE.md`, `USER_JOURNEY_AND_PLATFORM_FLOW.md`, `PROPOSAL_EXPLANATION_MESSAGES.md`) 작성

### 31.6단계 재배포 현황

- 실제 기능 전수검증 및 결함 보완 완료
- Playwright 전수검증 스크립트: `scripts/full-audit-playwright.mjs` (실행 시 `AUDIT_ACCESS_CODE` 환경변수 필요)
- Smoke test 스크립트: `../scripts/smoke-check-demo-routes.mjs`
- `/api/auth/guest/refresh` 브라우저 캐시 버스팅 적용
- 통합검색 fallback 및 서비스 카탈로그/프로젝트/반출/제안/크레딧/관리자콘솔/마이페이지 등 mock/PoC 문구 최종 중립화
- QA 보고서: `docs/STAGE_31_6_FULL_AUDIT_REPORT.md`

### 32단계 재배포 현황

- 제안서/PPT용 화면 캡처 및 장표 패키징 완료
- production URL(`https://kai-platform-d0ae0.web.app`) 기준 21개 화면 재캡처
- 관리자 전용 화면(`요구사항 대응현황`, `플랫폼 API 연계현황`, `업무흐름/연계 시나리오`) 캡처
- PPT 초안: `proposal-package/국방지능형플랫폼포털_RFP대응_발표자료_32단계.pptx`
- 캡처 스크립트: `../scripts/capture-proposal-screenshots-prod.js`
- PPT 생성 스크립트: `../scripts/generate-proposal-ppt.py`

### 32.1단계 재배포 현황

- 데모 URL: `https://kai-platform-d0ae0.web.app`
- 접근 코드: `ictway`
- Firebase SDK config 추출 로직 수정 후 Firebase Hosting 재배포
- Google 로그인 팝업/계정 선택/비밀번호 화면까지 도달 확인
- `kyubeom@gmail.com` Google 로그인 완료 여부는 비밀번호/2FA로 인해 사용자 수동 확인 필요
- `/api/auth/guest/refresh` 404는 Firebase Hosting edge stale cache로 분석; smoke test cache-buster 적용 후 17/17 통과
- Firebase Console Google Provider/Authorized domains 수동 확인 필요

## 현재 구현 범위 및 한계

- Backstage 포털 UI 및 19개 핵심 화면 구현 (관리자 전용 요구사항 대응현황, 플랫폼 API 연계현황, 업무흐름/연계 시나리오 포함)
- Keycloak OIDC 인증, OpenSearch proxy 검색, OpenMetadata UI 연동 확인
- 대부분의 업무 로직은 샘플 데이터 기반
- 실제 DB/API/Keycloak Admin/Kubernetes/OpenStack/CMP/파일 저장소 연동은 미구현
- 최신 사전규격 기능목록 163개 반영 (`requirement-coverage` / `requirement-progress` mock data)
- 플랫폼 API 연계현황 20개 후보 명세 반영 (`platform-api-integration` mock data)
- 업무흐름/연계 시나리오 7개 및 7개 사용자 여정 반영 (`workflow-scenarios` mock data)

## 보안 등급

- 보안등급은 `공개` / `내부` / `비밀`로 통일
- 보안등급 오타 사용 금지

## 32.2단계 기능흐름 발표자료

- 상위 `proposal-package/국방지능형플랫폼포털_기능흐름_RFP대응_발표자료_32_2단계.pptx` — 기능 흐름 중심 RFP 대응 발표자료
- `proposal-package/국방지능형플랫폼포털_발표자_스크립트_32_2단계.md` — 슬라이드별 발표자 스크립트
- `proposal-package/국방지능형플랫폼포털_쉽게_이해하는_기능흐름.md` — 사용자용 쉬운 기능 설명자료
- `scripts/generate-feature-flow-ppt.py` — 32.2 PPT 자동 생성 스크립트

## 33단계 최종 공유 패키지

- 상위 `proposal-package/국방지능형플랫폼포털_최종제안공유패키지_33단계.zip` — 최종 공유용 ZIP
- 상위 `proposal-package/final-share/` — ZIP 낸부 구조
- 상위 `proposal-package/FINAL_PACKAGE_INDEX.md` — 최종 패키지 인덱스
- 상위 `scripts/verify-final-package.py` — 패키지 검증 스크립트

## 제안서 자료

- 상위 `proposal-package/` 폴터에 제안서 초안, 발표자료 초안, 견적서 초안, 화면 캡처가 포함되어 있습니다.
- `docs/PROPOSAL_DRAFT.md`, `docs/PROPOSAL_SLIDE_DRAFT.md`, `docs/ESTIMATE_DRAFT.md` 등을 참고하세요.

## 문제 해결

- OIDC 이슈: `docs/OIDC_RUNTIME_FIX.md` 참조
- OpenMetadata/OpenSearch 연결 문제는 Docker Compose 상태 확인

## 라이선스

내용


## 33.1단계 UI 정리

- 화면 상단 `시연 환경입니다...` 안내 배너 제거
- `OpenMetadata`, `OpenSearch 대시보드`, `Keycloak 관리` 카드를 일반 사용자 화면에서 제거하고 관리자 콘솔 `플랫폼 운영도구` 탭으로 이동
- 서비스/도구 카탈로그의 `OpenMetadata` 항목을 관리자 전용으로 필터링
- 접근 코드 로그인 화면의 `검증 환경...` 문구 제거
- 화면에 노출되는 `샘플 데이터` 문구를 `예시 데이터`로 정정
- Firebase Hosting 재배포 완료: https://kai-platform-d0ae0.web.app
- 33단계 최종 공유 ZIP은 34단계에서 화면 재캡처/PPT 반영 시 갱신 예정
