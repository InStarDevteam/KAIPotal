# 군별 포털 설정 및 감사 API

경로는 `/api/portal` 기준이다. 검증된 Backstage 사용자 인증과 활성 포털 계정이 필요하며, 군별 API는 `x-portal-tenant-id`의 활성 소속을 서버에서 다시 확인한다. 역할과 권한은 DB가 원본이다.

| API                       | 동작·권한                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/me`              | 본인의 활성 소속과 소속별 `roles`, `permissions` 조회                                                                                   |
| `GET /v1/tenant-settings` | 선택한 군의 설정 조회. `portal.view` 필요                                                                                               |
| `PUT /v1/tenant-settings` | `expectedVersion`과 `branding`, `menus` 중 변경할 항목을 전달. 외관은 `settings.manage` 또는 `tenant.manage`, 메뉴는 `menu.manage` 필요 |
| `POST /v1/activity`       | `portal.view` 필요. `action`은 `page.view`, `session.start`, `session.end`만 허용. 화면 조회에는 활성 메뉴 ID인 `pageId`가 필요         |
| `GET /v1/audit-events`    | `audit.view` 필요. 선택한 군의 접속·사용·관리·권한 거부 이력과 필터 결과 요약 조회                                                      |

설정 응답은 `{tenantId, version, branding, menus}`다. 저장 이력이 없으면 군별 기본 설정과 `version: 0`을 반환한다. `branding`은 `primaryColor`, `accentColor`, `logoUrl`, `portalTitle`, `shortName`, `welcomeText`, `supportText`를 포함한다. `menus`는 활성 메뉴 전체의 `{id,label,visible,order}` 배열이다. 홈과 군별 포털 설정 메뉴는 숨길 수 없다. 메뉴 표시는 기존 접근 권한을 확장하지 않는다.

저장은 테넌트 단위 잠금과 버전 검증으로 동시 수정 충돌을 `409 version_conflict`로 반환한다. 설정 저장과 변경 필드명 감사기록은 같은 트랜잭션에서 처리한다. 색상은 6자리 HEX, 주색상은 흰색 대비 4.5 이상이어야 한다. 로고는 HTTPS 또는 `/`로 시작하는 동일 출처 경로만 허용한다. 문구는 HTML을 허용하지 않는다.

감사 조회 필터는 `from`, `to`(ISO 또는 UTC 날짜), `category`(`access|usage|admin|security`), `action`, `result`(`success|denied|failed`), `actor`(사용자 ID 또는 표시명), `search`다. `page`는 1부터 시작하고 일반 조회의 `pageSize`는 최대 200이다. 응답 `data`는 `{items,pagination,summary}`이며, `pagination.snapshot`은 이후 페이지에서 신규 이벤트의 시각 상한으로 사용할 수 있다. 이 시각 상한은 요청 사이의 데이터베이스 스냅샷을 유지하지 않으므로 내보내기에 페이지 순회를 사용하지 않는다.

내보내기는 `purpose=export&page=1&pageSize=10000`인 단일 요청으로 처리한다. 행과 집계를 같은 REPEATABLE READ 트랜잭션에서 조회하며 중간에 커밋된 이벤트도 결과를 바꾸지 않는다. 최대 10,001행을 확인하고 10,000건을 초과하면 `422 export_limit_exceeded`로 거부하여 부분 파일을 반환하지 않는다. 성공과 제한 초과 모두 별도 내보내기 감사기록을 남긴다. 더 큰 조회는 기간·조건을 좁혀 실행한다.

사용자 활동 수집은 `client.*` 액션과 `source: client`, `reasonCode: client_reported`로 구분한다. 인증된 수집 요청의 사용자·수신 시각을 서버가 부여하며 클라이언트가 actor, result, 서버 액션을 지정할 수 없다. 세션 시작·종료 신호는 브라우저가 보고한 사용 이력이며 인증 제공자의 로그인 성공·실패 증명이 아니다. 완전한 인증 감사에는 실제 인증 제공자 이벤트 수집 연계가 별도로 필요하다.

`20260918000001_tenant_settings.js` 마이그레이션이 필요하다. 기존 migration job으로 적용하고 런타임 계정에 새 설정 테이블의 DML 권한이 상속되는지 확인한다. 새 테이블은 RLS를 강제하며 감사 원장은 기존 UPDATE/DELETE 금지 정책을 유지한다. 운영 배포나 기존 업무 DB 수정은 이 변경의 검증 과정에 포함하지 않는다.

프로젝트 루트에서 `node scripts/test-portal-runtime.mjs`를 실행하면 로컬 PostgreSQL의 일회성 DB/런타임 역할로 검증한 뒤 정리한다. 검증 범위에는 교차 군 접근 차단, 필드별 관리 권한, 악성 입력, 동시 수정, 감사 실패 시 원자적 롤백, 감사 조회·내보내기·원장 변조 방지가 포함된다.
