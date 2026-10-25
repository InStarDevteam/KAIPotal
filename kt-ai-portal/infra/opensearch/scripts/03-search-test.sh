#!/usr/bin/env bash
set -e

OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"
INDEX="portal-catalog"

search() {
  local title="$1"
  local body="$2"
  echo ""
  echo "===== ${title} ====="
  echo "Request: ${body}"
  echo "---"
  curl -s -X POST "${OPENSEARCH_URL}/${INDEX}/_search" -H 'Content-Type: application/json' -d "${body}" | jq '.hits.hits[] | {id: ._source.id, type: ._source.type, name: ._source.name, score: ._score}'
}

search "전체 검색" '{"query":{"match_all":{}},"size":20}'
search "키워드 검색: 정비" '{"query":{"multi_match":{"query":"정비","fields":["name","description"]}},"size":20}'
search "키워드 검색: 고장예측" '{"query":{"multi_match":{"query":"고장예측","fields":["name","description"]}},"size":20}'
search "유형 필터: dataset" '{"query":{"bool":{"filter":[{"term":{"type":"dataset"}}]}},"size":20}'
search "보안등급 필터: 내부" '{"query":{"bool":{"filter":[{"term":{"securityLevel":"내부"}}]}},"size":20}'
search "태그 필터: 군수" '{"query":{"bool":{"filter":[{"term":{"tags":"군수"}}]}},"size":20}'

echo ""
echo "===== 검색 테스트 완료 ====="
