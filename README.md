# KAIPotal — 국방 지능형 플랫폼 고도화 구축사업 (AI 포털 PoC)

국방 지능형 플랫폼 고도화 구축사업의 **메인 포털 PoC(Proof of Concept)** 개발 저장소입니다.
Spotify **Backstage** 기반의 개발자 포털 프레임워크 위에 국방 AI 플랫폼 포털의 요구기능(SFR-001~021 + K-RMF 추가제안)을 구현했습니다.

> **성격**: 본 저장소는 PoC/데모 구현체입니다. 실 운영(폐쇄망) 배포를 위해서는 별도의 전환 작업이 필요합니다. 아래 [검토 보고서](#주요-문서) 참조.

## 저장소 구조

| 경로 | 내용 |
|---|---|
| `kt-ai-portal/` | 포털 애플리케이션 본체 (Backstage 모노레포) |
| `kt-ai-portal/backstage-portal/` | Backstage 앱 — `packages/app`(프론트엔드), `packages/backend`(백엔드 BFF) |
| `kt-ai-portal/docs/` | 아키텍처, 요구사항 추적표(163개 기능), 설계·QA·배포 문서 80여 건 |
| `kt-ai-portal/infra/` | Keycloak, OpenSearch, OpenMetadata, DB 역할분리 (Docker Compose) |
| `kt-ai-portal/scripts/` | 빌드·배포·검증 스크립트 49개 |
| `kt-ai-portal/proposal-package/` | 제안서·PPT·견적 산출물 |
| `prompt/` | 개발 지시서, 구현·시험 명세서 |
| `요구사항/` | 견적서(기능점수 산정표) PDF, 기술스택·요구사항 검토 보고서 |

## 기술스택 요약

| 영역 | 기술 |
|---|---|
| 프론트엔드 | Backstage 1.52, React 18, TypeScript 5.8, MUI v4, Yarn 4 |
| 백엔드 | Node.js 22/24, Express 4, Backstage New Backend System, knex |
| 데이터베이스 | PostgreSQL 16 (RLS, 감사 append-only 원장, 계정 3분리) |
| 인증/인가 | Keycloak 26 (OIDC SSO), Backstage Permission (기본 거부 정책), RBAC |
| 검색/카탈로그 | OpenSearch 2.19, OpenMetadata 1.6 |
| 인프라(데모) | Firebase Hosting, Google Cloud Run, Cloud SQL, Secret Manager |
| 인프라(목표) | 폐쇄망 VM, Kong API GW, Patroni+etcd PG 클러스터, Keycloak HA |
| AI 연계 | Backstage MCP Actions (Model Context Protocol) |

자세한 내용은 `kt-ai-portal/docs/ARCHITECTURE.md` 참조.

## 시작하기

```bash
cd kt-ai-portal/backstage-portal
yarn install
yarn start    # 프론트엔드 + 백엔드 로컬 실행
```

로컬 인프라(Keycloak, OpenSearch, OpenMetadata, PostgreSQL)는 `kt-ai-portal/infra/*/docker-compose.yml` 참조.
상세 절차는 `kt-ai-portal/README.md` 및 `prompt/KAIPotal_Setup_Guide.md` 참조.

## 주요 문서

- **아키텍처**: `kt-ai-portal/docs/ARCHITECTURE.md`
- **요구사항 추적표**: `kt-ai-portal/docs/FINAL_REQUIREMENT_TRACEABILITY_MATRIX.md` (RFP-001~163 ↔ 화면/구현 매핑)
- **기술스택·요구사항 검토 보고서** (2026-10-24): `요구사항/KAIPotal_기술스택_요구사항_검토보고서_20261024.md` (`.docx` 동봉)
- **VM/폐쇄망 인프라 설계**: `kt-ai-portal/docs/VM_INFRASTRUCTURE_DESIGN.md`
- **검색 구현**: `kt-ai-portal/docs/SEARCH_IMPLEMENTATION.md`

## 보안/운영 참고

- `.secrets/`, GCP/Firebase 크레덴셜, 로컬 docker volume, `.venv/`, `node_modules/` 는 git 추적에서 제외됩니다 (`.gitignore` 참조).
- 데모 배포는 퍼블릭 클라우드(Firebase + Cloud Run)이며, 목표 환경은 인터넷 차단 폐쇄망(VM + 내부 CA + 망분리)입니다.
- 실제 플랫폼(데이터/AI/클라우드) API 연동, MPKI 인증서 로그인, 의미기반(벡터) 검색 등은 미구현 항목으로 검토 보고서 §3~4에 정리되어 있습니다.
