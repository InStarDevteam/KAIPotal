import {
  portalFeatureRequirements,
  sfrRequirementSummaries,
  requirementChangeHistories,
  requirementQuestions,
} from '../requirement-progress/mockRequirementProgressData';
import {
  MenuRequirementCoverage,
  SfrCoverageDetail,
  FeatureCoverageDetail,
  PlatformRole,
} from './types';

const routeToMenuId: Record<string, string> = {
  '/': 'portal-dashboard',
  '/admin-console': 'admin-console',
  '/krmf-evidence': 'krmf-evidence',
  '/service-catalog': 'service-catalog',
  '/export-approval': 'export-approval',
  '/integrated-search': 'integrated-search',
  '/project-workspace': 'project-workspace',
  '/credit-manager': 'credit-manager',
  '/my-page': 'my-page',
  '/environment-settings': 'environment-settings',
  '/tenant-management': 'tenant-management',
  '/proposal-board': 'proposal-board',
  '/requirement-progress': 'requirement-coverage',
  '/requirement-coverage': 'requirement-coverage',
  '/platform-api-integration': 'platform-api-integration',
};

interface MenuCoverageSeed {
  menuId: string;
  menuName: string;
  route: string;
  visibleTo: 'all' | 'admin';
  primarySfrIds: string[];
  rfpMappingReason: string;
  relatedPlatformRoles: PlatformRole[];
}

const menuCoverageSeeds: MenuCoverageSeed[] = [
  {
    menuId: 'portal-dashboard',
    menuName: '통합 대시보드',
    route: '/',
    visibleTo: 'all',
    primarySfrIds: ['SFR-001', 'SFR-012'],
    rfpMappingReason: 'SFR-001 메인 포털 단일 접점 및 SFR-012 통합현황/공지 제공',
    relatedPlatformRoles: ['포털', '지능형 서비스'],
  },
  {
    menuId: 'admin-console',
    menuName: '관리자 콘솔',
    route: '/admin-console',
    visibleTo: 'admin',
    primarySfrIds: ['SFR-003', 'SFR-004', 'SFR-005', 'SFR-006'],
    rfpMappingReason: 'SFR-003 사용자 관리, SFR-004 정책/이력, SFR-005 권한/RBAC, SFR-006 메뉴/프로그램 관리',
    relatedPlatformRoles: ['포털', '인증/권한', '보안/K-RMF'],
  },
  {
    menuId: 'krmf-evidence',
    menuName: 'K-RMF 증빙관리',
    route: '/krmf-evidence',
    visibleTo: 'all',
    primarySfrIds: ['SFR-002', 'SFR-004'],
    rfpMappingReason: 'SFR-002 인증/보안통제, SFR-004 정책/감사 이력의 K-RMF 증빙 자료 관리',
    relatedPlatformRoles: ['포털', '보안/K-RMF'],
  },
  {
    menuId: 'service-catalog',
    menuName: '서비스/도구 카탈로그',
    route: '/service-catalog',
    visibleTo: 'all',
    primarySfrIds: ['SFR-007', 'SFR-008', 'SFR-014'],
    rfpMappingReason: 'SFR-007 AI 작업 환경(컨테이너), SFR-008 데이터 작업 환경(컨테이너), SFR-014 데이터/도구 카탈로그 조회',
    relatedPlatformRoles: ['포털', 'AI 플랫폼', '데이터 플랫폼'],
  },
  {
    menuId: 'export-approval',
    menuName: '반입·반출 승인',
    route: '/export-approval',
    visibleTo: 'all',
    primarySfrIds: ['SFR-009', 'SFR-010', 'SFR-011', 'SFR-012'],
    rfpMappingReason: 'SFR-009 반입, SFR-010 AI 성과 반출, SFR-011 데이터 분석 성과 반출, SFR-012 플랫폼 연동',
    relatedPlatformRoles: ['포털', '보안/K-RMF', 'AI 플랫폼', '데이터 플랫폼'],
  },
  {
    menuId: 'integrated-search',
    menuName: '통합검색',
    route: '/integrated-search',
    visibleTo: 'all',
    primarySfrIds: ['SFR-014', 'SFR-015'],
    rfpMappingReason: 'SFR-014 데이터/모델/도구 카탈로그, SFR-015 다중 저장소 자원 통합검색 및 유사도 검색',
    relatedPlatformRoles: ['포털', '데이터 플랫폼', 'AI 플랫폼'],
  },
  {
    menuId: 'project-workspace',
    menuName: '프로젝트/워크스페이스',
    route: '/project-workspace',
    visibleTo: 'all',
    primarySfrIds: ['SFR-016', 'SFR-018'],
    rfpMappingReason: 'SFR-016 프로젝트 관리, SFR-018 워크스페이스 논리묶음·신청·승인·자원 사용량 조회',
    relatedPlatformRoles: ['포털', 'AI 플랫폼', '데이터 플랫폼', '지능형 클라우드/CMP'],
  },
  {
    menuId: 'credit-manager',
    menuName: '크레딧 관리',
    route: '/credit-manager',
    visibleTo: 'all',
    primarySfrIds: ['SFR-016', 'SFR-017', 'SFR-018'],
    rfpMappingReason: 'SFR-016 프로젝트 관리, SFR-017 크레딧/자원 사용량, SFR-018 워크스페이스 논리묶음·자원 사용량 조회',
    relatedPlatformRoles: ['포털', '지능형 클라우드/CMP'],
  },
  {
    menuId: 'my-page',
    menuName: '마이페이지',
    route: '/my-page',
    visibleTo: 'all',
    primarySfrIds: ['SFR-019'],
    rfpMappingReason: 'SFR-019 사용자 개인 정보/활동/프로젝트/워크스페이스/크레딧/세션/API 키 관리',
    relatedPlatformRoles: ['포털', '인증/권한'],
  },
  {
    menuId: 'environment-settings',
    menuName: '환경설정',
    route: '/environment-settings',
    visibleTo: 'all',
    primarySfrIds: ['SFR-020'],
    rfpMappingReason: 'SFR-020 시스템/보안/운영 설정 및 변경 이력 관리',
    relatedPlatformRoles: ['포털', '보안/K-RMF'],
  },
  {
    menuId: 'tenant-management',
    menuName: '육해공군 관리',
    route: '/tenant-management',
    visibleTo: 'all',
    primarySfrIds: ['SFR-021'],
    rfpMappingReason: 'SFR-021 육해공군 멀티테넌트/리소스/쿼터/권한 위임 관리',
    relatedPlatformRoles: ['포털', '인증/권한', '지능형 클라우드/CMP'],
  },
  {
    menuId: 'proposal-board',
    menuName: '제안 게시판',
    route: '/proposal-board',
    visibleTo: 'all',
    primarySfrIds: ['SFR-013'],
    rfpMappingReason: 'SFR-013 AI/데이터 아이디어 제안 및 관리자 검토/공지',
    relatedPlatformRoles: ['포털'],
  },
  {
    menuId: 'requirement-coverage',
    menuName: '요구사항 대응현황',
    route: '/requirement-coverage',
    visibleTo: 'admin',
    primarySfrIds: [
      'SFR-001', 'SFR-002', 'SFR-003', 'SFR-004', 'SFR-005', 'SFR-006',
      'SFR-007', 'SFR-008', 'SFR-009', 'SFR-010', 'SFR-011', 'SFR-012',
      'SFR-013', 'SFR-014', 'SFR-015', 'SFR-016', 'SFR-017', 'SFR-018',
      'SFR-019', 'SFR-020', 'SFR-021',
    ],
    rfpMappingReason: 'SFR-001~SFR-021 전체 요구사항 대응현황 총괄 조회',
    relatedPlatformRoles: ['포털'],
  },
  {
    menuId: 'platform-api-integration',
    menuName: '플랫폼 API 연계현황',
    route: '/platform-api-integration',
    visibleTo: 'admin',
    primarySfrIds: ['SFR-012', 'SFR-014', 'SFR-015', 'SFR-016', 'SFR-017', 'SFR-018', 'SFR-021'],
    rfpMappingReason: 'SFR-012 플랫폼 연동, SFR-014/015 데이터/AI 모델 조회, SFR-016/017/018 프로젝트/자원 연계, SFR-021 권한/위임 연계',
    relatedPlatformRoles: ['포털', '데이터 플랫폼', 'AI 플랫폼', '지능형 클라우드/CMP', '인증/권한', '보안/K-RMF'],
  },
];

export const menuRequirementCoverage: MenuRequirementCoverage[] =
  menuCoverageSeeds.map(seed => {
    const features = portalFeatureRequirements.filter(f => {
      const mappedMenuId = routeToMenuId[f.relatedScreenRoute ?? '/'];
      return mappedMenuId === seed.menuId;
    });
    const relatedFeatureNos = features.map(f => f.no);
    const featureSfrIds = Array.from(
      new Set(
        features.flatMap(f => f.rfpId.split(',').map(s => s.trim())),
      ),
    );
    const relatedSfrIds = Array.from(
      new Set([...seed.primarySfrIds, ...featureSfrIds]),
    );

    const implemented = features
      .filter(f => f.implementationStatus === '화면구현')
      .map(f => `[${f.no}] ${f.detailFunction}`);
    const partial = features
      .filter(f => f.implementationStatus === '부분구현')
      .map(f => `[${f.no}] ${f.detailFunction}`);
    const followUp = features
      .filter(
        f =>
          f.implementationStatus === '후속개발' ||
          f.implementationStatus === '미구현' ||
          f.implementationStatus === '검토필요',
      )
      .map(f => `[${f.no}] ${f.detailFunction}`);

    const completedCount = features.filter(
      f => f.implementationStatus === '화면구현',
    ).length;
    const partialCount = features.filter(
      f => f.implementationStatus === '부분구현',
    ).length;
    const followUpCount =
      features.length - completedCount - partialCount;

    return {
      ...seed,
      relatedSfrIds,
      relatedFeatureNos,
      coverageSummary: `화면구현 ${completedCount}건, 부분구현 ${partialCount}건, 후속/미구현 ${followUpCount}건`,
      implementedItems: implemented,
      partialItems: partial,
      followUpItems: followUp,
    };
  });

export const sfrCoverageDetails: SfrCoverageDetail[] =
  sfrRequirementSummaries.map(sfr => {
    const relatedMenus = menuRequirementCoverage.filter(m =>
      m.relatedSfrIds.includes(sfr.sfrId),
    );
    return {
      ...sfr,
      relatedMenuIds: relatedMenus.map(m => m.menuId),
      relatedMenuNames: relatedMenus.map(m => m.menuName),
      rfpMappingReason: `${sfr.sfrId} ${sfr.title} 요구사항을 ${relatedMenus.map(m => m.menuName).join(', ')} 메뉴에서 대응`,
    };
  });

export const featureCoverageDetails: FeatureCoverageDetail[] =
  portalFeatureRequirements.map(f => {
    const menuId = routeToMenuId[f.relatedScreenRoute ?? '/'];
    const menu = menuRequirementCoverage.find(m => m.menuId === menuId);
    const relatedPlatformRoles = menu?.relatedPlatformRoles ?? ['포털'];
    return {
      no: f.no,
      sfrId: f.rfpId,
      category: f.category,
      detailFunction: f.detailFunction,
      relatedMenuId: menuId,
      relatedMenuName: menu?.menuName ?? '통합 대시보드',
      implementationStatus: f.implementationStatus,
      relatedPlatformRoles,
      apiIntegrationRequired:
        relatedPlatformRoles.includes('데이터 플랫폼') ||
        relatedPlatformRoles.includes('AI 플랫폼') ||
        relatedPlatformRoles.includes('지능형 클라우드/CMP') ||
        relatedPlatformRoles.includes('인증/권한') ||
        relatedPlatformRoles.includes('보안/K-RMF'),
      followUpAction: f.actionItem,
    };
  });

export {
  requirementChangeHistories as requirementCoverageChangeHistories,
  requirementQuestions as requirementCoverageQuestions,
};
