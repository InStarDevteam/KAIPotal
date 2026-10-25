# Firebase + Cloud Run 데모 배포 체크리스트

## 사전 준비

- [ ] GCP 프로젝트 생성
- [ ] GCP 결제 계정 연결
- [ ] Firebase 프로젝트 생성(GCP 프로젝트와 연결)
- [ ] `gcloud` CLI 설치 및 인증 (`gcloud auth login`, `gcloud config set project <PROJECT_ID>`)
- [ ] `firebase` CLI 설치 및 로그인 (`firebase login`)
- [ ] Docker Desktop 또는 Docker CLI 설치
- [ ] 가비아 DNS 관리 권한 확인
- [ ] 사용할 서브도메인 결정(예: `demo.kbcosmos.com`)

## 로컬 검증

- [ ] `yarn install --immutable` 성공
- [ ] `yarn tsc` 성공
- [ ] `yarn build:all` 성공
- [ ] `yarn start`로 접근코드 게이트/데모 배너/기존 메뉴 정상 동작 확인
- [ ] `app-config.demo.yaml`의 `app.previewAccessCode` 값 확인

## 환경 변수

```bash
export GCP_PROJECT_ID=<gcp-project-id>
export FIREBASE_PROJECT_ID=<firebase-project-id>
export REGION=asia-northeast3
export CLOUD_RUN_SERVICE=kt-ai-portal-demo
export DEMO_DOMAIN=demo.kbcosmos.com
export PREVIEW_ACCESS_CODE=ictway
export AUTH_SESSION_SECRET=<랜덤 문자열>
```

- [ ] 모든 필수 환경변수 설정 완료
- [ ] `PREVIEW_ACCESS_CODE`가 제안팀과 공유된 값과 일치
- [ ] `AUTH_SESSION_SECRET`이 32바이트 이상의 강력한 랜덤 문자열

## Firebase 설정

- [ ] `.firebaserc.example` → `.firebaserc` 복사 및 프로젝트 ID 입력
- [ ] `firebase.json`의 `serviceId`가 `kt-ai-portal-demo`인지 확인
- [ ] `firebase.json`의 `region`이 `asia-northeast3`인지 확인

## 빌드

- [ ] `./scripts/build-demo.sh` 실행 완료
- [ ] Docker 이미지 `kt-ai-portal-demo:latest` 생성 확인

## Cloud Run 배포

- [ ] `./scripts/deploy-demo-cloudrun.sh` 실행 완료
- [ ] Artifact Registry에 이미지 push 확인
- [ ] Cloud Run 서비스 `kt-ai-portal-demo` 생성/업데이트 확인
- [ ] Cloud Run 서비스 URL이 `https://<sub>.kbcosmos.com`로 동작하는지 확인(초기에는 Firebase 연결 전 Cloud Run 직접 URL 사용 가능)
- [ ] Cloud Run 로그에서 backend 기동 오류 없음 확인

## Firebase Hosting 배포

- [ ] `./scripts/deploy-demo-firebase.sh` 실행 완료
- [ ] Firebase Console에서 Hosting 배포 이력 확인
- [ ] 커스텀 도메인 추가(`<sub>.kbcosmos.com`)
- [ ] Firebase가 제공한 CNAME 대상 값 확보

## DNS 연결

- [ ] 가비아 DNS 관리 콘솔 접속
- [ ] CNAME 레코드 추가(호스트: 서브도메인, 값: Firebase CNAME 대상)
- [ ] DNS 전파 대기(최대 24~48시간)

## 최종 확인

- [x] `https://kai-platform-d0ae0.web.app` 접속 시 접근코드 입력 화면 표시
- [x] 접근코드 입력 후 포털 대시보드 표시
- [x] 상단 데모 배너 표시
- [x] 주요 메뉴(통합검색, 프로젝트, 반출/반입, 크레딧, K-RMF, 관리자 콘솔 등) 정상 이동
- [x] 일반 사용자 상태에서 "요구사항 진도표" 메뉴 미노출
- [x] `/requirement-progress` 직접 접근 시 "접근 권한이 없습니다" 화면 표시
- [x] 관리자 프리뷰 모드에서 "요구사항 진도표" 메뉴 표시 및 페이지 접근
- [x] 요구사항 진도표 4개 탭(SFR별 진도표 21건, 기능목록 163건, 변경이력 13건, 질의사항 7건) 정상 표시
- [ ] 통합검색 mock fallback 결과 표시
- [ ] 모바일/데스크톱 브라우저에서 UI 깨짐 없음

## 29.1단계 추가 확인

- [x] Firebase Web App 설정값을 환경변수로 주입하여 빌드
- [x] `./scripts/build-demo.sh` 성공 (frontend/backend/Docker image)
- [x] `./scripts/deploy-demo-firebase.sh` 성공

## 29.2단계 추가 확인

- [x] Cloud Run backend 재배포 완료
- [x] Artifact Registry에 최신 image push 완료
- [x] Cloud Run revision `kt-ai-portal-demo-00009-v6d` 100% 트래픽 라우팅
- [x] `/api/auth/guest/refresh` 404 해소 (Cloud Run 직접 URL 200, Firebase Hosting rewrite 200)
- [x] 데모 사이트 일반 사용자/관리자 프리뷰 재검증 완료

## 보안/운영 체크

- [ ] 접근코드를 문서/메신저 외 안전한 채널로 제안팀에 전달
- [ ] 데모 URL을 제안팀 외 무단 공유하지 않음
- [ ] Cloud Run/Firebase 비용 모니터링 설정
- [ ] 데모 종료 후 Cloud Run 서비스 및 Firebase Hosting 비활성화 또는 삭제 계획 수립

## 알려진 제한

- [ ] 데모는 Guest 인증만 사용하며 Keycloak OIDC는 사용하지 않음
- [ ] OpenSearch/OpenMetadata 운영 인스턴스는 연결하지 않음
- [ ] 실제 DB/API/파일저장소/Kubernetes/CMP 연동은 미구현
- [ ] 접근코드는 프론트엔드 설정에 포함될 수 있으므로 강력한 보안 수단이 아님
