# 서비스/도구 카탈로그 및 제안 게시판 설계

## 1. 요구사항 대응 범위

### 서비스/도구 카탈로그

- 73 분석 프레임워크 선택
- 74 개발도구 선택
- 75 데이터 도구 선택
- 76 시각화 도구 선택
- 77 라벨링 도구 선택
- 78 직접 입력
- 79 카탈로그 선택

### 제안 게시판

- 143 제안 등록
- 144 기본정보 입력
- 145 제안 구분
- 146 필요성 입력
- 147 활용 가능성 입력
- 148 공감 등록
- 149 제안 승인/공지

## 2. 현재 구현 범위

- mock data 기반 화면
- mock 도구 선택
- mock 직접 입력 요청
- mock 제안 등록
- mock 공감/추천
- mock 관리자 검토
- 실제 DB/API 연동 없음
- 실제 파일 업로드 없음
- 실제 OpenMetadata/Docker Registry/PyPI Mirror 연동 없음
- 실제 알림/게시판 backend 없음

## 3. 화면 구성

### Service Catalog

- `/service-catalog` 메인
- 상단 요약 카드: 전체/카테고리별/상태별 도구 수
- 탭: 전체, 분석 프레임워크, 개발도구, 데이터 도구, 시각화 도구, 라벨링 도구, 직접 입력 요청, 요구사항 대응 현황
- 도구 목록/상세 패널
- 도구 선택 패널(프로젝트/워크스페이스/버전/사유)
- 직접 입력 요청 폼 및 요청 목록

### Proposal Board

- `/proposal-board` 메인
- 상단 요약 카드: 전체/상태/구분별 제안 수
- 탭: 전체 제안, AI 모델 개발, 빅데이터 분석, 데이터셋 구축, 내 제안, 관리자 검토, 요구사항 대응 현황
- 제안 목록/상세 패널
- 제안 등록 폼
- 공감/추천/관심/댓글 UI
- 관리자 검토 및 공지 승인 UI

## 4. 후속 연동 방향

- OpenMetadata catalog 연동
- Docker Registry 연동
- PyPI Mirror 연동
- Tool approval workflow 연동
- Workspace provisioning 연동
- Proposal DB/API 연동
- Notification 연동
- 첨부파일 저장소 연동
