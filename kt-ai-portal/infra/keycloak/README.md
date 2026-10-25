# Keycloak - Development Setup

KT AI/Data Platform Portal의 개발용 Keycloak 설정입니다.

## 사전 요구사항

- Docker Desktop 실행 중
- Host 포트 8080 사용 가능

## 실행

```bash
cd infra/keycloak
docker compose up -d
```

## 로그 확인

```bash
docker compose logs -f
```

## 종료

```bash
docker compose down
```

## 접속 정보

- 관리자 콘솔: http://localhost:8080/admin
- 일반 접속: http://localhost:8080

### 관리자 계정 (개발용)

```text
ID: admin
PW: admin
```

> ⚠️ 운영환경에서는 `admin/admin` 사용을 절대 금지합니다.

## 설정 절차 개요

1. 관리자 콘솔에 접속
2. `kt-ai` Realm 생성
3. `backstage` Client 생성 (OpenID Connect)
4. 테스트 사용자 및 그룹/역할 생성
5. 자세한 절차는 `docs/KEYCLOAK_SETUP.md` 참조

## 참고

- Keycloak 공식 문서: https://www.keycloak.org/documentation
