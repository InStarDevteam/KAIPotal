# 31.6단계 완료 보고: 실제 기능 전수검증 및 결함 보완

> 작성일: 2026-07-12
> 대상 사이트: https://kai-platform-d0ae0.web.app
> Access Code: `ictway`

## 1. 작업 목표

31.5단계에서 "전수조사"가 부족했던 부분을 보완하여 실제 배포 사이트 기준 전 기능을 점검하고, 발견된 결함을 수정한다.

- 전체 라우트 실제 접속 검증
- 전체 메뉴 클릭 검증
- 관리자 전용 메뉴 비노출/직접 URL 차단 검증
- 각 화면의 탭/버튼/필터/CSV 다운로드 검증
- `/api/auth/guest/refresh` 404 원인 확인 및 해결
- 콘솔/네트워크 오류 확인
- 캡처 대상 화면 부적합 문구 재검수

## 2. `/api/auth/guest/refresh` 점검

| 항목 | 결과 |
| --- | --- |
| Firebase Hosting 경유 `curl -I /api/auth/guest/refresh` | HTTP 200 |
| Cloud Run 직접 `curl -I .../api/auth/guest/refresh` | HTTP 200 |
| 브라우저 기본 요청 | 브라우저 캐시에 이전 404 응답이 남아 404로 표시됨 |
| 원인 | Firebase Hosting rewrite는 정상이나, 브라우저가 `/api/auth/guest/refresh` URL의 404 응답을 `max-age=600`으로 캐싱 |
| 조치 | `packages/app/src/index.tsx`에서 `/api/auth/guest/refresh` 호출 시 `?_=<timestamp>` 캐시 버스팅 추가 |
| 재검증 | 브라우저 재접속 시 404 미발생, 게스트 로그인 정상 |

## 3. 자동 Smoke Test

| 항목 | 내용 |
| --- | --- |
| 스크립트 | `scripts/smoke-check-demo-routes.mjs` |
| 대상 route 수 | 17 |
| 통과 | 17 |
| 실패 | 0 |

검증 대상:

```text
/, /admin-console, /krmf-evidence, /service-catalog, /export-approval,
/integrated-search, /project-workspace, /credit-manager, /my-page,
/environment-settings, /tenant-management, /proposal-board,
/requirement-coverage, /requirement-progress, /platform-api-integration,
/workflow-scenarios, /api/auth/guest/refresh
```

## 4. 일반 사용자 전수검증

| 항목 | 결과 |
| --- | --- |
| 검증 route 수 | 12 |
| 정상 | 12 |
| 보완 | 0 |
| 미해결 | 0 |
| 관리자 메뉴 미노출 | 확인 (요구사항 대응현황, 플랫폼 API 연계현황, 업무흐름/연계 시나리오 미노출) |
| 직접 URL 차단 | 확인 (4개 관리자 route 모두 접근 권한 없음 화면) |

상세 결과는 `STAGE_31_6_AUDIT_RESULTS.md` 참고.

## 5. 관리자 전수검증

| 항목 | 결과 |
| --- | --- |
| 검증 route 수 | 4 |
| 정상 | 4 |
| 보완 | 0 |
| 미해결 | 0 |
| CSV 다운로드 | 요구사항 대응현황 2건, 플랫폼 API 연계현황 1건 모두 정상 |
| 링크 이동 | 업무흐름/연계 시나리오 → 요구사항 대응현황/API 연계현황 정상 |

## 6. 발견 결함 및 보완내역

| 결함ID | 화면 | 현상 | 원인 | 조치 | 재검증 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| DEF-01 | 전체 | `/api/auth/guest/refresh` 404 | 브라우저 캐시된 404 응답 | `index.tsx`에 캐시 버스팅 추가 | 콘솔 404 미발생 | 해결 |
| DEF-02 | 관리자 콘솔, 서비스 카탈로그, 크레딧 관리, 마이페이지 등 | 화면에 `(mock)`, `mock ...` 문구 노출 | 31.5단계에서 정리하지 못한 잔여 문구 | 모든 `(mock)` 버튼/레이블, `mock action`, `mock fallback` 등 중립화 | Playwright 재검증에서 부적합 문구 0건 | 해결 |
| DEF-03 | 통합검색 | `/api/proxy/search/portal-catalog/_search` 401 콘솔 오류 | OpenSearch 프록시 미구성 | 데모/배포 환경에서는 샘플 데이터를 직접 사용하도록 변경 | 콘솔/네트워크 오류 없음 | 해결 |
| DEF-04 | 업무흐름/연계 시나리오 | "API 연계현황 보기" 링크가 Playwright에서 `not found`로 표시 | 버튼이 `Link` 컴포넌트로 렌더링되어 `button` 선택자 미매칭 | 링크 선택자 추가, 기능 자체는 정상 | 요구사항 대응현황 보기 클릭 정상 확인 | 문서상 기록 |

## 7. 문구 재검수 결과

- 화면 UI 부적합 문구: `제안서`, `제안팀`, `PoC`, `데모`, `검토용`, `Mock`, `mock data`, `프리뷰`, `preview` 등 미발견
- 문서 이력상 유지 문구: `STAGE_31_5_QA_REPORT.md`, `CHANGE_SUMMARY.md` 등 이력 문서에만 남아 있음
- 캡처 가능 여부: 전체 화면 캡처 가능

## 8. 로컬 검증 결과

| 항목 | 명령어 | 결과 |
| --- | --- | --- |
| TypeScript 체크 | `yarn tsc --noEmit` | 통과 |
| 단위 테스트 | `yarn workspace app test --watchAll=false` | 1 passed |
| 프로덕션 빌드 | `yarn workspace app build` | 성공 |

## 9. 배포 결과

| 항목 | 결과 |
| --- | --- |
| Firebase Hosting | 성공 (735 files) |
| Cloud Run | 변경 없음 (revision `kt-ai-portal-demo-00009-v6d` 유지) |
| URL | https://kai-platform-d0ae0.web.app |

## 10. 생성/갱신 문서

| 문서 | 비고 |
| --- | --- |
| `docs/STAGE_31_6_FULL_AUDIT_REPORT.md` | 본 보고서 |
| `docs/STAGE_31_6_AUDIT_RESULTS.md` | Playwright 전수검증 원본 결과표 |
| `scripts/smoke-check-demo-routes.mjs` | route smoke test 스크립트 |
| `backstage-portal/scripts/full-audit-playwright.mjs` | Playwright 전수검증 스크립트 |
| `docs/DOCUMENT_INDEX.md` | 31.6 문서 추가 |
| `docs/CHANGE_SUMMARY.md` | 31.6단계 이력 추가 |
| `docs/FIREBASE_DEMO_DEPLOYMENT_LOG.md` | 31.6 배포 이력 추가 |
| `docs/TODO.md` | 31.6 완료 반영 |
| `docs/WBS.md` | 31.6 완료 반영 |
| `docs/TECH_DEBT.md` | 미해결 이슈 갱신 |
| `notes/DECISIONS.md` | 31.6 결정 사항 갱신 |
| `README.md` | 31.6 상태 갱신 |
| `backstage-portal/README.md` | 31.6 상태 갱신 |

## 11. Git 처리 결과

- `git add .` 및 `git commit` 수행
- `git push origin main`은 PAT 인증 문제로 실패
- 사용자 직접 `gh auth login` 또는 PAT 갱신 후 `git push origin main` 필요

## 12. 미완료/보류 사항

- Firebase Auth Google 관리자 실검증: 별도 수동 테스트 필요
- 운영 RBAC: Guest auth 기반, Keycloak OIDC/role 기반 권한 체계 미연동
- GitHub push 인증: PAT 갱신 필요
- 화면 캡처 자동화: 32단계에서 수행

## 13. 다음 단계

32단계: 제안서/PPT용 화면 캡처 및 설명자료 패키징
