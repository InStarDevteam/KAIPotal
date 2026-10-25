# 메뉴·기능·SFR 연계 가이드

> 본 문서는 국방지능형플랫폼포털 왼쪽 메뉴와 RFP/SFR 요구사항 간 연계를 정의합니다.  
> 28단계에서 메뉴 순서를 RFP/SFR 흐름에 맞춰 재정렬하였습니다.

## 메뉴 재정렬 원칙

- 기존 라우트 URL은 변경하지 않는다.
- 기존 컴포넌트 파일명은 변경하지 않는다.
- 메뉴 표시 순서와 그룹만 RFP/SFR 흐름에 맞춰 조정한다.
- 관리자 전용 메뉴 제어는 29단계에서 구현한다.

## 메뉴 구성

| 순서 | 메뉴 | 라우트 | 그룹 | 관련 SFR | 설명 |
|---|---|---|---|---|---|
| 1 | 통합 대시보드 | `/` | 포털 공통 | SFR-001, SFR-012 | 포털 메인 화면, 요약 지표, 공지, Quick Links |
| 2 | 관리자 콘솔 | `/admin-console` | 관리/보안 | SFR-003, SFR-004, SFR-005, SFR-006 | 사용자·권한·정책·감사·메뉴/프로그램 관리 |
| 3 | K-RMF 증빙관리 | `/krmf-evidence` | 관리/보안 | SFR-002, SFR-004 | K-RMF 평가 증빙 자료 관리 |
| 4 | 서비스/도구 카탈로그 | `/service-catalog` | 플랫폼 연계 | SFR-007, SFR-008, SFR-014 | AI/데이터 개발 도구 조회·선택·요청 |
| 5 | 반입·반출 승인 | `/export-approval` | 플랫폼 연계 | SFR-009, SFR-010, SFR-011, SFR-012 | 데이터 반입·반출 신청·승인·보안 검토 |
| 6 | 통합검색 | `/integrated-search` | 플랫폼 연계 | SFR-014, SFR-015 | 데이터셋·AI 모델·도구·문서 통합 검색 |
| 7 | 프로젝트/워크스페이스 | `/project-workspace` | 프로젝트 운영 | SFR-016, SFR-018 | AI 연구/개발 프로젝트 및 워크스페이스 관리 |
| 8 | 크레딧 관리 | `/credit-manager` | 프로젝트 운영 | SFR-016, SFR-017, SFR-018 | 프로젝트별 크레딧·자원 사용량 관리 |
| 9 | 마이페이지 | `/my-page` | 사용자/조직 | SFR-019 | 사용자 개인 정보·활동·프로젝트·크레딧 내역 |
| 10 | 환경설정 | `/environment-settings` | 사용자/조직 | SFR-020 | 시스템 파라미터·보안 정책·자원할당 기준 |
| 11 | 육해공군 관리 | `/tenant-management` | 사용자/조직 | SFR-021 | 군별 테넌트·리소스·쿼터·사용량 관리 |
| 12 | 제안 게시판 | `/proposal-board` | 사용자 지원 | SFR-013 | AI·데이터 아이디어 제안·검토·공지 |

## 로그인/인증 안내

- 별도의 `로그인/인증 안내` 메뉴는 생성하지 않는다.
- 로그인/로그아웃 관련 요구사항(SFR-002)은 관리자 콘솔 정책 화면, 마이페이지 세션 관리, 데모 로그인 안내 문서에서 설명한다.

## Quick Links 우선순위

통합 대시보드 Quick Links는 왼쪽 메뉴 순서와 동일하게 정렬한다.

1. 통합 대시보드
2. 관리자 콘솔
3. 서비스/도구 카탈로그
4. 반입·반출 승인
5. 통합검색
6. 프로젝트/워크스페이스
7. 크레딧 관리
8. 마이페이지
9. 환경설정
10. 육해공군 관리
11. K-RMF 증빙관리
12. 제안 게시판

## SFR 메뉴 매핑 요약

| SFR | 메뉴 |
|---|---|
| SFR-001 | 통합 대시보드 |
| SFR-002 | 로그인/인증 안내(문서화), K-RMF 증빙관리 |
| SFR-003 | 관리자 콘솔(사용자 관리) |
| SFR-004 | 관리자 콘솔(정책/이력), K-RMF 증빙관리 |
| SFR-005 | 관리자 콘솔(권한/RBAC) |
| SFR-006 | 관리자 콘솔(메뉴/프로그램 관리) |
| SFR-007 | 서비스/도구 카탈로그(AI 작업환경) |
| SFR-008 | 서비스/도구 카탈로그(데이터 작업환경) |
| SFR-009 | 반입·반출 승인(반출입서버) |
| SFR-010 | 반입·반출 승인(AI 성과 반출) |
| SFR-011 | 반입·반출 승인(데이터 분석 성과 반출) |
| SFR-012 | 통합 대시보드, 반입·반출 승인, 서비스/도구 카탈로그(플랫폼 연동) |
| SFR-013 | 제안 게시판 |
| SFR-014 | 서비스/도구 카탈로그, 통합검색(카탈로그 조회) |
| SFR-015 | 통합검색 |
| SFR-016 | 프로젝트/워크스페이스, 크레딧 관리(프로젝트 관리) |
| SFR-017 | 크레딧 관리 |
| SFR-018 | 프로젝트/워크스페이스, 크레딧 관리(워크스페이스 관리 요청) |
| SFR-019 | 마이페이지 |
| SFR-020 | 환경설정 |
| SFR-021 | 육해공군 관리 |

## 구현 파일

- `backstage-portal/packages/app/src/components/navigation/portalMenuDefinitions.ts`
- `backstage-portal/packages/app/src/components/navigation/index.ts`
- `backstage-portal/packages/app/src/App.tsx`
- `backstage-portal/packages/app/src/components/portal-dashboard/mockDashboardData.ts`
- `backstage-portal/packages/app/src/components/portal-dashboard/QuickLinkCards.tsx`
