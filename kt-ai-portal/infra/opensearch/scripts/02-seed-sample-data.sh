#!/usr/bin/env bash
set -e

OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"
INDEX="portal-catalog"

echo "Seeding sample data into '${INDEX}' ..."

curl -s -X POST "${OPENSEARCH_URL}/${INDEX}/_bulk" -H 'Content-Type: application/json' -d '
{"index":{"_id":"dataset-001"}}
{"id":"dataset-001","type":"dataset","name":"육군 장비 정비이력 데이터셋","description":"육군 주요 장비의 정비 이력, 고장 코드, 부품 교체 기록을 포함한 정형 데이터셋","tags":["군수","육군","정비","장비"],"owner":"군수정책과","securityLevel":"내부","sourceSystem":"DAPA-MRO","url":"https://example.com/dataset/001","createdAt":"2025-01-15T09:00:00Z","updatedAt":"2025-06-10T12:30:00Z"}
{"index":{"_id":"dataset-002"}}
{"id":"dataset-002","type":"dataset","name":"해군 장비 센서 시계열 데이터셋","description":"함정 엔진룸 온도/진동 센서 수집 시계열 데이터","tags":["군수","해군","센서","시계열"],"owner":"함정기술과","securityLevel":"비밀","sourceSystem":"NAVY-SCADA","url":"https://example.com/dataset/002","createdAt":"2025-02-20T10:00:00Z","updatedAt":"2025-06-12T14:00:00Z"}
{"index":{"_id":"dataset-003"}}
{"id":"dataset-003","type":"dataset","name":"공군 부품 수요예측 데이터셋","description":"공군 항공기 부품 교체 주기 및 재고 수요 예측용 학습 데이터","tags":["군수","공군","수요예측","부품"],"owner":"공군군수본부","securityLevel":"내부","sourceSystem":"AF-SCMM","url":"https://example.com/dataset/003","createdAt":"2025-03-05T08:30:00Z","updatedAt":"2025-06-15T09:45:00Z"}
{"index":{"_id":"model-001"}}
{"id":"model-001","type":"model","name":"장비 고장예측 AI 모델","description":"정비 이력과 센서 데이터를 기반으로 한 장비 고장 예측 머신러닝 모델","tags":["AI","고장예측","군수","예지보전"],"owner":"AI개발센터","securityLevel":"내부","sourceSystem":"AI-Factory","url":"https://example.com/model/001","createdAt":"2025-04-01T11:00:00Z","updatedAt":"2025-06-18T16:20:00Z"}
{"index":{"_id":"model-002"}}
{"id":"model-002","type":"model","name":"부품 수요예측 AI 모델","description":"시계열 예측을 활용한 항공기 부품 수요량 예측 모델","tags":["AI","수요예측","군수","시계열"],"owner":"AI개발센터","securityLevel":"내부","sourceSystem":"AI-Factory","url":"https://example.com/model/002","createdAt":"2025-04-10T13:00:00Z","updatedAt":"2025-06-19T10:10:00Z"}
{"index":{"_id":"docker-001"}}
{"id":"docker-001","type":"docker_image","name":"fault-prediction-train","description":"장비 고장예측 모델 학습용 Docker 이미지. PyTorch 및 MLflow 포함","tags":["Docker","AI","고장예측","학습"],"owner":"AI개발센터","securityLevel":"공개","sourceSystem":"Harbor-Registry","url":"https://example.com/image/fault-prediction-train","createdAt":"2025-05-01T07:00:00Z","updatedAt":"2025-06-20T08:00:00Z"}
{"index":{"_id":"pypi-001"}}
{"id":"pypi-001","type":"pypi_package","name":"logistics-feature-engineering","description":"군수 물류 데이터 전처리 및 피처 엔지니어링 유틸리티 패키지","tags":["Python","PyPI","군수","피처엔지니어링"],"owner":"AI개발센터","securityLevel":"공개","sourceSystem":"Private-PyPI","url":"https://example.com/pypi/logistics-feature-engineering","createdAt":"2025-05-12T09:00:00Z","updatedAt":"2025-06-21T11:30:00Z"}
{"index":{"_id":"doc-001"}}
{"id":"doc-001","type":"document","name":"K-RMF 보안통제 증빙 가이드 문서","description":"K-RMF(Korea Risk Management Framework) 보안통제 항목별 증빙자료 작성 가이드","tags":["K-RMF","보안","증빙","문서"],"owner":"정병호보안팀","securityLevel":"내부","sourceSystem":"Confluence","url":"https://example.com/docs/krmf-guide","createdAt":"2025-01-30T10:00:00Z","updatedAt":"2025-06-22T15:00:00Z"}
{"index":{"_id":"dataset-004"}}
{"id":"dataset-004","type":"dataset","name":"군수 물류 재고 현황 데이터셋","description":"전군 군수 물류 창고별 부품 재고 현황 집계 데이터","tags":["군수","물류","재고","현황"],"owner":"군수물류과","securityLevel":"공개","sourceSystem":"DAPA-LOGIS","url":"https://example.com/dataset/004","createdAt":"2025-03-20T08:00:00Z","updatedAt":"2025-06-23T09:00:00Z"}
{"index":{"_id":"doc-002"}}
{"id":"doc-002","type":"document","name":"AI 모델 배포 운영 가이드","description":"AI 모델 버전 관리, 배포 파이프라인, 모니터링 기준을 정의한 문서","tags":["AI","MLOps","배포","문서"],"owner":"AI운영팀","securityLevel":"공개","sourceSystem":"GitLab-Wiki","url":"https://example.com/docs/mlops-guide","createdAt":"2025-05-25T12:00:00Z","updatedAt":"2025-06-24T13:00:00Z"}
' | jq -c '.items[] | {id: .index._id, result: .index.result, status: .index.status}'

echo "Sample data seeded successfully."
