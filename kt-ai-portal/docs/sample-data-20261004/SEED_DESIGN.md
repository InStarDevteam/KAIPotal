# 고객 시연용 합성 데이터 설계 — 2026-10-04

기존 Cloud SQL PostgreSQL의 `portal` 스키마에 **기존 업무 테이블 25개, 합성 업무행 74개**를 추가하는 설계다. 실제 적재가 발생한 경우에만 `fc_audit_events`에 시스템의 `sample.import` 이벤트 1개를 남긴다. 이 문서는 적재 코드·검증 범위를 설명하며 운영 적재 결과는 별도 실행 보고서로 확인한다.

공식 국방 MDR의 등록 식별자·승인 메타데이터·기관 코드 원본은 확보되지 않았다. 따라서 기존 스키마를 임의로 국방 표준으로 인증하거나, 합성 K-RMF 통제를 공식 기준선으로 주장하지 않는다. 이번 작업은 기존 요구기능과 데이터형·식별자·관계·시간·테넌트 분리 원칙을 유지하는 선행 시연 작업이다. 신규 MDR 준비용 사전·코드·매핑 데이터는 별도 설계와 적재 범위다.

## 데이터 원칙

- 기존의 활성 테넌트·활성 사용자·현재 유효한 소속만 사용한다. 테넌트, 계정, 외부 인증 연결, 소속, 역할, 권한, 플랫폼 접근 정책, 사용자 프로필은 생성하거나 수정하지 않는다.
- 프로젝트 내부의 관리자 멤버십은 합성 프로젝트에만 추가한다. 기존 시스템 권한을 확대하지 않는다.
- 조직과 그룹은 계층 조회 시연을 위해 부모·자식 각 1개, 총 4개 노드만 추가한다. 코드에 `SAMPLE-`을 사용하며 기관 조직코드가 아니다. 실제 사용자에게 조직·그룹을 배정하거나 그룹 멤버십·역할·위임을 추가하지 않는다.
- 이름·제목·신청 사유·본문·설명·이력 메모에 `[시연 샘플]`을 표시한다. 실제 군 자료, 개인정보, 군번, 작전·장비 정보는 사용하지 않는다.
- `tenant UUID + 고정 샘플 batch + 논리 이름`을 RFC 4122 UUID v5로 계산한다. 서로 다른 테넌트는 서로 다른 ID를 갖는다. 동일 테넌트에서 같은 batch를 다시 실행해도 중복행을 만들지 않는다.
- 고정 batch는 `kai-customer-sample-20261004-v1`, 합성 기준시각은 `2026-10-04T00:00:00.000Z`다. 실제 적재 감사 시각은 DB의 `clock_timestamp()`를 사용한다.
- 합성 과거 상태는 실제 사용자 행동 이력으로 감사 원장에 꾸미지 않는다. 공통 신청 메모는 `actor_user_id = NULL`, `action = commented`로 합성 상태 적재임을 밝힌다. 실제 운영 사용 중 발생한 행동은 기존 BFF 감사 기능이 기록한다.
- 플랫폼 실행·실측 자원량·기관 IdP 세션·실제 반입반출·공식 보안 인가를 완료했다고 표시하지 않는다.

## 테이블별 계획

| 기능 | 테이블 | 행 수 | 시연 상태·연결 |
|---|---|---:|---|
| 합성 조직 계층 | `fc_organizations` | 2 | 부모·자식 노드; 실제 사용자 소속 미배정 |
| 합성 그룹 계층 | `fc_groups` | 2 | 부모·자식 노드; 그룹 멤버십·역할·위임 없음 |
| 프로젝트 | `fc_project` | 3 | 활성 2개, 종료 1개; 모두 멤버 공개 |
| 공통 프로젝트 원장 | `fc_projects` | 3 | 프로젝트 도메인과 동일 UUID |
| 프로젝트 멤버 | `fc_project_member` | 3 | 기존 사용자에게 샘플 프로젝트 manager |
| 공통 프로젝트 멤버 | `fc_project_members` | 3 | 기존 사용자에게 샘플 프로젝트 owner |
| 공통 신청 | `fc_work_requests` | 7 | 개발환경 4상태 4개 + 카탈로그 신청 연결 3개 |
| 신청 메모 | `fc_request_events` | 7 | 실제 승인이 아닌 합성 상태 데이터 적재 메모 |
| 서비스·도구 카탈로그 | `fc_catalog_item` | 6 | tool/service/dataset/model; 신청 5개, 실제 공개 안내문 링크 1개 |
| 카탈로그 신청 | `fc_catalog_application` | 3 | requested/approved/rejected; 모두 pending_platform |
| 크레딧 계정 | `fc_credit_account` | 1 | 합성 프로젝트 전용; 사용자·테넌트 기존 잔액은 사용하지 않음 |
| 크레딧 거래 | `fc_credit_transaction` | 4 | grant/charge/deduct/adjust; 합계 108,000 C |
| 크레딧 상품 | `fc_credit_product` | 3 | 가상 CPU/GPU/저장공간 단가; 실제 계약단가 아님 표기 |
| 크레딧 신청 | `fc_credit_request` | 3 | requested/rejected/cancelled; 실제 지급 없는 원장 예시 |
| 반입반출 신청 | `fc_transfer_request` | 4 | requested/in_review/supplement_requested/rejected; 파일·승인 버전 없음 |
| 제안 | `fc_proposal` | 4 | submitted/under_review/answered/notice |
| 제안 답변 | `fc_proposal_review` | 2 | 합성 답변과 합성 안내 |
| K-RMF 기준선 | `fc_krmf_baseline` | 1 | draft, sample-0.1, 공식 기준선 아님 |
| K-RMF 통제 | `fc_krmf_control` | 5 | SAMPLE-* 코드; 적용/제외/대체, verified 없음 |
| K-RMF 증적 | `fc_krmf_evidence` | 1 | 실제 공개 합성 안내문 URI, pending 검토 |
| K-RMF 조치 | `fc_krmf_action` | 2 | open/in_progress |
| K-RMF 변경 | `fc_krmf_change` | 1 | recorded, 샘플 통제 재평가 검토 |
| TRR 체크 | `fc_krmf_trr_check` | 2 | not_ready, evidence_ready=false |
| 평가 질의 | `fc_krmf_eval_record` | 1 | open query, 평가기관 질의·인가 결과 아님 |
| 추적 관계 | `fc_krmf_control_link` | 1 | SAMPLE-* 시험 참조, unresolved |
| 실제 적재 감사 | `fc_audit_events` | 조건부 1 | INSERT가 발생할 때만 system/sample.import |

합성 프로젝트는 `공개문서 분류 모델 검토`, `합성 데이터 품질 점검`, `종료된 포털 화면 검토`다. 별도의 실증 사업 관리 기능이나 요구하지 않은 과제 원장은 추가하지 않는다.

카탈로그 신청은 공통 업무 신청과 `work_request_id`, `payload.refType = catalog_application`, `payload.refId`로 연결한다. 크레딧·반입반출은 각 도메인 원장을 그대로 사용하며 공통 신청에 중복 복사하지 않는다. 기존 업무 첫 화면이 각 원장을 합산한다.

크레딧 시연은 프로젝트 계정 선택 후 이용한다. 거래는 `+100000 +25000 -18000 +1000 = 108000`이며 차감 단가·수량 `3000 × 6 = 18000`도 일치한다. 단가와 거래 사유에 합성값임을 표시한다. 실제 과금 계약·CMP 자원 계량·사업비를 의미하지 않는다.

## 실제 파일과 외부 연동 경계

참조 증적 및 직접 링크 카탈로그는 아래 실제 배포 대상 텍스트 안내문을 가리킨다.

`https://kai-platform-d0ae0.web.app/sample-data/portal-reference-20261004.txt`

텍스트는 합성 데이터 설명이며 공식 증적이 아니다. 실제 파일 바이트와 영구 저장소가 없는 `fc_krmf_file`, `fc_transfer_file` 행은 생성하지 않는다. 반입반출 샘플을 승인 상태로 만들지 않는다. 실제 파일 제출·검사·망 간 전송·수신 확인은 저장소와 플랫폼 연동 후 정상 신청 흐름으로 수행한다.

작업환경과 카탈로그의 승인 샘플도 `pending_platform`이다. 승인 원장 시연과 실제 서비스 프로비저닝을 구분한다. `provisioning`, `connected`, 실제 자원 사용량을 만들어 넣지 않는다. 기관 SSO의 활성 세션도 임의로 DB에 넣지 않는다.

## 실행과 재실행

코드: `scripts/seed-customer-sample.mjs`.

기본 실행은 **read-only transaction의 dry-run**이다. 검토된 DB 접속정보는 `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` 환경변수로 제공한다. 명령행·보고서에 비밀번호를 남기지 않는다.

```sh
node scripts/seed-customer-sample.mjs \
  --tenant-id EXISTING_TENANT_UUID \
  --user-id EXISTING_USER_UUID \
  --report docs/sample-data-20261004/evidence/sample-seed-plan.json
```

내용을 검토한 후 동일 명령에 `--apply`를 명시하면 INSERT한다. `NODE_ENV=production`이면 추가로 `ALLOW_CUSTOMER_SAMPLE_SEED=true`가 필요하다. `--public-base-url HTTPS_URL`은 시험 환경의 실제 안내문 주소를 지정할 때 사용한다.

적재는 다음 조건을 모두 만족해야 한다.

1. 기존 활성 테넌트·활성 사용자와 현재 유효한 활성 소속이 있다.
2. 계획한 테이블·컬럼이 존재한다. 미적용 migration을 자동 실행하지 않는다.
3. 같은 샘플 PK가 있다면 tenant와 소유·batch 식별자가 일치한다. 충돌이면 기존행을 수정하지 않고 실패한다.
4. 계획행과 기존 수정행을 포함한 모든 유효 데이터의 프로젝트·카탈로그·신청·계정·기준선·통제·파일 부모가 존재하며 같은 tenant다.
5. `affected_control_ids`, 카탈로그 `payload.refId` 등 JSON 참조도 검증한다. 사용자 참조마다 실제 사용자와 해당 tenant 소속이 존재한다.
6. 샘플 크레딧 계정·원장이 일부만 존재하면 복원을 거절한다. 이미 UI에서 변경한 잔액과 거래를 자동 복원해 손상시키지 않는다.

쓰기 시 같은 tenant/batch의 advisory transaction lock을 사용한다. 모든 행과 실제 적재 감사는 하나의 트랜잭션에서 INSERT한다. 자연키 충돌을 포함한 실패는 전체 rollback한다. 기존행을 UPDATE/DELETE하지 않는다.

샘플을 고객이 UI에서 수정·승인·반려한 뒤 재실행해도 기존 제목·상태·버전·잔액을 유지한다. 완전 적재 이후 재실행은 추가 0행, 추가 감사 0행이다. 같은 ID의 소유자 충돌·다른 tenant 참조가 발견되면 자동 수정하지 않고 중단한다.

자동 삭제·초기화 명령은 제공하지 않는다. 고객이 샘플을 수정해 만든 신청·거래·증적을 삭제할 수 있기 때문이다. 초기화가 필요하면 원장 관계와 실제 사용 여부를 검토한 별도 복구 절차가 필요하다.

## 검증

`node scripts/test-customer-sample.mjs`는 원격 DB를 거절하고 로컬 임시 PostgreSQL DB·NOBYPASSRLS runtime 역할을 생성한다. 테스트 후 DB·역할·라우터 임시 파일을 삭제한다. 증거: `evidence/customer-sample-tests.json`.

**23개 검증 전부 통과**했다.

- 계획 74행/25테이블, 결정적 UUID, 합성 표기, 기본 dry-run 무쓰기
- 현재 소속 없는 사용자 거절, 신원·소속·권한·접근정책·프로필 및 기존 프로젝트 보존
- 자연키 충돌의 전체 원자 rollback, 동일 ID 소유자 충돌 거절
- 멱등 재실행, 고객이 수정한 제목·버전 보존
- 프로젝트 양원장 및 멤버 관계, 카탈로그 신청과 승인함 연결
- 거래 합계·잔액 일치, 기존 사용자·테넌트 계정 미변경
- 공식 보안 인가·플랫폼 실행·실제 파일 원장·전송 완료를 생성하지 않음
- context 없음 및 다른 tenant에서 25테이블 조회 0행
- 기존 샘플의 타 tenant 부모·JSON 통제 참조 및 미소속 사용자 참조 거절
- 합성 조직·그룹 각각 부모·자식 계층 2행과 `SAMPLE-` 코드 확인, 실제 사용자 소속·그룹 멤버십·권한 무변경
- 실제 BFF runtime 역할로 **19개 API 조회·집계·검색** 정상, 크레딧 `balanced=true`
- 실제 카탈로그 승인 API의 연결 원장 갱신과 `pending_platform` 유지
- 실제 크레딧 승인 API로 30,000 C 증가 후 잔액 138,000 C·거래 합계 일치, 중복 승인 409, seed 재실행 후 보존
- 실제 업무 반려·증적 검토 API 동작 및 seed 재실행 후 결정 상태 보존

이 시험은 임시 DB에서 수행했다. 테스트 초기화에 필요한 사용자·역할·권한 fixture는 시험 DB에만 생성했고, 실제 샘플 적재 코드에는 그런 동작이 없다. 운영 배포·운영 적재·공개 사이트 전수검증 결과는 최종 배포 보고서에서 별도로 확인한다.
