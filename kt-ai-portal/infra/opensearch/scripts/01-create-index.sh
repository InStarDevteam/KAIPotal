#!/usr/bin/env bash
set -e

OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"
INDEX="portal-catalog"

echo "Creating index '${INDEX}' on ${OPENSEARCH_URL} ..."

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${OPENSEARCH_URL}/${INDEX}" || true)

if [ "$STATUS" = "200" ]; then
  echo "Index '${INDEX}' already exists. Skipping creation."
  exit 0
fi

curl -s -X PUT "${OPENSEARCH_URL}/${INDEX}" -H 'Content-Type: application/json' -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "type": { "type": "keyword" },
      "name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword", "ignore_above": 256 }
        }
      },
      "description": { "type": "text" },
      "tags": { "type": "keyword" },
      "owner": { "type": "keyword" },
      "securityLevel": { "type": "keyword" },
      "sourceSystem": { "type": "keyword" },
      "url": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}' | jq .

echo "Index '${INDEX}' created successfully."
