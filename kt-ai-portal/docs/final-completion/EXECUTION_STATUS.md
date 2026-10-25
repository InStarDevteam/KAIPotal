# 최종 기능 완성 — 실행 현황

기준일: 2026-09-29. 개발 지시: `prompt/final-completion-20260929/Kimi_Code_최종기능완성_개발프롬프트.md`.

## 1. 기준선 확정 (완료: 2026-09-29)

- 원문 기준선: `prompt/final-completion-20260929/FP_요구사항_원문기준.csv` — 531행(EI 115, EQ 200, EO 193, ILF 17, EIF 6), K-RMF 관련 26행(업무 24 + ILF 2). PDF SHA-256 `72c6efb6...`, 15페이지.
- 추출 확인사항 5건(FP-P15-005/006/007/013/024)은 원문 추출값 보존, 잘린 SFR 번호 임의 확정 금지.
- 코드 기준: 브랜치 `main`, HEAD `01a0908`(BFF Cloud Run 배포 커밋) + **미커밋 변경 137개**(portal-runtime, portal-work, portal-home, workRequests 마이그레이션 등). reset/checkout 금지, 기존 작업 보존 원칙 적용.
- 환경: Node 24.13.1, Yarn 4.13.0(Corepack), 로컬 PostgreSQL 16(`kai-portal-pg-local`, docker, healthy).
- 출발점 확인사항:
  - K-RMF: `krmf-evidence/` 20파일은 mock 전용, App 라우트·메뉴 보류(`App.tsx:14,320`, `portalMenuDefinitions.ts:89-95`). `my-page/SecurityTaskPanel.tsx:59`의 `/krmf-evidence` 링크는 dead link. 백엔드 K-RMF API 없음.
  - 통합검색: `/integrated-search` 활성, OpenSearch 프록시 직접 호출(`SearchApiClient.ts:77`), 포털 자체 데이터 BFF 검색 없음. mock fallback은 이미 제거됨.
  - 업무 원장: `workRequests.ts` + 마이그레이션 `20260924000002_work_requests.js`(미커밋) 존재. 관계 UUID에 FK 미보완.
  - 다수 운영 UI(admin-console, credit-manager, export-approval, my-page, project-workspace, proposal-board, service-catalog 등)에 `*Store.ts`(localStorage 데모) 병행 잔존.

## 2. 단계별 진행

| 단계 | 상태 | 비고 |
|---|---|---|
| 1. 기준선 확정 | 완료 | 위 1절 |
| 2. 공통 기반 보완 | 진행 예정 | work_requests FK·상태전이, 멱등성, 파일·감사 원자성 |
| 3. 업무 완성 | 진행 예정 | 데모 저장 경로 → 실제 API/DB 연결(우선순위: 반출/크레딧/프로젝트/제안/카탈로그) |
| 4. KRMF·검색·연동 준비 | 진행 예정 | 컴팩트 K-RMF 3탭(현황/통제·증적/조치·변경), 검색 BFF, adapter 계약·대기 상태 |
| 5. 전체 회귀·운영 준비 | 완료(2026-09-29~30) | tsc 0 / 백엔드 159 / 프론트 227 / runtime 48 / work-api 14 / 도메인 HTTP 46 / MDR 637, 전부 PASS; build:all 성공; Firebase Hosting 배포 완료 |
| 6. 최종 보고 | 완료(2026-09-30) | `.xlsx` 10시트(531행 판정: 완료 361/부분완료 140/미구현 30/미검증 0), requirement-status.json, IMPLEMENTATION_REPORT.md, TEST_REPORT.md, 생성 스크립트 scripts/build-final-excel.py |

## 3. 시험 기록

(각 시험 실행 후 case ID, 명령, 결과, 증적 경로를 `TEST_REPORT.md`와 함께 기록. 미실행을 성공으로 집계 금지.)

2026-09-29~30 재실행분(전부 PASS, 상세는 TEST_REPORT.md):

| 묶음 | 명령 | 결과 | 증적 |
|---|---|---|---|
| 타입체크 | `yarn tsc:full` (backstage-portal) | 오류 0 | — |
| 백엔드 단위 | `CI=1 yarn workspace backend test` | 159/159 | — |
| 프론트 단위 | `CI=1 yarn workspace app test` | 227/227 (35 suites) | — |
| 런타임 통합(RLS·감사) | `node scripts/test-portal-runtime.mjs` | 48/48 | — |
| 업무 원장 API | `node scripts/test-portal-work-api.mjs` | 14/14 | — |
| 신규 도메인 HTTP 시나리오 | `node scripts/test-portal-domains.mjs` | 46/46 | docs/final-completion/evidence/domain-api-tests.json |
| MDR 사전 대조 | `node scripts/verify-mdr-dictionary.mjs` | 637/637 | docs/final-completion/data/mdr-verification-result.json |
| 빌드 | `yarn build:all` | 성공 | — |

## 4. 결정·임시 규칙

- K-RMF는 기존 8탭 mock 화면(krmf-evidence)을 보존한 채 새 컴팩트 화면(krmf-monitor, 3탭)으로 재구성. dead link `/krmf-evidence` → `/krmf-monitor` 교정.
- 통합검색은 포털 소유 DB BFF(/v1/search)로 전환. 외부 원천(데이터셋/모델/Docker/PyPI/의미검색)은 `integration_pending`으로만 노출(가짜 결과 금지).
- 카탈로그 도구 실행환경은 승인 후 `execution_status=pending_platform` 유지(가짜 '사용 가능' 금지). 사용량 추이는 `measured=false` 미산출.
- 데모 저장(localStorage)은 `isDemo` 명시 모드에서만. 운영 원장은 PostgreSQL.
- 기관 표준사전 미수령: MDR 전 행 `임시정의`(TMP- 접두), 기관 확정 ID 임의 생성 금지.
- 잘린 SFR 번호(FP-P15-005/013/024)는 추정하지 않고 원문 그대로 보존·확인 필요로 기록.
- 임시 규칙이 확정되면 여기에 근거·영향·확인 필요 항목과 함께 기록.

## 5. 배포 현황(2026-09-30)

- Firebase Hosting 재배포 완료(2026-09-30 18:50 KST): 버전 d5eaad0dd987a98c. 프론트 임베딩 config를 배포 URL로 교정(app/backend baseUrl = https://kai-platform-d0ae0.web.app, packages/app build에 `--config app-config.production.yaml` 추가, app-config.production.yaml baseUrl/cors 수정). 접근코드 로그인은 소스에 `demo1234` 하드코딩 폴 백으로 백엔드 없이도 동작 확인(Playwright smoke: 접근코드 입력 → 게스트 로그인 → 포털 셸 진입).
- GCP 프로젝트 결제 비활성화 확인(2026-09-30, billingEnabled=false, 청구계정 미연결): Cloud Run(kt-ai-portal-demo) 인스턴스 생성 실패로 /api/** 503. → 2026-10-01 사용자가 결제 재활성화(billingAccounts/01858E-56D4FD-C4BB5E 연결) 후 복구: 동일 이미지 신규 revision 배포(p1rev3→p1rev4) + minInstanceCount=1(콜드스타트 429/인스턴스 부족 재발 방지)로 `/api/portal/v1/health` 200·DB connected 확인.
- 접근코드 로그인 완전 복구(2026-10-01, Hosting 버전 갱신): ① App.tsx 접근코드 폴 백 `demo1234` 하드코딩 + 미리 인증 세션 게스트 로그인 처리 ② `UserIdentity.createGuest()` 대신 `/api/auth/guest/refresh`로 게스트 토큰을 발급·캐시하는 authApi 주입(createGuest는 getCredentials()가 항상 빈 값이라 BFF 호출이 401이 됨) ③ Cloud SQL 포털 DB에 협의용 신원 등록(tenant '국방부 공통'(joint), user '포털 협의 사용자', external_identity subject='user:development/guest'·verified, membership + portal-admin role assignment) — 사용자 지시("접속코드 소스 하드코딩")에 따른 운영 DB 최소 등록, 되돌리려면 해당 4테이블 행 삭제. Playwright 최종 검증: 접근코드 로그인 → /v1/me 200 → 헤더 소속 '국방부 공통' 표시.
- 백엔드 신규 이미지 배포 완료(2026-10-01, 사용자 승인 후): Cloud Build `57a71bf8-9a09-4be1-8551-4c92291b4ae7`(3m51s, SUCCESS)로 이미지 `kt-ai-portal-demo:p1rev5`(sha256:99778f5bcc28…) 빌드 → Cloud Run revision `p1rev5` LATEST 100% 전환. 신규 BFF 전 라우트 존재 확인(health 200, tenant-settings/platform-access/krmf/credits/catalog 등 401=인증필요 정상). minInstanceCount=1 유지.
- Cloud SQL migration 정리·적용(2026-10-01): ① 09-24 migration(`20260924000002_work_requests.js`)이 `withSchema('portal')` 누락으로 public 스키마에 fc_projects 등 4테이블을 생성했던 결함을 발견 → `ALTER TABLE … SET SCHEMA portal`로 이동(RLS 정책 동반), migration 소스 2개(09-24, 09-29 krmf)도 withSchema/자격한정으로 수정(향후 환경 일관성) ② 09-29 migration 3개(krmf 9테이블, domain_ledger 크레딧·반출 5테이블, domains 프로젝트·제안·카탈로그·설정) batch 4로 적용 완료. 적용 계정: portal_migrator.
- 최종 end-to-end 검증(Playwright, 라이브 사이트): 접근코드 `demo1234` 로그인 → `/v1/me` 200 → 헤더 소속 '국방부 공통' → 홈 화면 정상 렌더링, API 실패 0건, 오류 배너 0건.
- 이전 배포: 버전 b3e7d58598ec68c2 / d5eaad0dd987a98c(Firebase Hosting).
