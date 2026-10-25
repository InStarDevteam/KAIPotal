# 검증 결과

2026-09-24 / 로컬 검토 빌드 (`app-config.design-review.yaml`). 운영 사이트는 디자인 검토를 위해 읽었으며 배포하지 않았습니다.

| 항목 | 결과 | 근거 |
|---|---|---|
| TypeScript 전체 검사 (`tsc:full`) | 통과 | 라이브러리 타입 검사 포함 |
| 프런트엔드 빌드 | 통과 | 실제 캡처·브라우저 검증에 같은 빌드 사용 |
| 앱 단위 테스트 | 23 suites / 112 tests 통과 | [출력](evidence/frontend-tests.txt) |
| 백엔드 단위 테스트 | 2 suites / 20 tests 통과 | [출력](evidence/backend-tests.txt) |
| PostgreSQL runtime/API | 48 checks 통과 | [출력](evidence/runtime-tests.txt) · 일회성 로컬 DB, RLS·감사 원자성·권한·메뉴 레지스트리 일치 |
| 새 디자인·역할별 첫 화면 | 6 시나리오 묶음 통과 | [출력](evidence/experience-v2-tests.txt) · 4종 디자인, 6개 역할, 직접 이동, 프로젝트/탭 링크, 검색·새로고침, 모바일 겹침·가로 넘침 |
| 기존 포털 경험 | 16 시나리오 통과 | [출력](evidence/experience-regression.txt) · 로그인, 개인화, 앱 런처, 플랫폼 정책, 권한, 테넌트, 반응형, 요구사항 ID 비노출 |
| 테넌트 UI | 15 시나리오 통과 | [출력](evidence/tenant-ui-tests.txt) · 브랜딩, 메뉴 숨김/직접 접근 차단, 저장·복원, 감사, 군별 관리 범위 |
| 개발 관리자 UI | 8 checks 통과 | [출력](evidence/developer-console-tests.txt) · 기존 40개 계약, 샘플 검증, 오류, 이력/CSV, VDI, 반응형 |
| 기존 업무 CRUD | 10 checks 통과 | [출력](evidence/crud-tests.txt) · 로컬 브라우저에서 제안 등록/삭제, 카탈로그 요청, 반출 승인, 프로필 저장·새로고침 복원 |
| 앱 lint | 오류 0 / 경고 24 | 기존 `no-restricted-syntax` 경고는 남음 |
| 변경 공백 검사 | 통과 | `git diff --check` |

실제 브라우저 캡처: `evidence/after-*.png`, `mobile-*.png`, `work-*.png`. 신규 시나리오에서는 브라우저 런타임 오류가 발생하지 않았습니다.

검증 한계: 데모 업무 데이터·승인 저장은 브라우저 저장소 기준입니다. 운영 환경의 프로젝트 집계 API, 사용자 간 공유 승인함, 기관 인증 및 외부 플랫폼 서비스는 실제 연동 검증 대상이 아닙니다. 백엔드 권한 테스트 통과를 이러한 외부 서비스 연동 완료로 해석하지 않습니다.


---

# 추가 검증: 업무 현황 서버 연동 (2026-09-24, 동일 로컬 환경)

`/portal-work` 역할별 첫 화면의 백엔드 집계 연동(`/api/portal/v1/work/*`) 추가에 대해 같은 날 재실행한 검증. 계약은 `WORK_API_CONTRACT.md` 참조.

| 항목 | 결과 | 근거 |
|---|---|---|
| TypeScript 전체 검사 (`yarn tsc --noEmit`) | 통과(오류 0) | backstage-portal 루트 실행 |
| 앱 단위 테스트 | 24 suites / 130 tests 통과 | 서버 응답 매핑·오류 분류 단위 테스트 13개 포함(`workServerData.test.ts`) |
| 백엔드 단위 테스트 | 2 suites / 20 tests 통과 | 기존 기준 유지 |
| 업무 현황 API 통합 검증 | 14 checks 통과 | `scripts/test-portal-work-api.mjs` · 일회성 로컬 PostgreSQL: 서버 멤버십 기준 내 프로젝트, 감사 권한 게이트, 크레딧/자원 사용량 `pending_integration`(수치 미제조), 타 사용자 신청 → 권한 있는 승인함 노출, 비멤버 신청 403, 낙관적 락 충돌 409, 승인·이력·감사 원자 기록, 재결정 409, 교차 테넌트 RLS 차단, 유형별 승인함 분리, 커서 페이지네이션 |
| 기존 runtime/API 회귀 | 48 checks 통과 | `scripts/test-portal-runtime.mjs` · middleware 리팩터링 후 재실행 |
| 앱 lint | 오류 0 / 경고 24 | 기존 `no-restricted-syntax` 경고만 남음 |
| 프런트엔드 빌드 | 통과 | `app-config.design-review.yaml` 로컬 검토 빌드 |
| 신규·기존 브라우저 검증 | 통과 | `test-portal-experience-v2.mjs` 6 checks(4종 디자인·6 역할 직접 이동·모바일 넘침 없음), `test-portal-experience.mjs` 16 시나리오, `test-tenant-portal-ui.mjs` 15 시나리오, `test-developer-console-ui.mjs` 전체 PASS, 페이지 런타임 오류 없음 |

구현 범위: 신규 migration `20260924000002_work_requests.js`(프로젝트·멤버십·업무 신청 원장·신청 이력, 전 테이블 RLS), 라우터 `workOverview.ts`(overview/requests/approvals/decisions 6개 엔드포인트), 프런트 `PortalWorkPage.tsx` 서버 모드 데이터 경로(데모 모드 로직 변경 없음). PortalRuntimeContext의 `request`는 비-OK 오류에 `status`/`code`를 첨부해 호출측이 403 권한 거부와 일시 장애를 구분한다.

검증 한계: 서버 모드(!데모) 화면은 로컬 백엔드 없이 매핑 로직 단위 테스트 + 백엔드 통합 14건으로 검증했다. 브라우저 E2E로 비데모 렌더링을 보지 않았다. **2026-09-24 배포 완료**(Cloud Run `p1rev2` + Firebase Hosting + staging migration 3건 — `FIREBASE_DEMO_DEPLOYMENT_LOG.md` 참조): 라이브 `/v1/health` 200(live·connected), 미인증 401 확인, 라이브 로그인·CRUD 스모크 17/17 통과. 데모 사이트는 데모 모드라 서버 모드 경로는 비활성이다. 크레딧/자원 사용량은 여전히 플랫폼 원천 연동 대기 상태이며 수치를 대체 표시하지 않는다.
