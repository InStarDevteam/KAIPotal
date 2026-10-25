# 실제 배포 상태 — 2026-09-16

| 구성 | 상태 | 증거 |
|---|---|---|
| Firebase Hosting 본 사이트 | 배포 완료, 2026-09-16 11:12 UTC | https://kai-platform-d0ae0.web.app |
| Firebase preview | 배포/브라우저 검증 완료 | https://kai-platform-d0ae0--review-20260916-v9foxp15.web.app (7일 만료) |
| Hosting 실제 브라우저 | PASS23 | `evidence/ui-report.json`, `overview-desktop.png` 및 5해상도 캡처 |
| 신규 backend Linux image | 빌드/Registry push 완료 | Cloud Build `87c99fe0-0f65-4132-b461-a6f00d3e119a`, SUCCESS |
| Cloud Run 신규 revision | **배포 완료(2026-09-20)** | `kt-ai-portal-demo-p1rev1` LATEST 100% 서빙, `/api/portal/v1/health` 200(DB 연결 확인), smoke 17/17 |
| 추가 audit migration | **Cloud SQL 적용 완료(2026-09-20)** | `20260916000003_audit_append_policy.js` (0004 tenant_settings는 미커밋 WIP라 미적용) |

이미지: `asia-northeast3-docker.pkg.dev/kai-platform-d0ae0/kt-ai-portal/kt-ai-portal-demo:review-20260916-4148007-v1`

Digest: `sha256:0cf2065ef796340bc68d23e08487478bbf29ebe89c609ee69d7d7bcffe44c67a`

## backend 전환에 필요한 입력

기존 `portal_migrator`·`portal_runtime` DB 접속정보가 저장된 파일 경로 또는
Secret Manager 참조. 비밀번호 원문을 채팅/소스/이미지에 넣을 필요는 없다.
현재 프로젝트 Secret Manager에는 사용할 DB 비밀번호 secret이 확인되지 않았다.
기존 DB 비밀번호/계정/authorizedNetworks는 변경하지 않았다.

## 입력 확인 후 실행 순서

1. 기존 Cloud SQL 백업/스키마 상태와 runtime 권한 확인.
2. migration 계정으로 `scripts/run-portal-migrations.mjs` 실행(기존 2개는 재적용되지 않음).
3. runtime 비밀번호를 Secret Manager에 등록/참조하고 Cloud Run 서비스 계정에 해당
   secret 접근과 Cloud SQL Client 권한이 있는지 확인.
4. `scripts/deploy-staging-backend.sh` 실행:
   `GCLOUD_BIN`(설치된 gcloud 경로), `IMAGE_URI`(위 digest 권장),
   `PORTAL_DB_PASSWORD_SECRET`(secret:version), `PORTAL_DB_USER` 설정.
   스크립트는 Cloud SQL Unix socket, gen2, max3, no-traffic tag를 적용한다.
5. 후보 revision의 DB/schema health200(JSON)와 무인증 /me401 확인 후 traffic100%.
   이전 revision 기록으로 rollback 가능. 실제 로그인된 업무 요청은 별도 E2E가 필요하다.
6. `https://kai-platform-d0ae0.web.app/api/portal/v1/health` 실제 JSON 응답 확인.

공통 개인화와 대시보드 하단/기타 업무 화면에는 아직 fixture가 남는다.
정식 인증 exchange/사용자 등록·프런트 업무 API 연결 등은 `REVIEW_FINDINGS.md`의
후속 P1~P6 작업으로 구분한다. Hosting 배포와 이미지 빌드는 전 범위 운영 완료가 아니다.
