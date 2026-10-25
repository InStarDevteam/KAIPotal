import { DashboardData } from './types';

export const mockDashboardData: DashboardData = {
  currentUser: {
    displayName: '김국방',
    email: 'kim.defense@kt.com',
    role: 'AI 데이터 포털 운영자',
    currentDate: '2026.06.28',
    status: '운영 준비',
  },

  summaryMetrics: {
    datasets: 128,
    aiModels: 24,
    activeProjects: 12,
    exportPending: 5,
    creditShortageProjects: 2,
    krmfProgress: 68,
    openSearchAssets: 10,
    openMetadataStatus: '정상',
    toolCount: 13,
    newProposalCount: 5,
    pendingReviewCount: 3,
    tenantCount: 4,
    branchProjectCount: 30,
    pendingQuotaChanges: 5,
    overuseWarnings: 2,
  },

  notices: [
    {
      id: 'ntc-001',
      title: '국방지능형플랫폼포털 운영 안내',
      type: '공지',
      date: '2026-06-25',
      severity: 'info',
    },
    {
      id: 'ntc-002',
      title: '6월 정기 보안 패치 적용 예정 (OpenSearch, Keycloak)',
      type: '보안',
      date: '2026-06-24',
      severity: 'warning',
    },
    {
      id: 'ntc-003',
      title: '크레딧 부족 프로젝트 2건 확인 및 충전 요망',
      type: '시스템',
      date: '2026-06-23',
      severity: 'error',
    },
    /* K-RMF 기능 보류
{
      id: 'ntc-004',
      title: 'K-RMF 증적 제출 마감일이 7일 남았습니다.',
      type: '정책',
      date: '2026-06-22',
      severity: 'warning',
    },
*/
    {
      id: 'ntc-005',
      title: 'AI/데이터 작업 환경(컨테이너) 생성 요청 기능 오픈',
      type: '공지',
      date: '2026-06-20',
      severity: 'info',
    },
  ],

  recentAssets: [
    {
      id: 'asset-001',
      type: 'dataset',
      name: '전장영상 객체인식 데이터셋 v3.2',
      description:
        '야간·주간 전장 영상에서 탱크, 장갑차 등을 라벨링한 학습 데이터',
      tags: ['전장영상', '객체인식', 'YOLO'],
      owner: '국방AI개발팀',
      registeredAt: '2026-06-27',
    },
    {
      id: 'asset-002',
      type: 'ai_model',
      name: 'K-Drone 분류 모델 (ResNet50)',
      description: '드론 영상 기반 표적 분류를 위한 PyTorch 모델',
      tags: ['드론', '분류', 'ResNet50'],
      owner: '항공정보과',
      registeredAt: '2026-06-26',
    },
    {
      id: 'asset-003',
      type: 'dataset',
      name: '음성명령어 인식 데이터셋',
      description: '군용 음성명령어 12,000건 수집·전처리 데이터',
      tags: ['음성', 'STT', '명령어'],
      owner: '지휘통신연구소',
      registeredAt: '2026-06-25',
    },
    {
      id: 'asset-004',
      type: 'ai_model',
      name: '자연재해 영상 분할 모델 (SegFormer)',
      description: '위성·드론 영상에서 홍수·산사태 영역을 분할하는 모델',
      tags: ['영상분할', '재해', 'SegFormer'],
      owner: '재난대응팀',
      registeredAt: '2026-06-24',
    },
    {
      id: 'asset-005',
      type: 'dataset',
      name: '군용 도면 메타데이터',
      description: '장비 도면 자산의 메타데이터 및 태그 정의',
      tags: ['도면', '메타데이터', 'OpenMetadata'],
      owner: '체계개발사업단',
      registeredAt: '2026-06-23',
    },
  ],

  myProjects: [
    {
      id: 'proj-001',
      name: 'AI 데이터 거버넌스',
      status: 'running',
      pm: '김국방',
      endDate: '2026-12-31',
      resourceUsage: 72,
    },
    {
      id: 'proj-002',
      name: '전장영상 학습데이터 구축',
      status: 'running',
      pm: '박전투',
      endDate: '2026-09-30',
      resourceUsage: 58,
    },
    /* K-RMF 기능 보류
{
      id: 'proj-003',
      name: 'K-RMF 증적 자동화 연구',
      status: 'approved',
      pm: '이보안',
      endDate: '2026-11-15',
      resourceUsage: 35,
    },
*/
    {
      id: 'proj-004',
      name: '국방 AI 모델 저장소 마이그레이션',
      status: 'pending_approval',
      pm: '최모델',
      endDate: '2026-10-20',
      resourceUsage: 12,
    },
  ],

  exportPending: [
    {
      id: 'exp-001',
      targetName: '전장영상 객체인식 데이터셋 v3.2',
      targetType: 'dataset',
      requester: '이연구',
      status: 'reviewing',
      requestedAt: '2026-06-27',
    },
    {
      id: 'exp-002',
      targetName: 'K-Drone 분류 모델 (ResNet50)',
      targetType: 'ai_model',
      requester: '박개발',
      status: 'requested',
      requestedAt: '2026-06-26',
    },
    {
      id: 'exp-003',
      targetName: '군용 OCR Docker 이미지',
      targetType: 'docker_image',
      requester: '최엔지니어',
      status: 'reviewing',
      requestedAt: '2026-06-25',
    },
    {
      id: 'exp-004',
      targetName: '비밀 등급 분류 알고리즘',
      targetType: 'algorithm',
      requester: '정분석',
      status: 'need_revision',
      requestedAt: '2026-06-24',
    },
  ],

  creditSummary: {
    totalRemaining: 482500,
    monthlyEstimate: 135000,
    shortageProjects: 2,
    gpuLimitedProjects: 1,
    warnings: [
      {
        id: 'warn-001',
        projectName: '전장영상 학습데이터 구축',
        message: '잔여 크레딧이 7일 이내에 소진될 예정입니다.',
        severity: 'high',
      },
      {
        id: 'warn-002',
        projectName: 'AI 데이터 거버넌스',
        message: 'GPU 자원 제한으로 추론 속도가 저하될 수 있습니다.',
        severity: 'medium',
      },
    ],
  },

  krmfProgress: {
    totalControls: 120,
    submitted: 98,
    approved: 82,
    weakPoints: 8,
    progressRate: 68,
    highRiskIssues: [
      {
        id: 'risk-001',
        title: '개발서버 접근통제 로그 보관 주기 미흡',
        severity: 'high',
      },
      {
        id: 'risk-002',
        title: '외부 연계 API 호출 암호화 미적용',
        severity: 'critical',
      },
    ],
  },

  systemStatus: [
    { name: 'Backstage', status: '정상' },
    { name: 'Keycloak', status: '정상' },
    { name: 'OpenSearch', status: '정상' },
    { name: 'OpenMetadata', status: '정상' },
    { name: 'Integrated Search', status: '정상' },
    { name: 'Project Workspace', status: '점검' },
    { name: 'Export Approval', status: '정상' },
    { name: 'Credit Manager', status: '정상' },
    /* K-RMF 기능 보류
{ name: 'K-RMF Evidence', status: '정상' },
*/
  ],

  quickLinks: [
    {
      id: 'ql-dashboard',
      title: '통합 대시보드',
      description: '포털 메인 화면으로 요약 지표와 공지를 확인합니다.',
      type: 'internal',
      target: '/',
    },
    {
      id: 'ql-admin',
      title: '관리자 콘솔',
      description: '사용자·권한·정책·감사로그를 관리합니다.',
      type: 'internal',
      target: '/admin-console',
      adminOnly: true,
    },
    /* K-RMF 기능 보류
{
      id: 'ql-krmf',
      title: 'K-RMF 증빙관리',
      description: 'K-RMF 평가 증빙 자료를 관리합니다.',
      type: 'internal',
      target: '/krmf-evidence',
    },
*/
    {
      id: 'ql-service-catalog',
      title: '서비스/도구 카탈로그',
      description:
        'AI/데이터 작업 환경(컨테이너) 구성에 필요한 머신러닝/분석 프레임워크/라이브러리, 라벨링/시각화/학습데이터 구축 도구를 조회·선택·요청합니다.',
      type: 'internal',
      target: '/service-catalog',
    },
    {
      id: 'ql-export',
      title: '반입·반출 승인',
      description: '데이터·모델·산출물 반입·반출 승인 workflow를 관리합니다.',
      type: 'internal',
      target: '/export-approval',
    },
    {
      id: 'ql-search',
      title: '통합검색',
      description:
        '데이터셋·AI 모델·Docker 이미지·PyPI 패키지·컨테이너 라이브러리·분석/시각화/라벨링 도구·서비스 카탈로그·문서를 통합 검색합니다.',
      type: 'internal',
      target: '/integrated-search',
    },
    {
      id: 'ql-project',
      title: '프로젝트/워크스페이스',
      description:
        'AI/데이터 연구·개발 프로젝트 및 워크스페이스 논리묶음을 관리하고 AI/데이터 작업 환경(컨테이너) 생성을 요청합니다.',
      type: 'internal',
      target: '/project-workspace',
    },
    {
      id: 'ql-credit',
      title: '크레딧 관리',
      description: '프로젝트 크레딧과 자원 사용량을 관리합니다.',
      type: 'internal',
      target: '/credit-manager',
    },
    {
      id: 'ql-my-page',
      title: '마이페이지',
      description: '개인 정보·활동·프로젝트·크레딧 내역을 관리합니다.',
      type: 'internal',
      target: '/my-page',
    },
    {
      id: 'ql-environment',
      title: '환경설정',
      description: '시스템 파라미터·보안 정책·자원할당 기준을 관리합니다.',
      type: 'internal',
      target: '/environment-settings',
    },
    {
      id: 'ql-tenant',
      title: '육해공군 관리',
      description: '군별 테넌트·리소스·쿼터·사용량을 관리합니다.',
      type: 'internal',
      target: '/tenant-management',
    },
    {
      id: 'ql-proposal',
      title: '제안 게시판',
      description: 'AI·데이터 아이디어를 제안하고 공감·검토합니다.',
      type: 'internal',
      target: '/proposal-board',
    },
  ],
};
