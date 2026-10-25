# Integrated Search 구현 개요

## 목적

`integrated-search`는 KT AI/Data Platform Portal PoC에서 **데이터셋, AI 모델, Docker 이미지, PyPI 패키지, 문서 등 다양한 자산을 한 곳에서 검색**할 수 있는 통합검색 화면입니다.

- 4단계에서 구성한 OpenSearch `portal-catalog` 인덱스를 검색 대상으로 사용합니다.
- 키워드 및 필터(유형, 보안등급, 소스 시스템, 태그) 기반 검색을 제공합니다.
- OpenMetadata 실시간 연동, 임베딩 기반 유사도 검색, 권한 기반 검색 결과 필터링은 후속 단계로 분리합니다.

## 화면 구성

- **검색 입력 영역**: 큰 검색창, placeholder, Enter/버튼 검색
- **필터 영역**: 검색 대상 유형, 보안등급, 소스 시스템, 태그 필터
- **검색 결과 목록**: 유형, 이름, 설명, 태그, 소유자, 보안등급, 출처, 수정일
- **검색 결과 상세 패널**: ID, 유형, 이름, 설명, 태그, 소유자, 보안등급, 출처, URL, 생성일, 수정일, 후속 연계 후보

## 검색 대상

현재 단계에서 검색 가능한 자산 유형:

- `dataset`
- `model`
- `docker_image`
- `pypi_package`
- `document`

향후 확장 대상:

- OpenMetadata 데이터셋/테이블/ML 모델
- Project Workspace 프로젝트
- Export Approval 반출/반입 신청
- Credit Manager 크레딧 이력
- K-RMF Evidence 통제항목/증빙자료
- Docker Registry 이미지
- PyPI Repository 패키지
- 문서 저장소

## OpenSearch 연동 방식

- Backstage frontend에서 직접 OpenSearch를 호출하지 않고, **Backstage backend proxy**를 경유합니다.
- `app-config.yaml`의 `proxy.endpoints.'/search'`가 `http://localhost:9200`으로 요청을 전달합니다.
- 프론트엔드는 `useApi(configApiRef)`로 `backend.baseUrl`(`http://localhost:7007`)을 읽어 `http://localhost:7007/api/proxy/search/portal-catalog/_search`로 직접 호출합니다.
- 이 방식으로 브라우저 CORS 문제를 회피하고, 향후 인증/권한 필터를 backend 계층에서 추가하기 용이합니다.

## 필터 구조

| 필터 | OpenSearch 필드 | 적용 방식 |
|------|-----------------|-----------|
| 검색어 | `name`, `description`, `tags` | `multi_match` |
| 검색 대상 유형 | `type` | `term` filter |
| 보안등급 | `securityLevel` | `term` filter |
| 소스 시스템 | `sourceSystem` | `term` filter |
| 태그 | `tags` | `term` filter |

## OpenSearch Query 구조

```json
{
  "query": {
    "bool": {
      "must": {
        "multi_match": {
          "query": "정비",
          "fields": ["name^2", "description", "tags"],
          "type": "best_fields"
        }
      },
      "filter": [
        { "term": { "type": "dataset" } },
        { "term": { "securityLevel": "내부" } },
        { "term": { "sourceSystem": "DAPA-MRO" } },
        { "term": { "tags": "군수" } }
      ]
    }
  },
  "size": 50
}
```

## 검색 결과 데이터 모델

```ts
// packages/app/src/components/integrated-search/types.ts

type SearchAssetType =
  | 'dataset'
  | 'model'
  | 'docker_image'
  | 'pypi_package'
  | 'document'
  | 'project'
  | 'export_request'
  | 'credit_record'
  | 'krmf_control'
  | 'krmf_evidence';

type SecurityLevel =
  | 'public'
  | 'internal'
  | 'secret';

type SearchResult = {
  id: string;
  type: SearchAssetType;
  name: string;
  description: string;
  tags: string[];
  owner: string;
  securityLevel: SecurityLevel;
  sourceSystem: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
};
```

## fallback mock 처리

- OpenSearch 연결 실패 또는 proxy 오류 발생 시, 화면에 경고 메시지를 표시하고 `mockSearchResults`를 보여줍니다.
- 이 fallback은 개발/데모 환경에서 검색 화면 구조를 빠르게 확인하기 위한 용도입니다.

## CORS/Proxy 고려사항

- 개발 환경에서 브라우저가 직접 `http://localhost:9200`을 호출하면 CORS 문제가 발생할 수 있습니다.
- Backstage backend proxy를 사용하여 동일 출처(`/api/proxy/search`)로 요청을 복귀시켰습니다.
- `app-config.yaml` 예시:

```yaml
proxy:
  endpoints:
    '/search':
      target: 'http://localhost:9200'
      changeOrigin: true
      allowedMethods: ['GET', 'POST', 'OPTIONS']
      allowedHeaders: ['Content-Type', 'Authorization']
      credentials: dangerously-allow-unauthenticated
```

- PoC 편의상 `credentials: dangerously-allow-unauthenticated`를 적용하여 로그인 세션 없이도 검색이 가능하도록 했습니다.
- 운영 환경에서는 Keycloak 사용자 인증 기반으로 proxy 접근을 제한해야 합니다.

## 보안등급 정규화

- OpenSearch 샘플 데이터의 보안등급은 `공개`, `내부`, `비밀` 기준으로 유지하며, 검색 클라이언트에서는 문자열을 `public`/`internal`/`secret`로 정규화합니다.
- UI 표시용 `securityLevelLabel`은 `internal`을 `내부`로 표시합니다.
- 향후 OpenSearch 샘플 데이터는 `공개`, `내부`, `비밀` 기준으로 정리합니다.

## 후속 확장 방향

### OpenMetadata 동기화

- OpenMetadata 데이터셋/테이블/ML 모델을 주기적으로 OpenSearch에 색인
- `sourceSystem: OpenMetadata` 결과 추가

### 자체 플러그인 데이터 색인

- Project Workspace, Export Approval, Credit Manager, K-RMF Evidence 데이터를 OpenSearch에 색인
- 통합검색에서 플러그인별 데이터도 검색 가능하도록 확장

### 권한 기반 검색 결과 필터링

- Keycloak 사용자 역할에 따라 검색 결과 필터링
- `portal-admin`: 전체 조회
- `project-manager`: 소속 프로젝트 관련 자원 조회
- `developer`: 참여 프로젝트와 공개/내부 자원 조회
- `analyst`: 분석 허가 데이터셋/모델 조회
- `external-user`: 승인된 프로젝트와 공개/제한 자원만 조회
- 실제 적용은 Backstage backend 또는 검색 API 계층에서 처리

### 임베딩 기반 유사도 검색

- 현재 단계: 키워드/필터 기반 검색
- 후속 단계: 임베딩 기반 유사도 검색
- 국방망/폐쇄망 기준 외부 API보다는 내부 임베딩 모델 사용 권장
- 벡터 저장소 후보:
  - OpenSearch k-NN
  - PostgreSQL pgvector
  - Milvus
- 적용 대상:
  - 데이터셋 설명
  - AI 모델 설명
  - 문서 요약
  - K-RMF 통제항목 설명
- 예시:
  - 사용자가 "전차 고장 예측 데이터"를 검색하면 "육군 장비 정비이력 데이터셋"도 의미적으로 추천

### 검색 감사로그 및 통계

- 사용자 검색어, 필터 사용, 클릭 이력 수집
- 인기 검색어, 검색 성공률, 신규 자산 노출 통계

## 파일 구성

```text
packages/app/src/components/integrated-search/
├── index.ts
├── types.ts
├── IntegratedSearchPage.tsx
├── SearchBox.tsx
├── SearchFilterPanel.tsx
├── SearchResultList.tsx
├── SearchResultDetail.tsx
├── SearchTypeChip.tsx
├── SearchApiClient.ts
└── mockSearchResults.ts
```

## 실행 방법

Backstage가 실행 중이면 자동 핫 리로드됩니다.

```bash
cd kt-ai-portal/backstage-portal
yarn start
```

## 검증 방법

1. `http://localhost:3000` 접속
2. Keycloak 로그인 또는 Guest 로그인
3. 좌측 메뉴 `Integrated Search` 클릭
4. 검색어 입력(예: `정비`, `고장예측`) 후 Enter
5. 유형/보안등급/소스 시스템/태그 필터 적용
6. 검색 결과 클릭 시 상세 패널 확인
7. 기존 `Project Workspace`, `Export Approval`, `Credit Manager`, `K-RMF Evidence` 메뉴 정상 동작 확인
