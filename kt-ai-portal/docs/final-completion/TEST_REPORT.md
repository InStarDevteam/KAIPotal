# 시험 보고서 — 국방지능형플랫폼 포털 최종 기능 완성 (2026-09-29~30 실행분)

본 보고서는 2026-09-29~30에 로컬(Node 24, Yarn 4.13, PostgreSQL 16 docker, 일회성 DB)에서 재실행한 시험만 기록한다. 과거 문서의 시험 기록은 재인용하지 않는다. 전체 case 목록은 엑셀 `시험결과` 시트(54행)와 동일하다.

## 요약

| case ID | 시험 | 명령 | 결과 | 증적 |
|---|---|---|---|---|
| TEST-TSC-001 | TypeScript 전체 타입 검사 | `yarn tsc:full` | PASS (오류 0) | 실행 로그(2026-09-30) |
| TEST-BUILD-001 | 전체 빌드 | `yarn build:all` | PASS | 실행 로그(2026-09-29) |
| TEST-UNIT-BE-001 | 백엔드 단위시험 159건(services/*.test.ts: krmfDomain·krmfStorage·credits·transfers·projects·proposals·catalog·portalSettings·portalSearch 등) | `yarn workspace backend test` | PASS 159/159 | 실행 로그(2026-09-29) |
| TEST-UNIT-FE-001 | 프론트 단위시험 227건(app 컴포넌트 *.test.ts(x)) | `yarn workspace app test` | PASS 227/227 | 실행 로그(2026-09-29) |
| TEST-INT-RUNTIME-001 | portal-runtime 통합시험 48건(인증·정책·메뉴·감사·테넌트 차단 등) | `node scripts/test-portal-runtime.mjs` | PASS 48/48 | 실행 로그(2026-09-29) |
| TEST-INT-WORK-001 | work-api 통합시험 14건(워크스페이스·자원 신청·승인 원장) | `node scripts/test-portal-work-api.mjs` | PASS 14/14 | 실행 로그(2026-09-29) |
| TEST-MDR-001~005 | MDR 검증 637건(사전 커버리지 485·용어 58·코드 46·자료형 485·무결성) | `node scripts/verify-mdr-dictionary.mjs` | PASS 637/637, 예외 0 | `docs/final-completion/data/mdr-verification-result.json` |
| TEST-API-DOMAIN-S0-1~S16-1 | 신규 도메인 HTTP 시나리오 46건 | 도메인 시험 스크립트(결과 JSON 저장) | PASS 46/46 | `docs/final-completion/evidence/domain-api-tests.json` |

합계 1,133건 전부 PASS. FAIL 0, BLOCKED 0, NOT_RUN은 미구현 기능에 해당(개발점검표에서 시험상태 NOT_RUN으로 판정).

## 도메인 HTTP 시나리오 46건 (2026-09-30 실행, 전부 PASS)

| ID | 시나리오 | 관련 영역 |
|---|---|---|
| S0-1 | migration 9개 전부 적용 확인 | DB 기반 |
| S1-1~S1-3, S2-1 | K-RMF 기준선 생성·통제 등록(제외 사유 필수)·overview 집계 일치·빈 기준선 null 처리 | K-RMF 기준선 |
| S3-1~S3-4 | 증적 multipart 업로드·멱등 replay·검토 승인(버전 고정, 재처리 409)·이행률 50% 갱신 | K-RMF 증적 |
| S4-1~S4-3 | 검토 권한 없음 403·타 테넌트 차단·다운로드 원본 일치 | K-RMF 권한 |
| S5-1~S5-3 | 조치 등록(원인 필수)·overdue 필터·상태 전이 순서 강제 | K-RMF 조치 |
| S6-1~S6-2 | 운영변경 등록·재검토 요청·영향 통제 next_due 반영 | K-RMF 운영변경 |
| S7-1~S7-3 | TRR upsert·evidence_ready 반영·추적 링크 등록 | K-RMF TRR·추적 |
| S8-1~S8-3 | implementation/traceability/evidence CSV — BOM·한글·실제 수치 | K-RMF 출력 |
| S9-1~S9-3 | 크레딧 상품 등록·충전 신청 멱등·승인 후 잔액·원장 합산 대조 | 크레딧 |
| S10-1~S10-2 | 잔액 부족 409·사용량 추이 measured=false(가짜 수치 없음) | 크레딧 차감 |
| S11-1~S11-4 | 반출 신청(multipart·공개동의·보안등급)·승인 버전 고정·staleApproval 409·보완 후 재검토 전이 | 반출 |
| S12-1~S12-4 | 프로젝트 생성 멱등·멤버 중복 409·종료 차단 409+blockers·preserveOutputs 종료 | 프로젝트 |
| S13-1~S13-3 | 제안 멱등 등록·공감 토글 중복 방지·답변 후 수정 409 reviewed_locked | 제안 |
| S14-1~S14-2 | 카탈로그 항목 등록·신청 승인 후 execution_status=pending_platform 유지 | 카탈로그 |
| S15-1~S15-4 | 메뉴/프로젝트 검색·타 테넌트 0건·외부 원천 integration_pending·user 검색 권한 | 통합검색 |
| S16-1 | 주요 쓰기 감사 이벤트 4종 표본 확인 | 감사 |

## 실패·미실행·외부 차단 범위

- 실패: 없음.
- NOT_RUN(미구현이라 시험 불가): MPKI/인증서 로그인, 본인확인, 아이디/비밀번호 찾기, 비밀번호 만료 시 잠금, 유사도 검색, 마이페이지 비밀번호 변경·세션 강제 종료·API 키·알림 설정 — 개발점검표 해당 30행.
- 외부 차단(실연동 대기): AI/데이터/클라우드·CMP/VDI 실연동, 기관 SSO·MPKI·본인확인·메일, 외부 검색 원천 5종, 실측 사용량 수집 — 연동대기 시트 10체계.
- MDR·K-RMF: 기관 표준사전·공식 기준판 미수령으로 기관 기준 검증은 보류(ISSUE-010/011).
