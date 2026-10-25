# 내부 로직 후속 개발 목록 (Internal Logic Backlog)

> 본 문서는 화면은 구현되었으나 실제 연동/엔진/정책이 아직 구현되지 않은 항목을 정리합니다.  
> 제안서 및 견적 산정 시 후속 개발 범위로 활용합니다.

## 1. 인증/권한

- Keycloak Admin API 연동 (사용자/그룹/역할 CRUD)
- Backstage OIDC provider에서 role/group claim 수신 및 전파
- Backstage Permission Policy 연동 (역할/메뉴/데이터 기반 접근 제어)
- 세션 조회 및 강제 종료 연동
- 비밀번호 정책 enforcement (Keycloak password policy 동기화)
- 계정 잠금/해제 및 로그인 실패 이력 연동
- MFA(OTP/WebAuthn) 활성화 및 검증 연동

## 2. 데이터/검색

- OpenMetadata catalog 자동 동기화 (데이터셋, 모델, 도구)
- OpenSearch 인덱싱 자동화 (metadata, document, log)
- 유사도/임베딩 검색 구현
- 보안등급 기반 검색 필터 enforcement (공개/내부/비밀)
- 검색 결과 접근 권한 실시간 평가
- 최근 검색/인기 검색어 집계 및 저장

## 3. 프로젝트/워크스페이스

- 실제 워크스페이스 생성/삭제 API
- Kubernetes namespace 연동 및 라벨링
- 리소스 quota(ResourceQuota/LimitRange) 적용
- 프로젝트 생애주기 상태 머신 DB 연동
- 프로젝트 멤버 초대/권한 부여 연동
- 워크스페이스 접근 로그 수집

## 4. 반입/반출

- 파일 업로드/다운로드 저장소 연동 (S3/MinIO/Object Storage)
- 반입/반출 승인 workflow 엔진 연동
- 반출 보안 검토 로직 (DLP, 마스킹, 암호화)
- 반출 파일 만료/회수 스케줄러
- 반입 파일 악성코드/형식 검증
- 반입/반출 감사로그 DB 저장

## 5. 크레딧

- 실제 자원 사용량 수집 (GPU/CPU/스토리지/네트워크)
- 크레딧 환산/차감 로직 및 정책 엔진
- 크레딧 부족 시 자원 제한 enforcement
- 크레딧 충전/할당/회수 workflow
- 프로젝트별 비용 집계 및 리포트
- 사용량 예측 및 알림

## 6. 서비스 카탈로그/제안 게시판

- Docker Registry / Helm Chart 연동
- PyPI Mirror / Conda 채널 연동
- Tool 등록/승인 workflow
- Proposal DB/API 및 첨부파일 저장소
- 제안 공감/댓글/알림 연동
- 제안 승인/공지 및 상태 전환
- 카탈로그 사용 통계 집계

## 7. Tenant Management

- Kubernetes namespace 및 resource quota 연동
- OpenStack project/quota 연동
- CMP(Cloud Management Platform) 자원 풀 연동
- 군별 쿼터 적용 및 변경 workflow
- 군별 사용량 수집 및 집계
- 군별 관리자 권한 enforcement (Keycloak group/role)
- 테넌트 경계/분리 정책 enforcement
- 크레딧 잔액 및 과다 사용 알림

## 8. 운영/감사

- 감사로그 DB 및 조회 API
- 관리자 조치 이력 DB
- 사용자 활동 로그 수집
- 보안 이벤트 탐지 및 알림
- K-RMF 증빙 자동 수집 및 평가 연동
- 로그 보관/아카이빙 정책
- 설정 변경 이력 DB

## 9. 테스트/품질

- 단위 테스트 커버리지 확보
- E2E 시나리오 자동화
- 접근성/반응형 테스트
- 보안 취약점 점검
- 성능/부하 테스트

## 10. 운영 인프라

- CI/CD 파이프라인 구축
- 컨테이너 이미지 빌드/배포 자동화
- 로깅/모니터링/알림 체계
- 백업/복구 전략
- 장애 복구 및 롤백 절차
