# KAIPotal 개발자 인수인계 패키지 (2026-10-01)

국방지능형플랫폼포털(Backstage 기반)의 최신 소스·배포 스크립트·산출 문서 묶음.

## 구성

| 경로 | 내용 |
|---|---|
| `kt-ai-portal/backstage-portal/` | 포털 전체 소스(프론트 `packages/app`, 백엔드 `packages/backend`, 설정 `app-config*.yaml`) |
| `kt-ai-portal/scripts/` | 배포·migration·검증 스크립트(`deploy-cloudrun-rest.mjs`, `run-portal-migrations.mjs`, `build-staging-image.sh` 등) |
| `kt-ai-portal/docs/final-completion/` | 최종 산출물: FP요구사항 개발결과 엑셀, 구현/시험 보고서, MDR 데이터사전, evidence |
| `kt-ai-portal/docs/production-upgrade/` | 운영 전환 문서(배포 현황, 아키텍처 결정, API 계약 등) |
| `kt-ai-portal/notes/` | 작업 메모 |
| `prompt/` | 개발 지시 프롬프트·기준 자료(FP요구사항 CSV, 원문검증메모) |
| `요구사항/` | 원본 견적서 PDF |

## 환경·실행

- Node 24(Corepack), Yarn 4.13.0. `cd kt-ai-portal/backstage-portal && yarn install && yarn build:all && yarn start`
- 로컬 백엔드는 7007, 프론트 3000. 운영 배포 설정은 `app-config.production.yaml`.

## 배포 현황(2026-10-01 기준)

- Firebase Hosting: https://kai-platform-d0ae0.web.app (신규 BFF 연결 프론트 배포 완료)
- Cloud Run 백엔드: `kt-ai-portal-demo`(asia-northeast3), revision `p1rev5`(신규 BFF 전체 포함) 100%, minInstance=1
- Cloud SQL: portal 스키마 migration 9개 전체 적용(09-29 krmf/domain_ledger/domains 포함). 참고: 09-24 migration의 withSchema 누락 결함은 소스에서 수정 완료, 운영 DB는 public→portal 스키마 이동 조치됨
- 로그인: 접근코드 `demo1234`(프론트 소스 하드코딩 폴 백) → 게스트 토큰(`/api/auth/guest/refresh`) → 포털 DB 신원 `user:development/guest`(tenant '국방부 공통', portal-admin)

## 제외된 것(필요 시 별도 전달)

- `.git` (최근 작업은 커밋 이력에 없는 미커밋 상태, 소스 자체가 최신)
- `node_modules`, `dist`, `.venv`, `.gcloud`(로컬 gcloud SDK) — 설치로 재생 가능
- `.secrets/portal-staging-db.sh` — **DB 비밀번호 포함, 보안상 별도 안전 경로로만 전달**
- 화면 캡처 PNG·대용량 디자인 에셋(`docs/assets`, `docs/portal-experience` 등)
