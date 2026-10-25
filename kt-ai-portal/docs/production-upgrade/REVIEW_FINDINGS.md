# 전반 검토 결과와 개선 내역 — 2026-09-16

기준 소스 `4148007` 및 운영 전환 개발 지시문·시험 명세를 대조했다.
검토 범위는 앱 진입/인증/권한·모든 라우트, 공통 화면 구조·대시보드,
신규 portal BFF와 3개 migration, 실행/배포 설정, 기존 action inventory다.
모든 업무 버튼의 실제 운영 연동 완료를 뜻하지 않는다.

## 수정한 결함

| 우선순위 | 발견 | 수정/증거 |
|---|---|---|
| P0 | 비캡처 mode의 isAdmin은 서버 검증이 아니라 Firebase 이메일 목록이었다 | 이메일 기반 관리자 승격 제거. capture 전용 역할 전환만 보존 |
| P0 | RLS context 없는 RBAC/소속 조회와 context 설정 이전 membership 검사 | tenant 트랜잭션에서 먼저 context 설정, 서버 신원·유효 소속과 권한 확인. 실 runtime 계정 시험 |
| P0 | 시스템 역할의 타tenant 업무 권한 우회 | 선택 tenant 소속 필수. 전역 registry 운영은 향후 별도 범위 API로 구현 |
| P0 | membership 시작/만료, suspended 사용자, verified 신원 검사 누락 | 현재 유효한 계정/신원/소속/역할만 인정 |
| P0 | 감사 테이블 RLS에 INSERT 정책 없음 | 추가 migration `20260916000003_audit_append_policy.js`. runtime append-only 기록과 실패 원자성 시험 |
| P1 | 자기 권한 밖 역할 위임, 만료일 있는 역할 회수 실패, 마지막 관리자 회수 | 위임 권한 부분집합 확인·중복409·유효기간/사유 검증·관리자 잠금과 회수409 |
| P1 | Express4 async rejection 미처리 | 명시적 Promise→next(error), 정형500와 requestId |
| P1 | backend 직접 의존성 누락 | backend-plugin-api 1.9.2, express 4.22.2 직접 선언·lockfile 갱신 |
| P1 | Cloud Run용 portal DB 설정 누락 | Cloud SQL Unix socket + Secret Manager env + 제한 pool/timeout·schema health·shutdown 정리 |
| P1 | 화면 폭 `!important` 보정과 기능 없는 숨김/모바일 구조 | 단일 CSS grid·64px header·256/72/0 메뉴·모바일 Drawer·ESC/focus·검색/도움말 |
| P1 | 대시보드에 fixture 이름·날짜·집계·시스템 정상 표시 | 이름/날짜 제거, 상단 집계는 —, 업무 서비스 health 실제 요청 |
| P1 | 반출 신청이 console에 폼을 기록하고 실제 저장 없이 성공 alert | 로그 제거·미접수 안내와 입력 유지 |
| P2 | 기존 린트 오류 | 목록 필터/조건문/아이콘 import 등 동등 동작으로 정리. 전체 lint 통과 |

## 아직 구현/검증하지 않은 업무

- 현재 demo는 capture/Guest UI를 포함한다. Firebase 로그인→Backstage Guest는 운영 인증이 아니다.
  Keycloak 또는 Firebase의 정식 서버 exchange·회수·세션 정책과 실제 사용자 bootstrap이 필요하다.
- `/api/portal/v1/*`은 Backstage 인증 경계와 DB 인가를 사용한다. UI의 관리자/업무 폼 전체가
  이 API로 전환된 것은 아니다. 인증된 실사용자에 대한 UI→API→DB E2E는 미완료다.
- 대시보드 하단 공지/자산/프로젝트/크레딧/K-RMF 상세와 여러 기존 화면에는 fixture가 남는다.
  원천 데이터·집계로의 전환이 필요하다. 이번 배포는 운영 데이터 서비스 완료가 아니다.
- 개인 메뉴 상태는 현재 세션 내 상태다. tenant/user별 DB 선호·즐겨찾기·위젯 편집,
  테넌트 브랜드/메뉴 초안·게시·롤백, 모든 관리자 저장/세션 관리는 후속 P2다.
- 프로젝트/승인/크레딧/첨부/게시판 트랜잭션, durable worker/outbox,
  38개 실제 플랫폼 계약·검색 ACL/OpenSearch, K-RMF 증적은 P3~P5 범위다.
- 인증·DB·검색의 HA/복원·RTO/RPO·성능/보안분류/기관 보존정책은 미검증이다.
- 로컬 시험에서 인증 서비스는 결정적 fixture credentials를 주입한다. 실제 IdP 검증과
  PostgreSQL runtime/RLS/API 검증을 구별하며, OIDC 통과로 기록하지 않는다.

## 검증 중 발견한 문제

- 초기 타입 검사에서 Knex transaction 결과 타입 추론 오류와 unused import를 수정했다.
- 첫 프런트 build의 상대 config 경로 오류를 절대경로로 수정했다.
- 기존 backend build가 app build도 덮어쓰므로 앱→backend(--skip-build-dependencies) 순서를 고정했다.
- 기존 lint 오류 17건과 신규 backend 직접 의존성·비동기 처리 관련 오류를 해결했다.

## 보안/배포 경계

- 신규 migration은 INSERT 정책 추가만 한다. 기존 staging 데이터/계정/비밀번호는 변경하지 않았다.
- 원격 빌드는 전용 임시 context의 bundle/lockfile/config만 업로드한다. `.env`를 전송하지 않는다.
- 런타임 비밀번호는 `PORTAL_DB_PASSWORD` Secret Manager 참조로 주입한다.
- 무트래픽 후보 revision의 health JSON·무인증401 확인 후 100% 전환하도록 스크립트를 작성했다.
- 원본 완료 스크립트는 Telegram 알림 발송을 포함한다. 메시지 발송 승인이 없어 실행하지 않는다.
