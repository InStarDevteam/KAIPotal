import SvgIcon from '@material-ui/core/SvgIcon';
import HomeIcon from '@material-ui/icons/HomeOutlined';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccountOutlined';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUserOutlined';
import HistoryIcon from '@material-ui/icons/HistoryOutlined';
import AppsIcon from '@material-ui/icons/AppsOutlined';
import SwapHorizIcon from '@material-ui/icons/SwapHorizOutlined';
import SearchIcon from '@material-ui/icons/SearchOutlined';
import WorkIcon from '@material-ui/icons/WorkOutlined';
import AccountBalanceIcon from '@material-ui/icons/AccountBalanceOutlined';
import PersonIcon from '@material-ui/icons/PersonOutlined';
import PeopleIcon from '@material-ui/icons/PeopleOutlined';
import SettingsIcon from '@material-ui/icons/SettingsOutlined';
import AccountTreeIcon from '@material-ui/icons/AccountTreeOutlined';
import ExtensionIcon from '@material-ui/icons/ExtensionOutlined';
import { PortalPermission } from '../authz';

export interface PortalMenuDefinition {
  id: string;
  title: string;
  route: string;
  group: PortalMenuGroup;
  journeyStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  sfrIds: string[];
  requiredAnyPermissions: PortalPermission[];
  description: string;
  icon: typeof SvgIcon;
  captureOrder?: number;
}

export const portalMenuGroups = [
  '포털 공통',
  '플랫폼 연계',
  '프로젝트 운영',
  '사용자/조직',
  '사용자 지원',
  '관리/보안',
] as const;

export type PortalMenuGroup = (typeof portalMenuGroups)[number];

export const portalMenuDefinitions: PortalMenuDefinition[] = [
  {
    id: 'portal-dashboard',
    title: '포털 홈',
    route: '/',
    group: '포털 공통',
    journeyStep: 1,
    sfrIds: ['SFR-001', 'SFR-012'],
    requiredAnyPermissions: ['portal.view'],
    description: 'AI, 데이터, 클라우드, VDI 플랫폼 바로가기',
    icon: HomeIcon,
  },
  {
    id: 'portal-work',
    title: '포털 업무',
    route: '/portal-work',
    group: '포털 공통',
    journeyStep: 1,
    sfrIds: [],
    requiredAnyPermissions: ['portal.view'],
    description: '권한에 맞는 프로젝트, 신청 및 운영 업무 시작',
    icon: WorkIcon,
  },
  {
    id: 'admin-console',
    title: '관리자 콘솔',
    route: '/admin-console',
    group: '관리/보안',
    journeyStep: 2,
    sfrIds: ['SFR-003', 'SFR-004', 'SFR-005', 'SFR-006'],
    requiredAnyPermissions: ['user.manage', 'rbac.manage', 'menu.manage'],
    description: '사용자 관리, 정책/이력, 권한/RBAC, 메뉴/프로그램 관리',
    icon: SupervisorAccountIcon,
  },
  {
    id: 'role-menu-preview',
    title: '권한별 메뉴 미리보기',
    route: '/role-menu-preview',
    group: '관리/보안',
    journeyStep: 2,
    sfrIds: ['SFR-005', 'SFR-021'],
    requiredAnyPermissions: ['menu.manage', 'rbac.manage'],
    description: '역할별로 접근 가능한 메뉴와 권한을 비교·확인',
    icon: PeopleIcon,
  },
  {
    id: 'krmf-monitor',
    title: 'K-RMF 현황',
    route: '/krmf-monitor',
    group: '관리/보안',
    journeyStep: 8,
    sfrIds: ['SFR-002', 'SFR-004'],
    requiredAnyPermissions: ['krmf.view'],
    description: 'K-RMF 통제 이행 현황과 증적·조치·변경을 모니터링',
    icon: VerifiedUserIcon,
  },
  {
    id: 'integrated-search',
    title: '통합검색',
    route: '/integrated-search',
    group: '플랫폼 연계',
    journeyStep: 3,
    sfrIds: ['SFR-014', 'SFR-015'],
    requiredAnyPermissions: ['catalog.view'],
    description:
      '데이터셋·AI 모델·Docker 이미지·PyPI 패키지·컨테이너 라이브러리·분석/시각화/라벨링 도구·서비스 카탈로그·문서를 통합 검색',
    icon: SearchIcon,
  },
  {
    id: 'service-catalog',
    title: '서비스/도구 카탈로그',
    route: '/service-catalog',
    group: '플랫폼 연계',
    journeyStep: 3,
    sfrIds: ['SFR-007', 'SFR-008', 'SFR-014'],
    requiredAnyPermissions: ['catalog.view'],
    description:
      'AI/데이터 작업 환경(컨테이너) 구성에 필요한 Docker 이미지, PyPI 패키지, 컨테이너 라이브러리, 분석/시각화/라벨링/학습데이터 구축 도구, 머신러닝/분석 프레임워크/라이브러리, 서비스 카탈로그를 조회·선택·요청',
    icon: AppsIcon,
  },
  {
    id: 'project-workspace',
    title: '프로젝트/워크스페이스',
    route: '/project-workspace',
    group: '프로젝트 운영',
    journeyStep: 4,
    sfrIds: ['SFR-016', 'SFR-018'],
    requiredAnyPermissions: ['project.request', 'project.approve'],
    description:
      'AI/데이터 연구·개발 프로젝트 및 워크스페이스 논리묶음을 관리하고 AI/데이터 작업 환경(컨테이너) 생성을 요청·승인·상태조회',
    icon: WorkIcon,
  },
  {
    id: 'credit-manager',
    title: '크레딧 관리',
    route: '/credit-manager',
    group: '프로젝트 운영',
    journeyStep: 6,
    sfrIds: ['SFR-016', 'SFR-017', 'SFR-018'],
    requiredAnyPermissions: ['credit.view', 'credit.approve'],
    description: '프로젝트별 크레딧 할당·사용량·잔액 관리',
    icon: AccountBalanceIcon,
  },
  {
    id: 'export-approval',
    title: '반입·반출 승인',
    route: '/export-approval',
    group: '프로젝트 운영',
    journeyStep: 7,
    sfrIds: ['SFR-009', 'SFR-010', 'SFR-011', 'SFR-012'],
    requiredAnyPermissions: ['export.request', 'export.review'],
    description: '데이터 반입·반출 신청·승인·보안 검토 workflow',
    icon: SwapHorizIcon,
  },
  {
    id: 'my-page',
    title: '마이페이지',
    route: '/my-page',
    group: '사용자/조직',
    journeyStep: 8,
    sfrIds: ['SFR-019'],
    requiredAnyPermissions: ['portal.view'],
    description: '사용자 개인 정보·활동·프로젝트·크레딧 내역 관리',
    icon: PersonIcon,
  },
  {
    id: 'environment-settings',
    title: '환경설정',
    route: '/environment-settings',
    group: '사용자/조직',
    journeyStep: 8,
    sfrIds: ['SFR-020'],
    requiredAnyPermissions: ['settings.manage'],
    description: '시스템 파라미터·보안 정책·자원할당 기준 관리',
    icon: SettingsIcon,
  },
  {
    id: 'tenant-management',
    title: '테넌트·접근 관리',
    route: '/tenant-management',
    group: '사용자/조직',
    journeyStep: 2,
    sfrIds: ['SFR-021'],
    requiredAnyPermissions: ['tenant.manage'],
    description: '육해공군별 테넌트·리소스·쿼터·사용량 관리',
    icon: AccountTreeIcon,
  },
  {
    id: 'tenant-settings',
    title: '군별 포털 설정',
    route: '/tenant-settings',
    group: '사용자/조직',
    journeyStep: 8,
    sfrIds: [],
    requiredAnyPermissions: ['tenant.manage', 'settings.manage', 'menu.manage'],
    description: '군별 색상 테마, 로고, 공통 문구와 메뉴 구성을 관리합니다.',
    icon: SettingsIcon,
  },
  {
    id: 'developer-console',
    title: '개발 관리자',
    route: '/developer-console',
    group: '관리/보안',
    journeyStep: 8,
    sfrIds: [],
    requiredAnyPermissions: ['integration.view'],
    description: '플랫폼 관계와 API 계약, 연동 테스트 및 접속 진단',
    icon: AccountTreeIcon,
  },

  {
    id: 'audit-history',
    title: '접속·사용 이력',
    route: '/audit-history',
    group: '관리/보안',
    journeyStep: 8,
    sfrIds: [],
    requiredAnyPermissions: ['audit.view'],
    description:
      '사용자 접속, 서비스 이용, 관리자 변경 이력을 통합 조회합니다.',
    icon: HistoryIcon,
  },
  {
    id: 'proposal-board',
    title: '제안 게시판',
    route: '/proposal-board',
    group: '사용자 지원',
    journeyStep: 8,
    sfrIds: ['SFR-013'],
    requiredAnyPermissions: ['portal.view'],
    description: 'AI·데이터 아이디어 제안 및 관리자 검토·공지',
    icon: ExtensionIcon,
  },
];

export const getMenuByGroup = (group: PortalMenuGroup) =>
  portalMenuDefinitions.filter(m => m.group === group);

export const getVisibleMenus = (
  has: (permissions: PortalPermission[]) => boolean,
) => portalMenuDefinitions.filter(menu => has(menu.requiredAnyPermissions));
