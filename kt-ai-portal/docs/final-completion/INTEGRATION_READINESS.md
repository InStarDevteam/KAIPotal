# 외부체계 연동 준비 현황 (INTEGRATION READINESS)

> 보안등급: 낮음(낮) · 기준일: 2026-09-29 · 배포 현황 근거: `docs/production-upgrade/DEPLOYMENT_STATUS.md`(Cloud Run revision `kt-ai-portal-demo-p1rev1`, migration 20260916까지 적용)

## 1. 연동 대상 레지스트리

계약 상태는 외부체계와의 공식 명세서가 확인되지 않았으므로, 설계안(`docs/PLATFORM_API_INTEGRATION_PLAN.md` PAI-001~020) 기준 **'낮부 제안 계약'**으로 표시한다. 외부 합의 문서가 확정된 항목은 없다(가상 endpoint를 합의 명세로 보고하지 않음).

| 체계 | 관련 포털 기능 | 포털 처리 범위(신청·승인·상태표시) | 외부 수행 범위 | 계약 상태 | 현재 상태 |
|---|---|---|---|---|---|
| SSO·IdP (Keycloak OIDC) | 로그인·게스트 세션·RBAC 권한 조회(PAI-001~003, 015~016) | 로그인 세션·권한 판정·역할 할당 | 토큰 발급·계정 라이프사이클 | 낮부 제안 계약 | **부분 구현**(로컬 OIDC PoC 완료, `docs/KEYCLOAK_INTEGRATION.md`; staging 게스트 경로는 운영 제거 대상, ADR-003) |
| AI 플랫폼 | 작업환경 조회·모델 조회·반출 파일 전송(PAI-004, 009, 018) | 신청·승인·상태표시·프로브 | 작업환경 프로비저닝·추론·파일 수신 | 낮부 제안 계약 | 미연동(프로브 대상 등록만 가능) |
| 데이터 플랫폼 | 작업환경 조회·카탈로그 검색·반출 전송(PAI-005, 008, 019) | 신청·승인·상태표시·프로브 | 데이터셋·카탈로그 원천·전송 수신 | 낮부 제안 계약 | 미연동 |
| 클라우드·CMP | 프로젝트 생성/수정/삭제·크레딧/자원 사용량(PAI-006~007) | 프로젝트 신청·승인·실행상태표시 | 자원 프로비저닝·사용량 측정 | 낮부 제안 계약 | 미연동 |
| VDI | 플랫폼 진입(접근 정책·launch) | 접근 정책·진입 감사 | 세션 발급·데스크톱 제공 | 낮부 제안 계약 | 미연동(진입 정책만 구현) |
| 보안/K-RMF | 반입·반출 승인·증빙 동기화·감사(PAI-010~012) | 반입반출 승인 workflow·증적 원장 | 보안 검사·승인 최종 판정 | 낮부 제안 계약 | 부분 구현(포털 원장·멱등 완료, 외부 판정 미연동) |
| 의미검색엔진 (OpenSearch) | 통합검색 원천(PAI-020) | 검색 BFF·원천 상태표시 | 색인·검색 실행 | 낮부 제안 계약 | 부분 구현(BFF 경로만, 원천 연동 대기 표시) |
| 메일 | 승인·알림 통지 | 알림 대상·사유 확정 | 발송 인프라·템플릿 | 낮부 제안 계약 | **미구현**(포털 backend에 SMTP/메일 모듈 없음) |

현재 상태 정의: `미연동`(외부 호출 경로 없음) / `연동 대기`(프로브·BFF 등 포털 준비 완료, 외부 주소·자격 미등록) / `계약 시험 가능`(양측 계약 검증 실행 가능).

## 2. 포털 측 준비 완료 항목(코드 근거)

- **통합검색 BFF**: `GET /api/portal/v1/search` — 포털 자체 원천(menu/project/organization/user) 실조회, 외부 원천(데이터셋·모델·Docker·PyPI·의미검색)은 `source_status: 'integration_pending'` + '외부 원천 연동 대기'로 표시. 근거: `packages/backend/src/modules/portal/services/portalSearch.ts:5,58-96`, `routes/portalSearch.ts`. 브라우저 임의 DSL/index 전달은 금지된 단일 경로(ADR-005; 예전 `/api/proxy/search` raw proxy는 제거됨).
- **크레딧 사용량 추이**: 외부 측정치가 없으므로 `measured: false`로 반환하고, 프런트는 '측정 전' 상태를 렌더링한다(가짜 수치 표시 없음). 근거: `packages/backend/src/modules/portal/services/credits.ts:372-375`, `packages/app/src/components/credit-manager/CreditUsageTrendPanel.tsx:72`.
- **카탈로그 실행상태**: 신청 건은 `execution_status: 'pending_platform'`('실행환경 생성 대기(플랫폼 연동 전)')로 저장·표시. 근거: `packages/backend/src/modules/portal/routes/catalog.ts:362`, `services/catalog.ts:21`, `migrations/portal/20260929000020_domains.js:22,217`, 라벨 `packages/app/src/components/service-catalog/catalogServerData.ts:29`.
- **플랫폼 접근 정책·진입 감사**: 테넌트별 접근 정책 CRUD(버전 충돌 409, advisory lock), 사용자별 진입 판정과 감사 이벤트(`platform.launch`). 근거: `packages/backend/src/modules/portal/routes/platformAccess.ts`, `services/platformAccess.ts`.
- **연계 프로브(계약 시험 도구)**: 등록된 HTTPS 목적지에 대한 connection/contract 프로브 — 허용 경로 목록·GET 전용·서버 토큰·8초 timeout·64KB 상한·리다이렉트 금지·응답 비식별화·감사 기록. 근거: `packages/backend/src/modules/portal/routes/integrations.ts`, `services/integrationProbe.ts`. 목적지 등록은 배포 환경변수 `PORTAL_INTEGRATION_TARGETS`(테넌트별 JSON) — 현재 저장소 어디에도 값이 등록되지 않아 **모든 테넌트는 미등록 상태로 'blocked' 응답**.

## 3. outbox·idempotency 실태(코드 검색 확인)

| 항목 | 스키마 | producer/consumer 사용 | 판정 |
|---|---|---|---|
| `fc_idempotency_keys` | `migrations/portal/20260915000001_init.js:185-195` | **구현됨** — `services/krmf.ts:81-121` `idempotent()` 헬퍼가 8개 K-RMF 집행 경로에서 사용(`krmf.ts:1104,1230,1402,1489,1624,1701,2044,2113`). 반입반출·업무요청은 원장의 `idempotency_key` 컬럼 조회 방식(`services/transfers.ts:111`, `services/workRequests.ts:266`) | 구현됨 |
| `fc_outbox_events` | `migrations/portal/20260915000001_init.js:171-183`(pending/leased/done/failed, retry_at, lease_until) | **미구현** — backend 전체 코드 검색 결과 producer·consumer·worker 코드 없음. `plugin.ts:13` 주석의 'outbox 모듈로 분리(점진 확장)'와 ADR-008(업무+감사+outbox를 한 트랜잭션에 저장, worker는 별도 프로세스)는 결정만 존재 | 미구현(스키마만 존재) |

**outbox 후속 작업(필수 업무):**
1. outbox 이벤트 발행 producer 추가 — 외부 연동이 필요한 상태 전이(반입반출 승인, 프로젝트 생성, 크레딧 차감 등)에서 업무 변경과 같은 트랜잭션에 이벤트 insert(ADR-008).
2. consumer/worker 프로세스 구현 — lease·retry·dead-letter 정책 정의, BFF와 독립 실행(Cloud Run Job+scheduler / on-prem systemd).
3. `fc_outbox_events` 상태 전이 시험(§4의 중복·역순·지연 시나리오)과 함께 검증.

## 4. 계약 시험 범위

**포털이 이미 커버하는 시나리오**(`services/integrationProbe.ts` 기준, 프로브 도구로 즉시 적용 가능):

| 시나리오 | 지원 | 적용 가능 체계 | 비고 |
|---|---|---|---|
| 정상(구조 응답 수신) | `outcome: passed` + 비식별화 구조 | 전체 | contract 프로브, `readPaths` 허용 경로 |
| timeout | 8초 AbortController → `failed` | 전체 | `elapsedMs` 측정 포함 |
| 권한 거부/인증 누락 | HTTP 4xx → `failed` | 전체 | 서버 토큰 미등록 시 `blocked` |
| 오류 응답 | 비-2xx → `failed`(HTTP 상태 사유 기록) | 전체 | 감사 `reason_code: http_*` |
| 리다이렉트 | 따라가지 않고 `blocked` | 전체 | 최종 주소 등록 요구 |
| 부분 실패·중복/역순 이벤트·지연 | 미커버 | — | outbox/worker 미구현으로 불가(§3 후속 완료 후 적용) |
| 재시도 | 미커버(프로브는 1회성) | — | `fc_outbox_events.attempts/retry_at` 설계 반영 필요 |

**계약 서버(운영 앱과 분리) 준비 상태: 미준비.** 현재는 `runIntegrationProbe`의 `fetcher` 주입 단위테스트(`services/integrationProbe.test.ts`)만 존재하며, 별도 목 계약 서버(Pact·WireMock 계)는 없다. 계약 시험 본격화 전에 운영 BFF와 분리된 목 서버(또는 스테이징 대응체) 준비가 필요하다.

## 5. 외부 실연동에 필요한 자료(외부 담당으로부터 수령)

1. **endpoint 명세** — 기본 URL, 메서드별 경로, 요청/응답 스키마, 버전 정책(공식 명세 없음 — 현재 `docs/PLATFORM_API_INTEGRATION_PLAN.md`의 PAI 목록은 PoC 설계안일 뿐).
2. **인증 방식** — 클라이언트 자격 발급 주체, 토큰 형식·만료, 서버 측 secret 참조 방식(포털은 `PORTAL_CONNECTOR_*_TOKEN` 명명 환경변수만 허용, `services/integrationProbe.ts:63-67` 규칙 준용).
3. **callback/webhook 규격** — 이벤트 타입, 페이로드 스키마, 서명/재시도 정책(outbox 설계와 정합 필요).
4. **망별 허용 대역** — 낮부 업문망 기준 출발지/도착지·포트·TLS 요구사항, 폐쇄망(on-prem 프로파일, ADR-006·ADR-009 Kong 경계) 배포 시 라우팅.
5. **담당 역할** — 체계별 인터페이스 담당자, 보안 검토 담당자, 계약 변경 시 통지 절차.

위 자료 확정 전까지 모든 외부 원천은 `integration_pending`/`pending_platform`/`measured: false` 상태를 유지하고, 실제 수치·endpoint를 합의된 것으로 표시하지 않는다.
