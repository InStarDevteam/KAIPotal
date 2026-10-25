# Keycloak Setup Guide

KT AI/Data Platform Portal의 인증/권한을 담당할 Keycloak 설정 가이드입니다.

## 개요

- Keycloak 버전: 26.2.4
- 관리자 콘솔: http://localhost:8080/admin
- Realm: `kt-ai`
- Client: `backstage`
- 관리자 계정(개발용): `admin` / `admin`

> ⚠️ 본 가이드는 개발용 설정입니다. 운영환경에서는 admin/admin 사용 금지, 외부 DB 사용, HTTPS 적용이 필요합니다.

## Keycloak 실행

```bash
cd kt-ai-portal/infra/keycloak
docker compose up -d
```

## 1. Realm 생성

### 수동 생성 절차

1. 관리자 콘솔에 접속: http://localhost:8080/admin
2. 좌측 상단 드롭다운에서 **Create realm** 클릭
3. Realm name: `kt-ai`
4. **Create** 클릭

### 생성 결과

- Realm ID: `e85ca863-aa0a-43af-8d4b-2e4b3a055449`
- OpenID Configuration: http://localhost:8080/realms/kt-ai/.well-known/openid-configuration

## 2. Client 생성

### 수동 생성 절차

1. `kt-ai` Realm 선택
2. 왼쪽 메뉴 **Clients** 클릭
3. **Create client** 클릭
4. 아래와 같이 입력

| 항목 | 값 |
|------|-----|
| Client type | OpenID Connect |
| Client ID | `backstage` |

5. **Next**
6. Capability config
   - Client authentication: **On**
   - Standard flow: **On**
7. **Next**
8. Login settings

| 항목 | 값 |
|------|-----|
| Root URL | `http://localhost:3000` |
| Valid redirect URIs | `http://localhost:7007/api/auth/oidc/handler/frame` |
| Web origins | `http://localhost:3000` |

9. **Save**

### 생성 결과

- Client UUID: `b4b89edd-1b43-45e1-9a66-8f3c862e5de7`
- Client authenticator: Client Id and Secret
- Client Secret: Credentials 탭에서 확인 (3단계 Backstage 연동 시 사용)

## 3. Realm Roles 생성

### 설계 역할

| 역할 | 설명 |
|------|------|
| `portal-admin` | 포털 전체 관리자 |
| `project-manager` | 프로젝트 생성/승인/관리 담당 |
| `developer` | 개발환경 및 프로젝트 참여자 |
| `analyst` | 데이터 분석 및 AI 학습데이터 사용자 |
| `external-user` | 제한된 외부 사용자 |

### 수동 생성 절차

1. 왼쪽 메뉴 **Realm roles** 클릭
2. **Create role** 클릭
3. Role name, Description 입력
4. **Save**

### 생성 결과

| 역할 | ID |
|------|-----|
| portal-admin | ccce99be-4add-47ad-b30f-e50f892d447d |
| project-manager | 67f58368-4fb7-4456-b250-0320f33d8809 |
| developer | 61041806-c723-4941-b166-f41ff025c10a |
| analyst | 473d4edf-7ab6-4c24-ab76-c7774059dfa4 |
| external-user | c7a0cb8b-eb9d-48cd-9084-0f56c9f5d2aa |

## 4. Groups 생성

### 설계 그룹

| 그룹 | 설명 |
|------|------|
| `portal-admin` | 포털 관리자 그룹 |
| `project-manager` | 프로젝트 관리자 그룹 |
| `developer` | 개발자 그룹 |
| `analyst` | 분석가 그룹 |
| `external-user` | 외부 사용자 그룹 |

### 수동 생성 절차

1. 왼쪽 메뉴 **Groups** 클릭
2. **Create group** 클릭
3. Group name 입력
4. **Create**

## 5. 테스트 사용자 생성

### 설계 사용자

| 사용자ID | 역할 | 그룹 | Email | 임시 비밀번호 |
|---------|------|------|-------|-------------|
| admin01 | portal-admin | portal-admin | admin01@kt.ai | Password123! |
| pm01 | project-manager | project-manager | pm01@kt.ai | Password123! |
| developer01 | developer | developer | developer01@kt.ai | Password123! |
| analyst01 | analyst | analyst | analyst01@kt.ai | Password123! |
| external01 | external-user | external-user | external01@kt.ai | Password123! |

### 수동 생성 절차

1. 왼쪽 메뉴 **Users** 클릭
2. **Add user** 클릭
3. 아래 항목 입력
   - Username
   - Email
   - First name
   - Last name
   - Email verified: On
   - Groups: 해당 그룹 선택
4. **Create**
5. **Credentials** 탭에서 **Set password**
   - Password, Password confirmation 입력
   - Temporary: Off (개발용)
6. **Save**
7. **Role mapping** 탭에서 해당 realm role 추가

### 생성 결과

- admin01, pm01, developer01, analyst01, external01 생성 완료
- 각 사용자별 역할 및 그룹 매핑 완료

## 6. Claim 설계 (Backstage 연동용)

Backstage OIDC 연동 시 다음 Claim을 사용합니다.

| Claim | Keycloak 매핑 | 용도 |
|-------|--------------|------|
| `preferred_username` | username | 사용자 ID |
| `email` | email | 이메일 |
| `name` | firstName + lastName | 표시 이름 |
| `groups` | Group Membership | 그룹 기반 메뉴 제어 |
| `roles` | User Realm Role | 역할 기반 권한 제어 |

### Mapper 설정 (3단계에서 적용)

1. Clients > `backstage` > Client scopes
2. `backstage-dedicated` 선택
3. **Add mapper** > **By configuration**
4. **Group Membership** mapper 추가
   - Name: groups
   - Token claim name: groups
   - Full group path: Off
5. **User Realm Role** mapper 추가
   - Name: roles
   - Token claim name: roles

## 7. REST API 활용 (선택)

관리자 REST API 사용 시 master realm의 `admin-cli` client로 token을 발급받습니다.

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password' \
  -d 'client_id=admin-cli' \
  -d 'username=admin' \
  -d 'password=admin' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### Realm 역할 생성 예시

```bash
curl -X POST http://localhost:8080/admin/realms/kt-ai/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"developer","description":"개발자 역할"}'
```

### 사용자 생성 예시

```bash
curl -X POST http://localhost:8080/admin/realms/kt-ai/users \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "username":"developer01",
    "email":"developer01@kt.ai",
    "firstName":"Dev",
    "lastName":"Lee",
    "enabled":true,
    "emailVerified":true,
    "credentials":[{"type":"password","value":"Password123!","temporary":false}]
  }'
```

## 참고

- Keycloak 공식 문서: https://www.keycloak.org/documentation
- OpenID Connect 엔드포인트: http://localhost:8080/realms/kt-ai/.well-known/openid-configuration
