# OpenSearch 개발 환경

KT AI/Data Platform Portal PoC의 통합검색 백엔드로 사용할 OpenSearch 개발 환경입니다.

## 구성

- OpenSearch: `http://localhost:9200`
- OpenSearch Dashboards: `http://localhost:5601`
- 컨테이너명: `kt-opensearch`, `kt-opensearch-dashboards`

> 본 구성은 개발용 단일 노드입니다. 운영환경에서는 보안 플러그인, TLS, 인증, 클러스터 구성이 필요합니다.

## 실행

```bash
cd infra/opensearch
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

## 접속 확인

```bash
curl http://localhost:9200
```

정상 응답 예시:

```json
{
  "name": "kt-opensearch",
  "cluster_name": "kt-opensearch-cluster",
  "version": {
    "number": "2.19.1"
  },
  ...
}
```

## OpenSearch Dashboards

브라우저에서 `http://localhost:5601`로 접속합니다.

## 인덱스/데이터 초기화

```bash
chmod +x scripts/*.sh
./scripts/run-all.sh
```

또는 개별 실행:

```bash
./scripts/01-create-index.sh
./scripts/02-seed-sample-data.sh
./scripts/03-search-test.sh
```
