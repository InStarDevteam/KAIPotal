# 검색 설계 문서 (Search Design)

KT AI/Data Platform Portal의 통합검색 백엔드 설계 문서입니다.

## 검색 목표

- 포털 내 데이터셋, AI 모델, Docker 이미지, PyPI 패키지, 문서 등 이종 자원을 통합 검색한다.
- 4단계에서는 메타데이터 기반 키워드 검색과 필터링을 구현한다.
- 임베딩 기반 유사도 검색은 후속 고도화 과제로 분리한다.

## 검색 대상

| 유형           | 설명              | 예시                              |
| -------------- | ----------------- | --------------------------------- |
| `dataset`      | 데이터셋          | 육군 장비 정비이력 데이터셋       |
| `model`        | AI 모델           | 장비 고장예측 AI 모델             |
| `docker_image` | Docker 이미지     | fault-prediction-train            |
| `pypi_package` | Python 패키지     | logistics-feature-engineering     |
| `document`     | 문서              | K-RMF 보안통제 증빙 가이드 문서   |

## 인덱스 구조

인덱스명: `portal-catalog`

| 필드            | 타입              | 설명                                                   |
| --------------- | ----------------- | ------------------------------------------------------ |
| `id`            | keyword           | 고유 ID                                                |
| `type`          | keyword           | dataset, model, docker_image, pypi_package, document   |
| `name`          | text + keyword    | 자원명. 풀텍스트 검색과 정확 일치 검색 모두 지원       |
| `description`   | text              | 설명. 풀텍스트 검색 대상                               |
| `tags`          | keyword           | 태그 목록. 집계 및 필터링에 사용                       |
| `owner`         | keyword           | 담당자 또는 담당조직                                   |
| `securityLevel` | keyword           | 공개, 내부, 비밀 등급                                  |
| `sourceSystem`  | keyword           | 출처 시스템 (DAPA-MRO, AI-Factory 등)                  |
| `url`           | keyword           | 상세 링크 또는 참조 URL                                |
| `createdAt`     | date              | 생성일시                                               |
| `updatedAt`     | date              | 수정일시                                               |

## 실행 환경

- OpenSearch: `http://localhost:9200`
- OpenSearch Dashboards: `http://localhost:5601`
- Docker Compose: `infra/opensearch/docker-compose.yml`

## 초기화 및 검색 스크립트

```bash
cd infra/opensearch
chmod +x scripts/*.sh
./scripts/run-all.sh
```

개별 실행:

```bash
./scripts/01-create-index.sh
./scripts/02-seed-sample-data.sh
./scripts/03-search-test.sh
```

## 검색 방식

### 키워드 검색

`name`과 `description` 필드를 대상으로 multi_match 쿼리를 사용합니다.

```json
{
  "query": {
    "multi_match": {
      "query": "정비",
      "fields": ["name", "description"]
    }
  }
}
```

### 유형 필터

```json
{
  "query": {
    "bool": {
      "filter": [{ "term": { "type": "dataset" } }]
    }
  }
}
```

### 보안등급 필터

```json
{
  "query": {
    "bool": {
      "filter": [{ "term": { "securityLevel": "내부" } }]
    }
  }
}
```

### 태그 필터

```json
{
  "query": {
    "bool": {
      "filter": [{ "term": { "tags": "군수" } }]
    }
  }
}
```

### 복합 검색 예시

키워드 + 유형 + 보안등급을 조합할 수 있습니다.

```json
{
  "query": {
    "bool": {
      "must": [
        { "multi_match": { "query": "고장예측", "fields": ["name", "description"] } }
      ],
      "filter": [
        { "term": { "type": "model" } },
        { "term": { "securityLevel": "내부" } }
      ]
    }
  }
}
```

## 4단계 검증 결과

- `portal-catalog` 인덱스 생성 성공
- 샘플 데이터 10건 적재 성공 (dataset 4건, model 2건, docker_image 1건, pypi_package 1건, document 2건)
- 검색 테스트 스크립트 6개 케이스 모두 정상 수행
  - 전체 검색
  - `정비` 키워드 검색
  - `고장예측` 키워드 검색
  - `type=dataset` 필터
  - `securityLevel=내부` 필터
  - `tags=군수` 필터

## 후속 확장

- Backstage 검색 화면 연동 (10단계)
- OpenMetadata 메타데이터 수집 연동
- Docker Registry 메타데이터 수집
- PyPI Repository 메타데이터 수집
- 임베딩 기반 유사도 검색
- 권한 기반 검색 결과 필터링 (Keycloak 그룹/역할 연동)

## 운영 고려사항

- 보안 플러그인 활성화 및 TLS 설정
- 인증/인가 계정 관리 (admin, dashboards 등)
- 다중 노드 클러스터 구성
- JVM 힙 및 파일 디스크립터 리밋 조정
- 정기 스냅샷 및 모니터링 구성
