# OpenMetadata 개발 환경

KT AI/Data Platform Portal PoC의 데이터/AI 카탈로그로 사용할 OpenMetadata 개발 환경입니다.

> 본 구성은 OpenMetadata 1.6.0 공식 Docker Compose(quickstart)를 기반으로 합니다.
> Backstage 및 OpenMetadata와의 직접 연동은 5단계에서 구현하지 않으며, 실행 및 설계 단계로 제한합니다.

## 사전 요구사항

- Docker Desktop 4.x 이상
- macOS에서 권장 메모리: 8GB 이상 (OpenMetadata + Elasticsearch + MySQL + Ingestion 실행 시)
- 기존 서비스와의 포트 충돌 방지를 위해 elasticsearch/mysql/ingestion의 호스트 포트는 노출하지 않음

## 구성

- OpenMetadata Server UI: `http://localhost:8585`
- OpenMetadata Admin Port: `8586` (낮쪽 네트워크에서만 노출)
- 낮쪽 서비스 (호스트에 노출되지 않음):
  - MySQL: `openmetadata_mysql:3306`
  - Elasticsearch: `openmetadata_elasticsearch:9200`
  - Airflow Ingestion: `openmetadata_ingestion:8080`

## 실행

```bash
cd infra/openmetadata
docker compose up -d
```

최초 실행 시 DB 마이그레이션(`execute_migrate_all`)이 먼저 실행된 후 서버가 시작됩니다.

## 상태 확인

```bash
docker compose logs -f
```

OpenMetadata 서버가 정상 기동되면 다음 URL에서 healthcheck를 확인할 수 있습니다.

```bash
curl http://localhost:8586/healthcheck
```

## 접속

브라우저에서 `http://localhost:8585`로 접속합니다.

기본 계정 (Quickstart 기본값):

- ID: `admin@open-metadata.org`
- PW: `admin`

> 첫 로그인 시 비밀번호 변경을 요청할 수 있습니다.

## 중지

```bash
docker compose down
```

## 포트 충돌 방지

기존 PoC 서비스와 충돌하지 않도록 다음 포트는 OpenMetadata 컨테이너 낮쪽에서만 사용합니다.

| 서비스 | OpenMetadata 낮쪽 포트 | 호스트 노출 여부 | 기존 PoC 사용 포트 |
|--------|----------------------|----------------|------------------|
| Elasticsearch | 9200 | 미노출 | `kt-opensearch`가 9200 사용 |
| MySQL | 3306 | 미노출 | - |
| Airflow Ingestion | 8080 | 미노출 | `kt-keycloak`가 8080 사용 |
| OpenMetadata Server | 8585 | 노출 | - |

## OpenMetadata UI 확인 항목

- `http://localhost:8585` 접속
- 기본 계정으로 로그인
- 좌측 메뉴에서 **Explore** → **Tables**, **Topics**, **Dashboards**, **ML Models** 등 확인
- 우측 상단 **Settings** → **Services**에서 서비스 연결 구조 확인
- **Settings** → **Open API** 또는 `/api/v1/openapi.json`에서 API 문서 확인

## 문제 해결

### Docker Desktop 메모리 부족

OpenMetadata는 Elasticsearch, MySQL, 서버, Ingestion을 함께 실행하므로 4GB 이상의 여유 메모리가 필요합니다.

- Docker Desktop 설정 → Resources → Memory를 8GB 이상으로 조정
- 또는 `docker compose down` 후 불필요한 컨테이너 중지

### 컨테이너가 `unhealthy`로 표시됨

```bash
docker compose logs openmetadata_server
docker compose logs openmetadata_elasticsearch
docker compose logs openmetadata_mysql
```

### 실행 보류 시

MacBook 리소스 문제, 이미지 다운로드 실패, 네트워크 문제 등으로 실행이 어려울 경우 억지로 해결하지 않고 `docs/OPENMETADATA_DESIGN.md`에 다음을 기록합니다.

- 발생 오류
- 원인 추정
- 조치 시도
- 보류 사유
- 후속 조치 방안

## 참고

- OpenMetadata 공식 문서: https://docs.open-metadata.org/
- OpenMetadata Docker Quickstart: https://docs.open-metadata.org/latest/quick-start/local-docker-deployment
