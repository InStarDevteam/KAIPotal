# 구현 로드맵

> 국방지능형플랫폼포털 PoC 이후 실제 운영 구축을 위한 단계별 로드맵입니다.

## 1. PoC 완료 범위

PoC 단계에서 다음이 완료되었습니다.

- Backstage 기반 포털 UI (12개 주요 화면)
- Keycloak OIDC 로그인 연동
- OpenSearch 통합검색 UI 연동 (proxy)
- OpenMetadata 실행 및 API 검증
- mock 데이터 기반 상태 전환 및 화면 흐름
- 18개 제안서용 화면 캡처

## 2. 1차 구축: 화면 및 기본 API/DB

**기간**: 1~2개월

**목표**: PoC 화면을 실제 DB/API 기반으로 전환

- 사용자/그룹/역할 DB 및 API
- 프로젝트/워크스페이스 DB 및 API
- 반입/반출 DB 및 API
- 크레딧 DB 및 API
- K-RMF 증빙 DB 및 API
- 시스템 파라미터/정책 DB 및 API
- 감사로그 저장소 설계
- PostgreSQL 운영 DB 연동

## 3. 2차 구축: 외부 시스템 연동

**기간**: 2~4개월

**목표**: 핵심 외부 시스템과의 연동 구현

- Keycloak Admin/Event API 연동 (사용자/그룹/역할 동기화)
- Keycloak password/session policy 연동
- OpenMetadata catalog 자동 동기화
- OpenSearch 인덱싱 자동화 (metadata, document, log)
- 데이터 플랫폼/AI 플랫폼/지능형 클라우드 API 연동 및 메타데이터 연계 (SFR-012, 156~158)
- 통합 카탈로그 메타데이터 동기화 및 필터 설계 (SFR-014, 015)
- Docker Registry / Helm Chart 연동
- PyPI Mirror / Conda 채널 연동
- 파일 저장소 연동 (S3/MinIO/Object Storage)

## 4. 3차 구축: 자원/운영 연동

**기간**: 4~5개월

**목표**: 실제 자원 할당 및 사용량 집계 연동

- Kubernetes namespace 및 resource quota 연동
- OpenStack project/quota 연동
- 워크스페이스 접속 링크 및 SSO 토큰 연동 (SFR-018, 159)
- 프로젝트 종료 시 산출물 저장/반출 workflow (SFR-016, 160)
- 추가 자원 요청/승인 및 크레딧 차감 연동 (SFR-016, 161)
- 학습/라벨링 작업 할당 및 진행상태 관리 (SFR-016, 163)
- CMP(Cloud Management Platform) 자원 풀 연동
- 실제 자원 사용량 수집 (GPU/CPU/스토리지/네트워크)
- 크레딧 환산/차감 로직 및 enforcement
- 군별 쿼터 적용 및 변경 workflow
- 테넌트 경계/분리 정책 enforcement

## 5. 4차 구축: 보안/감사/운영 고도화

**기간**: 5~6개월

**목표**: 운영 수준의 보안 및 모니터링 체계 구축

- 감사로그 중앙화 및 장기 보관
- 보안 이벤트 탐지 및 알림
- K-RMF 증빙 자동 수집 및 평가 연동
- 크레딧 잔액·추이 대시보드 및 사용량 수집 (SFR-017, 162)
- HTTPS/TLS, Secret 관리 체계 도입
- CI/CD 파이프라인 구축
- 로깅/모니터링/백업 체계 구축
- 운영 대시보드 및 장애 복구 절차 수립

## 6. 마일스톤

| 단계 | 산출물 | 주요 완료 기준 |
|------|--------|----------------|
| 1차 | DB/API, 기본 화면 연동 | 화면에서 실제 DB 데이터 CRUD 가능 |
| 2차 | 외부 연동 모듈 | Keycloak/OpenMetadata/OpenSearch/파일 저장소 연동 완료 |
| 3차 | 자원 연동 | K8s/OpenStack/CMP 연동 및 크레딧 enforcement 완료 |
| 4차 | 운영 체계 | 감사/보안/모니터링/백업 체계 구축 및 통합 테스트 완료 |

## 7. 후속 고도화 과제

- 임베딩 기반 유사도 검색
- 권한 기반 검색 결과 필터 enforcement
- 실시간 알림/메일/첨부파일 서비스
- E2E 테스트 자동화
- 성능/부하 테스트 및 최적화


## 8. 27단계 사전규격 반영 사항

- 155개 → 163개 기능목록 확장
- SFR-012/016/017 범위 확대 및 13개 SFR 변경사항 반영
- 후속 개발 단계에서 플랫폼 연동·프로젝트 라이프사이클·크레딧 대시보드 우선 구현 권장
