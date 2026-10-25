# 소스코드 작성지침 (CODING GUIDELINES)

> 보안등급: 낮음(낮) · 기준일: 2026-09-29 · 적용 대상: `backstage-portal/` 모노레포

## 1. 근거 문서와 적용 범위

본 지침은 아래 공식 공개 자료의 **판본·항목이 확인된 것**을 참고하되, 원문 규정과 이 프로젝트의 권고를 구분한다. 존재가 확인되지 않은 조항·문서번호·인증을 임의로 만들거나 인용하지 않는다.

**판본 확인된 공식 출처(전문 대조 아님 — 이 표현 그대로 사용):**

| 구분 | 출처 | 판본 | 이 프로젝트 적용 방식 |
|---|---|---|---|
| 원문 규정 | 무기체계 소프트웨어 개발 및 관리 매뉴얼(방위사업청) | 제2024-6호, 2024.12.26. 개정 | 요구사항 추적·형상관리·검토·시험·결함관리 관점을 웹 포털에 맞게 적용(§6) |
| 원문 규정 | 무기체계 소프트웨어 기술문서 작성가이드 | 동 게시물 부록 | 증적·문서 작성 방식 참고 |
| 원문 규정 | 소프트웨어 개발보안 가이드(KISA) | 게시 2021.11.29., 확인 첨부 2021.12.29.판 | 입력 검증·인가·오류처리 원칙 준용(§5) |
| 원문 규정 | JavaScript 시큐어코딩 가이드(KISA) | 게시 2022.12.30., 첨부 2023년 개정본 | §4~§5 규칙의 참고 근거 |
| 원문 규정 | 국방 정보화업무 훈령 | 제3166호, 2026.5.28. 시행(표제 기준, **최신 세부조항 미확인 — 명시**) | 낮부 정보화업무 절차 준용. 세부조항 인용 전 재확인 필요 |

**권고(프로젝트 자체 결정):** 이 지침의 §2~§8 중 코드 스타일·구조 규칙은 ADR(`docs/production-upgrade/ARCHITECTURE_DECISIONS.md`)과 실제 코드 관례에 근거한 프로젝트 권고이며, 위 원문의 직접 인용이 아니다.

**적용 제외 명시:** C/C++ 코딩 규칙(미사어, 포인터·메모리 관련 항목 등)은 웹 포털(TypeScript/React/Node.js)에 그대로 강제하지 않는다. 원문이 임베디드·체계 소프트웨어를 전제로 한 조항은 목적(요구사항 추적, 시험·결함 연결)만 적용하고 문법 규칙은 이 지침으로 대체한다.

## 2. 타입과 계약

- TypeScript `strict` 유지. `any`, `@ts-ignore`, `@ts-expect-error`, non-null assertion(`!`) 금지. 불가피한 narrowing은 타입 가드(`value is T`)로 표현한다. 실례: `packages/backend/src/modules/portal/services/integrationProbe.ts:32`(`safePath` 가드), `packages/app/src/components/integrated-search/SearchApiClient.ts:67`(`isSearchResultType`).
- 외부 입력(요청 body·쿼리·외부 응답)은 경계에서 schema 검증 후 사용한다. 런타임 검증 함수를 서비스 계층에 둔다. 실례: `validPlatformPolicy`·`validPlatformPreferences`(`packages/backend/src/modules/portal/services/platformAccess.ts`, `routes/platformAccess.ts:139,222`), `RawSearchQuery → ParsedSearchQuery`(`services/portalSearch.ts:27`). 검증 실패는 422 + 코드화된 오류 응답.
- 도메인 열거형은 `as const` 배열 + 유니온 타입으로 정의하고, 런타임 값과 타입이 항상 일치하게 한다. 실례: `TRANSFER_STATUSES`(`services/transfers.ts:21`), `CREDIT_TRANSACTION_TYPES`(`services/credits.ts:11`), `integrationPlatformIds`(`services/integrationProbe.ts:1`).
- 서비스 결과 타입은 `Result<T> = { ok: true; value } | { ok: false; code; message }` 판별 합집합으로 표현하고, 실패 코드를 문자열 유니온으로 제한한다. 실례: `TransferResult`(`services/transfers.ts:80`), `CreditResult`(`services/credits.ts:80`).

## 3. 책임 분리

- **UI(프런트 컴포넌트)**: 화면 렌더링과 사용자 입력 최소 검증만. 비즈니스 규칙·권한 판정을 프런트에 두지 않는다.
- **도메인 서비스(services/)**: 상태 전이, 금액 계산, 정책 판정. Express 요청 객체를 받지 않고 `trx`, `tenantId`, 입력 DTO만 받는다.
- **라우트(routes/)**: 인증·인가·입력 검증·트랜잭션 경계·감사 기록만. 업무 로직은 서비스에 위임한다.
- **repository(DB 접근)**: knex 쿼리는 라우트·서비스 내에서 직접 사용하되, 문자열 연결 금지 — knex 빌더·파라미터 바인딩만 사용한다. 실례: `whereRaw("p.name ILIKE ? ESCAPE '\\'", [pattern])`(`services/portalSearch.ts:243`).
- **외부 adapter**: 외부 호출은 허용 목록 기반 목적지·경로만 호출한다. 실례: `configuredTargets`는 배포 환경변수만 신뢰하고 tenant admin이 임의 프록시로 쓰는 것을 차단(`services/integrationProbe.ts:37-84`).

## 4. 명칭·상태·오류코드·단위 일관

- 상태값·오류코드는 스네이크케이스 고정 문자열, 프런트 표시명은 별도 라벨 맵에서 변환한다. 실례: `EXECUTION_STATUS_LABELS.pending_platform = '실행환경 생성 대기(플랫폼 연동 전)'`(`packages/app/src/components/service-catalog/catalogServerData.ts:29`).
- 금액은 문자열 decimal 소수점 4자리(`CREDIT_DECIMAL_SCALE = 4`)로 표현하고 연산은 `bigint`(소수 최소단위)로 수행한다. 실례: `toMinor`/`fromMinor`/`multiplyMinorHalfUp`(`services/credits.ts:4-61`).
- 응답 envelope는 `{ data, meta: { requestId, asOf, dataMode, sourceSystem, connectionState } }`와 `{ error: { code, message, requestId } }`로 통일한다. 실례: `routes/platformAccess.ts:25-31,54-63`.

## 5. 보안 (KISA 가이드 준용)

- **입력 검증**: 모든 외부 입력을 서버에서 재검증. 길이·형식·열거 범위를 제한한다. 실례: 연동 프로브 body의 키 화이트리스트·길이 상한(`routes/integrations.ts:59-69`).
- **SQL 주입**: 문자열 연결 금지, knex 파라미터화만 사용. LIKE 검색은 `ESCAPE '\'` 지정. 실례: `services/portalSearch.ts:243,253,270`.
- **서버 인가**: 모든 업무 엔드포인트는 `requirePermission` 통과, 기본 거부(`docs/production-upgrade/ARCHITECTURE_DECISIONS.md` ADR-004). 자기 역할 상승 금지. 실례: `routes/admin.ts:309-313`(본인에게 신규 역할 부여 403 `self_assignment_not_allowed`), 위임 범위 초과 금지(`admin.ts:337`).
- **XSS/CSRF**: 외부 원문을 `dangerouslySetInnerHTML` 없이 렌더링. 검색·메타 응답은 텍스트 필드로만 전달.
- **경로/URL 검증**: 외부 호출 경로는 `safePath`(`/` 시작, `..`·`//` 금지)와 허용 패턴 목록 통과만 사용. 실례: `services/integrationProbe.ts:32-36,86-93`. 리다이렉트 응답은 따라가지 않는다(`integrationProbe.ts:212`).
- **업로드 제한**: 크기 상한·MIME 허용 목록·SHA-256 무결성 검증. 실례: `TRANSFER_FILE_MAX_BYTES`(100MB)·`TRANSFER_FILE_MIME_ALLOWLIST`(`services/transfers.ts:52-70`).
- **secret 외부화**: 토큰·비밀번호는 코드·저장소에 금지. 환경변수·Secret Manager 참조만 사용하고, 응답에는 비식별화된 구조만 반환한다. 실례: `tokenEnv`(`PORTAL_CONNECTOR_*_TOKEN` 명명 강제, `services/integrationProbe.ts:63-67`), `responseShape` 민감키 마스킹(`integrationProbe.ts:97-116`), `app-config.production.yaml:37-43`의 `${POSTGRES_PASSWORD}` 참조.

## 6. 신뢰성 — 시간·재시도·동시성·멱등성·감사

- **예외 삼키기 금지**: 빈 `catch {}` 금지. 처리하지 못하면 실패 코드/로깅으로 드러낸다. 모든 오류 응답에 요청 식별자(`requestId`) 포함. 실례: `services/middleware.ts:41-45`(`randomUUID` 요청 ID 생성·오류 응답 통일).
- **시간·timeout**: 외부 호출은 상한 시간(`AbortController`, 프로브 8초·응답 64KB 상한)과 `elapsedMs` 측정을 둔다(`services/integrationProbe.ts:194-198,224-239`).
- **동시성**: 낙관적 락(버전 비교·409)과 advisory lock 사용. 실례: 플랫폼 접근 정책 버전 충돌 409(`routes/platformAccess.ts:164-168`), `pg_advisory_xact_lock`(`platformAccess.ts:150`).
- **멱등성**: 생성·승인·집행 API는 멱등 키(UUID)를 지원한다. 동일 키·다른 payload는 409. 실례: `idempotent()` 헬퍼(`services/krmf.ts:81-121`, 8개 집행 경로 사용), 반입반출·업무요청의 `idempotency_key` 컬럼 조회(`services/transfers.ts:111-116`, `services/workRequests.ts:266-269`).
- **감사 원자성**: 업무 변경과 감사 이벤트를 같은 DB 트랜잭션에 기록한다. 감사 INSERT 실패는 폐쇄 실패(fail-closed). 실례: `routes/integrations.ts:89-127`(프로브 시작·결과 각각 트랜잭션 내 기록), `routes/platformAccess.ts:193-203`. 감사 원장은 UPDATE/DELETE 금지(`migrations/portal/20260915000001_init.js:141-168`).
- **상태 전이**: 허용 전이를 명시적 매트릭스로 관리하고, 매트릭스 외 전이는 거부한다. 실례: `TRANSITIONS`(`services/transfers.ts:38-50`).
- **migration 안전성**: 기존 데이터 보존이 필요한 제약은 `NOT VALID` 추가 → 위반 검출 → `VALIDATE CONSTRAINT` 순서로 적용한다. 실례: `migrations/portal/20260929000010_domain_ledger.js:2,39,45`.

## 7. 의존성 관리

- `yarn.lock`과 `package.json`은 항상 일관되게 유지. 무관한 전면 업그레이드(메이저 버전 일괄 상향, 프레임워크 교체) 금지.
- Backstage 1.52.0·React 18·MUI v4·Node 22/24 기반 유지(ADR-001·ADR-007). 특정 업그레이드 필요 시 별도 단계로 계획·회귀시험 후 적용.
- 신규 라이브러리 도입 전 lockfile에 이미 존재하는지 확인하고, 목적이 같은 라이브러리를 중복 추가하지 않는다(현재 런타임 스키마 검증은 자체 검증 함수로 충분 — `zod` 등 신규 도입 보류).

## 8. 요구사항 추적과 코드 품질 문서화

- 요구사항 ID → 구현 → 시험 → 결함 → 증적 연결은 추적 매트릭스와 시험 보고서 문서(`docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md`, `docs/production-upgrade/REQUIREMENT_IMPLEMENTATION_MATRIX.csv`, `TEST_REPORT.md`)로 관리한다. 소스 파일에 대량의 추적 주석(요구사항 번호 나열)을 삽입하지 않는다.
- 이번 단계에서는 신규 설명 주석·JSDoc 작성을 보류한다. 파일 상단 기존 법적 고지·라이선스 헤더는 보존·삭제 금지. 코드 자체가 설명이 되게 한다(§2~§6의 명명·구조 규칙 준수로 대체).

## 9. 실제 코드 근거 예시

| 규칙 | 근거 파일 |
|---|---|
| 상태 전이 매트릭스 | `packages/backend/src/modules/portal/services/transfers.ts:38-50` |
| 자기 역할 상승 금지 | `packages/backend/src/modules/portal/routes/admin.ts:309-337` |
| decimal·멱등(BigInt 소수 4자리·멱등 키) | `packages/backend/src/modules/portal/services/credits.ts:4-61`, `services/krmf.ts:81-121` |
| 검색 ILIKE ESCAPE·파라미터 바인딩 | `packages/backend/src/modules/portal/services/portalSearch.ts:243,253,270` |
| migration NOT VALID→VALIDATE | `packages/backend/migrations/portal/20260929000010_domain_ledger.js:2,39,45` |
| 외부 호출 adapter(허용 목적지·timeout·비식별화) | `packages/backend/src/modules/portal/services/integrationProbe.ts:37-116` |
