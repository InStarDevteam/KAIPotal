# 소스 검토와 개선 계획 — 2026-09-16

기준: `4148007`. 기존 P0/P1 작업을 보존한다. 사용자가 승인한 배포 대상은
Firebase Hosting `kai-platform-d0ae0`와 연결된 Cloud Run이다.

## 확인한 결함과 실행 순서

1. **배포/DB**: Cloud Run은 `00017-v42`로 portal 플러그인 이전 이미지다.
   demo 설정에 portal.database가 없고 신규 플러그인은 이를 필수로 읽는다.
   Cloud SQL 인스턴스는 RUNNABLE이며 업무 스키마가 이미 적용되어 있다.
   Unix socket 설정, 연결 제한/timeout, 준비 상태 검사, Secret Manager 참조,
   버전 지정 이미지와 무트래픽 검증 후 전환 절차를 추가한다.
   gcloud는 `/Users/choikyubeom/google-cloud-sdk/bin/gcloud`에 존재한다.
2. **서버 인가**: runtime RLS에서 tenant context 없는 RBAC/소속 조회가 빈 결과를
   만든다. membership 검사보다 context 설정이 늦고, 유효기간 시작·계정 상태·
   신원 verified 검사가 일관되지 않다. tenant 트랜잭션, 기간 검사, 역할 위임 한계,
   만료일이 있는 역할의 회수, Express 비동기 오류 전달을 정비하고 실제 PG로 시험한다.
3. **화면 구조**: 기존 248px Backstage sidebar와 `!important` 본문 보정을 제거한다.
   64px 상단, 256/72/0px 메뉴 상태, 모바일 overlay·ESC·focus 복귀,
   검색·내 작업·도움말, 밝은 표면과 파란 강조색의 앱 셸을 구현한다.
   기존 URL/권한/업무 화면을 유지하고 대시보드의 과도한 헤더를 정리한다.
4. **데이터 진실성**: Firebase 이메일 목록은 서버 인가가 아니다. 비캡처 모드에서
   이를 관리자 승격 근거로 삼지 않는다. 운영 신원 exchange/Keycloak, 실제 업무
   API 연결, 테넌트별 개인화 저장은 별도 구현·시험 상태를 명시한다.
5. **검증/배포**: typecheck, 기존 단위시험, 신규 PG 음성시험, 앱/백엔드 빌드,
   390/768/1366/1440/1920 폭과 메뉴 조작 브라우저 시험을 수행한다.
   Hosting 200 응답과 업무 API 검증을 구별한다. 백엔드는 DB health 및 무인증 거부를
   확인한 후 트래픽을 전환하고 이전 revision을 rollback 대상으로 기록한다.

## 전 범위 후속 작업

명세 P1의 실제 인증/인가 연결, P2 브랜드·메뉴 게시/개인화·관리자 DB UI,
P3 프로젝트·승인·크레딧·파일/게시판 영속화, P4 검색/원천 계약,
P5 K-RMF 실집계·증적, P6 3중화/복원/성능은 각각 완료 증거가 필요하다.
이번 수정이나 배포를 이 전체 범위의 완료로 표시하지 않는다.

## 참고

- 디자인 방향: https://www.samsungsds.com/kr/ai-fabrix/fabrix.html
  (자산 발견·업무공간 중심의 정보 계층 참고, 상표·화면 복제 없음)
- Cloud Run SQL socket: https://docs.cloud.google.com/sql/docs/postgres/connect-run

## 배포 전제

기존 계정의 비밀번호를 임의 변경하지 않는다. DB 접속 정보의 저장 경로를 확인해
Secret Manager로 전달하고 원문을 로그·소스·이미지에 넣지 않는다.
기존 demo의 캡처/Guest 경로가 남는 동안은 staging이며 운영 승인 상태가 아니다.
