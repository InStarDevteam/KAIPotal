# 국방지능형플랫폼포털 VM 인프라 구성안

> 목적: 폐쇄망(국방망) 운영을 전제로 한 포털 VM 구성, 스펙, 이중화, 스토리지 설계 기준.
> 범위: **포털(VM/Web/WAS/DB/검색/IAM/스토리지/모니터링)**. 데이터 플랫폼, AI 플랫폼, 클라우드/CMP는 별도 사업 범위로, 본 문서에서는 연계 대상으로만 다룬다.
> 작성일: 2026-07-30

---

## 1. 설계 전제

| 항목 | 가정 |
|---|---|
| 사용자 규모 | 동시 접속 300~500명, 등록 사용자 3,000~5,000명 (육·해·공군·국직) |
| 트래픽 | 평시 20~50 RPS, 월간 데이터 증가: 카탈로그 메타 수 GB, 반입·반출 파일 100~500GB |
| 네트워크 | 인터넷 차단 폐쇄망, 내부 CA 기반 TLS, 망분리(DMZ/업무망/관리망) |
| 가용성 목표 | 포털 서비스 99.9% (월 허용 중단 약 43분), 단일 VM 장애 시 무중단 |
| K-RMF 연계 | 이중화, 백업·복구, 감사로그, 세션 관제 요구(SER-004/008) 반영 |
| 배포 형태 | VM + systemd 직접 설치 기준 (옵션: 사내 레지스트리 기반 컨테이너) |

---

## 2. 전체 구성도

```text
                        [사용자 단말]
                              │
                     ┌────────┴────────┐
                     │   L4 스위치 ×2   │  ← VIP 1개, Active-Standby
                     │  (장비/가상LB)   │
                     └────────┬────────┘
                              │ 443/TLS
                ┌─────────────┼─────────────┐
                │             │             │
           [WEB-01]      [WEB-02]      (확장 가능)
           nginx 정적     nginx 정적
           호스팅/프록시   호스팅/프록시
                │             │
                └──────┬──────┘
                       │ /api 프록시
                ┌──────┴──────┐
                │  내부 L4 VIP  │  (WAS용 2차 VIP, L4 동일 장비 활용)
                └──────┬──────┘
                 ┌─────┴─────┐
             [WAS-01]     [WAS-02]
           Backstage     Backstage
           backend       backend
           (Node.js)     (Node.js)
                 │  ┌──────────────┬───────────────┬────────────┐
                 │  │              │               │            │
            [DB-01 주] [DB-02 대기] [OS-01~03]  [KC-01/02]   [EXT]
            PostgreSQL PostgreSQL  OpenSearch   Keycloak    데이터/AI
            (스트리밍    (동기 복제)  (검색 클러스터)  (OIDC IdM)  플랫폼/CMP
             복제)                                                연계
                 │
        ┌────────┴─────────┐
        │ [ST-01/02]        │  MinIO(오브젝트) 또는 NFS
        │ 반입·반출/증빙 파일 │
        └──────────────────┘

  관리망: [MON-01] Prometheus+Grafana  [LOG-01] 감사/로그 수집  [BAK-01] 백업  [BAST-01] Bastion
```

---

## 3. VM 구성 및 스펙

### 3.1 권장 구성 (운영, 이중화 완전 적용) — 총 16대

| VM | 역할 | 수량 | vCPU | RAM | SSD | OS | 소프트웨어 |
|---|---|---|---|---|---|---|---|
| WEB-01/02 | 웹 서버(정적 호스팅+리버스 프록시) | 2 | 2 | 4GB | 50GB | Rocky Linux 9.x | nginx 1.24+ |
| WAS-01/02 | 포털 WAS(Backstage backend) | 2 | 4 | 8GB | 100GB | Rocky Linux 9.x | Node.js 20 LTS, PM2 또는 systemd |
| DB-01/02 | PostgreSQL 주/대기 | 2 | 4 | 16GB | 200GB (+WAL 100GB) | Rocky Linux 9.x | PostgreSQL 16, streaming replication |
| OS-01/02/03 | OpenSearch 클러스터(검색/카탈로그 색인) | 3 | 8 | 16GB (힙 8GB) | 500GB | Rocky Linux 9.x | OpenSearch 2.x |
| KC-01/02 | Keycloak IAM (OIDC/SSO/RBAC) | 2 | 2 | 4GB | 50GB | Rocky Linux 9.x | Keycloak 24+ (DB는 PostgreSQL 공유 스키마) |
| ST-01/02 | 스토리지(반입·반출 파일, K-RMF 증빙) | 2 | 4 | 8GB | 2TB+ (확장형) | Rocky Linux 9.x | MinIO (또는 NFS 서버) |
| MON-01 | 모니터링/관제 | 1 | 2 | 8GB | 200GB | Rocky Linux 9.x | Prometheus, Grafana, Alertmanager |
| LOG-01 | 감사·중앙 로그 | 1 | 2 | 8GB | 500GB | Rocky Linux 9.x | OpenSearch 단일노드 또는 Graylog |
| BAK-01 | 백업 서버 | 1 | 2 | 4GB | 4TB (HDD RAID 또는 NAS 마운트) | Rocky Linux 9.x | pgBackRest, restic/rsync |
| BAST-01 | 관리자 접속(Bastion) | 1 | 2 | 4GB | 50GB | Rocky Linux 9.x | ssh, 세션 녹화(선택) |

### 3.2 최소 구성 (1단계 도입/PoC 운영) — 총 8대

| VM | 역할 | 수량 | vCPU | RAM | SSD | 비고 |
|---|---|---|---|---|---|---|
| WEB×1 | 웹 서버 | 1 | 2 | 4GB | 50GB | 이중화는 2단계 추가 |
| WAS×1 | 포털 WAS | 1 | 4 | 8GB | 100GB | |
| DB×1(+대기 슬롯) | PostgreSQL | 1 | 4 | 16GB | 200GB | 예산 확보 시 대기 추가 |
| OS×1 | OpenSearch 단일노드 | 1 | 4 | 16GB | 300GB | |
| KC×1 | Keycloak | 1 | 2 | 4GB | 50GB | |
| ST×1 | 스토리지 | 1 | 2 | 8GB | 2TB | |
| MON×1 | 모니터링+로그 통합 | 1 | 2 | 8GB | 300GB | LOG 통합 |
| BAK×1 | 백업+Bastion 통합 | 1 | 2 | 4GB | 4TB | |

### 3.3 스펙 산정 근거

- **WEB**: 정적 파일 서빙+TLS 종료 중심. CPU보다 NIC 대역이 관건. 2vCPU/4GB로 500 동시 접속 충분, keepalive·gzip·브라우저 캐시 헤더 적용.
- **WAS**: Backstage backend는 Node.js 단일 프로세스 이벤트 루프. 인스턴스당 4vCPU/8GB에서 PM2 클러스터(2~3 프로세스) 기준 50 RPS 여유. 피크 대비 수평 확장(WAS-03 추가) 경로 확보.
- **DB**: 포털 트랜잭션(사용자/프로젝트/승인/크레딧/감사로그)은 읽기 비중이 높고 쓰기는 승인·등록 이벤트성. 16GB RAM이면 활성 데이터셋(수 GB) 캐시 충분. shared_buffers 4GB, effective_cache_size 12GB 기준.
- **OpenSearch**: 카탈로그 메타(수백만 문서 목표) + 통합검색 유사도 확장 대비 3노드 quorum. 힙은 RAM의 50%(최대 16GB 상한 권장), 데이터 노드 SSD 필수.
- **스토리지**: 반입·반출 대상 파일(데이터셋/모델)과 K-RMF 증빙(문서/캡처/로그)은 수 TB 단위로 증가. MinIO 2노드 erasure 또는 외부 NAS(NFS) 마운트 중 택일. **파일 원본은 포털 DB가 아니라 이 계층에 둔다.**
- **로그**: 감사로그 보존 1년+ 가정 시 월 수십 GB. LOG-01을 별도 두어 업무 DB와 분리(K-RMF 감사 추적 요구).

---

## 4. L4 기반 이중화 설계

### 4.1 구성

| 항목 | 내용 |
|---|---|
| L4 장비 | 상용 L4 스위치 ×2 (Active-Standby VRRP) 또는 가상 LB(HAProxy+Keepalived ×2, VM 2대로 대체 가능 — 이 경우 VM 2대 추가) |
| 외부 VIP | `portal.<도메인>`:443 → WEB-01/02 분산 (Round Robin 또는 Least Connection) |
| 내부 VIP | `portal-api.internal`:7007 → WAS-01/02 분산 |
| 헬스체크 | WEB: TCP 443 / WAS: HTTP GET `/healthcheck` (2초 간격, 3회 실패 시 제외) |
| 세션 유지 | 불필요 — 인증은 OIDC 토큰(JWT) 기반 stateless. 세션 상태는 PostgreSQL/Keycloak이 보유하므로 sticky session 미사용 |
| TLS | L4 패스스루 권장(종단간 TLS) 또는 WEB에서 종료. 인증서는 내부 CA 발급, L4/WEB에 동일 인증서 배포 |
| 실패 시나리오 | WEB-01 다운 → L4가 WEB-02로만 송신(무중단). WAS-01 다운 → 내부 VIP가 WAS-02로 전환. L4-1 다운 → VRRP로 L4-2 승격 |

### 4.2 HAProxy+Keepalived 대체안 (L4 장비가 없을 때)

| VM | 역할 | 수량 | vCPU | RAM | SSD |
|---|---|---|---|---|---|
| LB-01/02 | HAProxy + Keepalived (VIP VRRP) | 2 | 2 | 2GB | 30GB |

---

## 5. 네트워크 및 보안 구획

| 구역 | 수용 VM | 개방 포트(최소) |
|---|---|---|
| DMZ(사용자 접속) | L4 VIP, WEB-01/02 | 외부→443만. WEB→WAS 7007, WEB→KC 8443 |
| 업무망(App) | WAS, DB, OS, KC, ST | WAS→DB 5432, WAS→OS 9200, WAS→ST 9000, WAS→데이터/AI 플랫폼 연계(방화벽 정책 별도), KC→DB 5432 |
| 관리망 | MON, LOG, BAK, BAST | BAST→전 VM ssh 22, 전 VM→MON 9090(node exporter 9100), 전 VM→LOG 5044/9200 |
| 백업망(선택) | BAK↔DB/ST/OS | pgBackRest 8433, restic |

- 인터넷 경로 없음: OS 패키지/Node 모듈/컨테이너 이미지는 **사내 로컬 저장소**(yum 미러, npm 미러 또는 Nexus) 구축 필요
- 방화벽 정책은 VM별 인바운드 allow-list로 관리하고 정책 변경은 변경관리 절차(K-RMF 변경영향 등록)를 따른다

---

## 6. 스토리지 및 백업 설계

### 6.1 데이터 분류와 저장 위치

| 데이터 | 저장 위치 | 보존/백업 |
|---|---|---|
| 포털 업무 데이터(사용자/프로젝트/승인/크레딧/메뉴/RBAC) | DB-01/02 PostgreSQL | pgBackRest 전량(일 1회)+증분(4시간), BAK-01에 30일, 월간 12개월 |
| 검색 색인(카탈로그 메타) | OS-01~03 | 스냅샷 리포지토리(BAK 또는 ST), 일 1회. 재색인 가능 데이터는 백업 생략 가능 |
| 반입·반출 파일, K-RMF 증빙 문서 | ST-01/02 (MinIO) | 버저닝 활성 + 타 사이트/미디어 주기 복제, 삭제는 승인 워크플로우 경유 |
| 감사로그 | LOG-01 (+DB 감사 테이블) | 1년 온라인, 이후 아카이브(백업 미디어) |
| 설정/인증서/시크릿 | 각 VM 로컬 → BAK 암호화 보관 | Vault 도입 전까지 BAK-01 암호화 영역에 봉인 보관 |

### 6.2 복구 목표

| 지표 | 목표 |
|---|---|
| RPO | 4시간 (증분 백업 주기) |
| RTO | 2시간 (DB 복구+WAS 재기동 기준) |
| DR | 1단계는 동일 센터 내 이중화, 2단계에서 재해센터 복제(스토리지/DB 비동기 복제) 검토 |

---

## 7. 소프트웨어 스택 상세

| 계층 | 선정 | 대안/비고 |
|---|---|---|
| OS | Rocky Linux 9.x | RHEL 9(지원 계약 시), 국산 OS(구름OS 등) 요구 시 호환성 검증 후 대체 |
| Web Server | nginx 1.24+ | Apache 2.4 가능. 정적 캐시/gzip/brotli, 보안 헤더(CSP/HSTS) 적용 |
| WAS Runtime | Node.js 20 LTS + PM2 | Backstage backend는 Node 전용. 컨테이너 전환 시 Podman+사내 레지스트리 |
| DB | PostgreSQL 16 | Keycloak/Backstage/감사 스키마를 인스턴스 공유(스키마 분리) |
| 검색 | OpenSearch 2.x | Elasticsearch 대비 라이선스 이슈 없음, Dashboards 포함 |
| IAM | Keycloak 24+ | OIDC/SAML, 역할·그룹 클레임 → 포털 authz 어댑터(35단계 설계) |
| 오브젝트 스토리지 | MinIO | NFS(기존 NAS) 대체 가능, S3 API로 포털 연동 |
| 모니터링 | Prometheus+Grafana | node exporter + postgres exporter + custom WAS metrics |
| 로그 | OpenSearch(LOG-01) + Filebeat | Graylog 대체 가능 |

---

## 8. 계층별 포털 애플리케이션 배포 내용

| VM | 배포물 |
|---|---|
| WEB | Backstage 프론트엔드 정적 번들(`packages/app/dist`), nginx vhost(TLS, /api→내부 VIP 프록시, 캐시 헤더: `/static/**` 장기, `/api/**` no-store) |
| WAS | Backstage backend 번들, `app-config.production.yaml`(baseUrl, DB, OIDC, CORS), PM2 ecosystem(2~3 프로세스), systemd 자동 재기동 |
| DB | 포털 스키마(portal_core, keycloak, audit), 초기 마이그레이션/시드 |
| OS | `portal-catalog` 인덱스(보안등급/군/프로젝트 필드 포함 — 35단계 검색 권한 선필터의 서버 측 구현 지점) |
| KC | `kt-ai` Realm, backstage 클라이언트, 역할(6종)·그룹 매퍼 |
| ST | 버킷: `portal-import`, `portal-export`, `krmf-evidence` (버저닝/보존정책) |

---

## 9. 운영·관제 요구 (K-RMF 연계)

| 요구 | 구현 |
|---|---|
| 이중화/가용성 | WEB/WAS/DB/OS/KC 전 계층 이중화 + L4 VIP, 분기별 재해복구 모의훈련 |
| 감사로그 | 포털 감사 테이블 + LOG-01 중앙 수집, 관리자 행위(승인/반려/정책 변경) 추적 |
| 세션 관제 | Keycloak 세션 정책(동시 세션 제한/자동 로그아웃), MON에서 비정상 로그인 경보 |
| 취약점 관리 | OS/미들웨어 패치 월 1회(오프라인 저장소 경유), 취약점 스캔 분기 1회 |
| 변경관리 | VM 증설/네트워크 변경은 변경영향 등록(35단계 K-RMF 변경영향 11종 기준) |
| 증적 | 본 문서의 이중화/백업/관제 구성이 SER-004/008 구현 증적 원천 |

---

## 10. 확장 로드맵

| 단계 | 구성 | 트리거 |
|---|---|---|
| 1단계(도입) | 최소 구성 8대 | 초기 사용자 ~1,000명 |
| 2단계(안정화) | 권장 구성 16대 (전 계층 이중화) | 서비스 정식 전환, K-RMF 평가 대응 |
| 3단계(확장) | WAS+1, OS 데이터 노드+2, 스토리지 4TB→8TB, DR 센터 복제 | 동시 1,000명/데이터 5TB 초과, 재해복구 요구 확정 |

---

## 11. 요약: VM 수량 결론

| 구분 | 대수 | 합계 vCPU / RAM |
|---|---|---|
| 최소 구성 | **8대** | 20 vCPU / 64GB |
| 권장 구성(운영) | **16대** (L4 장비 별도; 가상 LB 대체 시 18대) | 64 vCPU / 168GB |
| 스토리지 용량 | 업무 SSD 약 3.5TB + 백업/아카이브 4TB 이상 | — |

> 핵심 판단: 포털은 상태를 DB/Keycloak/스토리지에 두는 stateless 애플리케이션이므로, **WEB/WAS는 L4 뒤에서 무상태 수평 확장**, **DB·스토리지·검색이 가용성의 실질 핵심**이다. 데이터 플랫폼/AI 플랫폼/클라우드-CMP의 VM은 별도 구성이며, 포털은 방화벽 정책상 연계 포트만 허용하면 된다.
