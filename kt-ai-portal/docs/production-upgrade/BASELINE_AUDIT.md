# BASELINE_AUDIT — 운영 전환 기준선 감사

작성: 2026-09-15 · 대상: `KBitone-Company/kt-ai-portal` / `backstage-portal/`
기준 커밋: 작업 시작 시점 HEAD `76f8bd8` (P0 코드 수정 4건은 본 감사 이후 반영)

## 1. 현재 구조·버전·실행 결과

| 항목 | 소스 확인 값 |
|---|---|
| Backstage | 1.52.0 (`backstage.json`) |
| Node engines | `22 || 24` (`package.json`) — 인수인계의 "Node 20/24" 기술과 차이 있음, 소스 기준으로 고정 |
| 패키지 매니저 | Yarn 4.13.0 (`.yarn/releases`) |
| UI | MUI v4 (`@material-ui/core`) — v5 미이관, 유지 결정(ADR-007) |
| 프런트 라우트 | 17개 (`App.tsx`): `/, /integrated-search, /service-catalog, /project-workspace, /credit-manager, /export-approval, /my-page, /proposal-board, /admin-console, /environment-settings, /tenant-management, /krmf-evidence, /requirement-coverage, /requirement-progress, /platform-api-integration, /workflow-scenarios, /role-menu-preview` |
| 메뉴 정의 | 13개 (`portalMenuDefinitions.ts`), visibleTo 권한 조건 포함 |
| 역할 | 6개: general-user, project-manager, branch-admin, portal-admin, security-manager, security-auditor |
| Permission ID | 22개 (`rolePolicies.ts`) |
| backend | `packages/backend/src/index.ts` — Backstage 기본 플러그인만 등록, 포털 업무 custom plugin 없음 |
| DB | dev/demo: better-sqlite3 `:memory:` / production 설정: pg (`app-config.production.yaml`) — 업무 테이블·migration 없음 |
| 배포 | Firebase Hosting + Cloud Run (demo 프로파일), 접근코드 게이트 + Firebase Google 로그인 |
| 검증 실행 | `yarn tsc --noEmit` 통과, `yarn workspace app test` 27/27 통과 (P0 수정 후 재실행 결과) |

## 2. 소스 기반 P0 확인 내역 (운영 차단사항)

| # | 확인 내용 | 위치 | P0 조치 | 상태 |
|---|---|---|---|---|
| 1 | 비localhost 환경에서 검색 API 생략·mock 즉시 반환 | `IntegratedSearchPage.tsx` | hostname 분기 제거, 실패 시 mock 대신 "미연결" 상태 표시 | ✅ 제거 |
| 2 | 검색 실패 시 mock 결과 fallback | `IntegratedSearchPage.tsx`, `SearchApiClient.ts` | fallback 시 빈 결과 + 미연결 안내로 교체 | ✅ 제거 |
| 3 | 색인 최신 시각·원천 동기화 상태 하드코딩 상수 | `SearchIndexStatusBar.tsx` | 실제 연결 상태(`checking/connected/unavailable`) prop 기반으로 교체 | ✅ 교체 |
| 4 | proposalCapture=false여도 sessionStorage admin preview로 역할 승격 | `AuthzContext.tsx` | 비캡처 경로에서 `isAdminPreviewEnabled()` 제거 — 서버 검증 관리자 신원(isAdmin)만 인정 | ✅ 제거 |
| 5 | backend permission allow-all 정책 | `backend/src/index.ts` | `plugins/permission.ts` 기본 거부 정책 모듈로 교체 (allow-all 모듈 제거) | ✅ 교체 |
| 6 | OpenSearch raw proxy 무인증 허용 | `app-config.yaml` proxy `/search` | proxy 블록 전체 제거 | ✅ 제거 |
| 7 | 포털 업무 migrations·repository·API 부재 | backend 전체 | P1에서 `fc_` 스키마·BFF 구현 예정 | ⬜ P1 |
| 8 | 감사·승인 이력이 mock/화면 state | AdminConsolePage, ExportApprovalPage 등 | P1 감사 원장 구현 예정 | ⬜ P1 |
| 9 | OpenSearch single-node·보안 해제·replica 0 | `infra/opensearch/docker-compose.yml` | 로컬 시험 구성이며 운영 구성 아님 — 3노드/TLS는 P6 | ⬜ P6 |
| 10 | 운영 Guest/접근코드 게이트 | `previewAuth.ts`, `app-config.demo.yaml` | demo(staging) 전용으로 한정. onprem 운영 프로파일 생성 시 제거 — 릴리스 게이트 항목 | ⬜ P1/게이트 |

## 3. 기존·신규 위험

- **R-1 인증 공백**: 프런트 Firebase 로그인 + backend Guest 경로가 현재 유일한 인증 경로. Keycloak OIDC 전환 전까지 staging 한정으로 명시.
- **R-2 업무 데이터 휘발성**: sqlite `:memory:`라 재시작 시 소실. 현재 화면 데이터는 전부 mock fixture — 실제 저장 없음.
- **R-3 K-RMF 집계 불일치**: fixture의 증빙 합계(47)와 목록(8) 불일치 — P5에서 DB 관계 계산으로 교체 필요.
- **R-4 원본 RFP PDF 부재**: SFR 매핑은 내부 추적표 기준. "RFP 완전 충족" 선언 금지, 원문 확보가 릴리스 게이트.
- **R-5 MUI v4 EOL 위험**: 유지 결정하되 취약점 대응 시 별도 이관 단계 필요.
- **R-6 Backstage 기본 플러그인 노출**: catalog/scaffolder/techdocs/kubernetes/MCP actions가 등록된 채 기본 거부 정책만 적용됨. 불필요 플러그인의 운영 비활성화는 P6 배포 단계에서 프로파일별로 정리 필요.
- **R-7 demo Firebase 설정**: `app-config.demo.yaml`의 previewAuth/proposalCapture가 staging에서 활성 — 운영 배포 시 false 강제 검증 스크립트 필요(릴리스 게이트).

## 4. 회귀 기준선 (P0 진입 조건용)

- 단위테스트 27개 (rolePolicies, portalMenuDefinitions, searchFiltering, krmfData, App.test) — 전부 통과
- E2E: `backstage-portal/scripts/full-audit-playwright.mjs`, `scripts/smoke-check-demo-routes.mjs` 존재. "E2E 파일이 전혀 없다"는 가정은 부정확 — 다만 업무 행위 검증(저장·승인·상태전이) 중심의 E2E는 부족함.
- 캡처: `scripts/capture-proposal-screenshots-prod.js` — `ACCESS_CODE` 환경변수 필수화 완료(이전 단계).

## 5. 문서 참조

- 지시서: `docs/production-upgrade/KAIPotal_Kimi_Development_Prompt.md`
- 설정 가이드: `docs/production-upgrade/KAIPotal_Setup_Guide.md`
- 시험 사양: `docs/production-upgrade/KAIPotal_Implementation_Test_Spec.md`
- 인수인계: `docs/PORTAL_HANDOVER_SPEC.md`, `docs/DOCUMENT_INDEX.md`
