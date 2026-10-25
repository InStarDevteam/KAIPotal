import {
  ProjectCredit,
  ChargeHistory,
  UsageHistory,
  ResourcePrice,
  ResourceRestriction,
  CreditAlert,
  CreditStatus,
  ResourceType,
} from './types';

export const mockProjectCredits: ProjectCredit[] = [
  {
    projectId: 'P-2025-001',
    projectName: 'DIMS 정비이력 분석 프로젝트',
    ownerOrganization: '군수정책과',
    pm: '김관리',
    totalCredits: 50000,
    usedCredits: 12500,
    remainingCredits: 37500,
    usageRate: 25,
    estimatedDays: 90,
    status: 'normal',
    lastUsedAt: '2025-06-25T10:00:00Z',
  },
  {
    projectId: 'P-2025-002',
    projectName: '장비 고장예측 모델 개발',
    ownerOrganization: 'AI개발센터',
    pm: '정PM',
    totalCredits: 200000,
    usedCredits: 175000,
    remainingCredits: 25000,
    usageRate: 87.5,
    estimatedDays: 14,
    status: 'warning',
    lastUsedAt: '2025-06-26T14:30:00Z',
  },
  {
    projectId: 'P-2025-003',
    projectName: '부품 수요예측 데이터셋 구축',
    ownerOrganization: '공군군수본부',
    pm: '정PM',
    totalCredits: 30000,
    usedCredits: 27000,
    remainingCredits: 3000,
    usageRate: 90,
    estimatedDays: 5,
    status: 'low',
    lastUsedAt: '2025-06-24T09:00:00Z',
  },
  {
    projectId: 'P-2025-004',
    projectName: '해군 센서 시계열 분석',
    ownerOrganization: '함정기술과',
    pm: '정PM',
    totalCredits: 150000,
    usedCredits: 150000,
    remainingCredits: 0,
    usageRate: 100,
    estimatedDays: 0,
    status: 'exhausted',
    lastUsedAt: '2025-06-26T08:00:00Z',
  },
  /* K-RMF 기능 보류
{
    projectId: 'P-2025-005',
    projectName: 'K-RMF 증빙 자동화',
    ownerOrganization: '정병호보안팀',
    pm: '김관리',
    totalCredits: 10000,
    usedCredits: 10000,
    remainingCredits: 0,
    usageRate: 100,
    estimatedDays: 0,
    status: 'suspended',
    lastUsedAt: '2025-06-20T16:00:00Z',
  },
*/
];

export const mockChargeHistory: ChargeHistory[] = [
  {
    id: 'CHG-2025-001',
    projectName: 'DIMS 정비이력 분석 프로젝트',
    chargedAt: '2025-06-01T09:00:00Z',
    credits: 50000,
    reason: '초기 크레딧 부여',
    approver: 'AI운영팀',
    status: 'applied',
  },
  {
    id: 'CHG-2025-002',
    projectName: '장비 고장예측 모델 개발',
    chargedAt: '2025-06-01T09:00:00Z',
    credits: 200000,
    reason: '초기 크레딧 부여',
    approver: 'AI운영팀',
    status: 'applied',
  },
  {
    id: 'CHG-2025-003',
    projectName: '장비 고장예측 모델 개발',
    chargedAt: '2025-06-20T10:00:00Z',
    credits: 50000,
    reason: '추가 GPU 학습 필요',
    approver: '한보안',
    status: 'requested',
  },
  {
    id: 'CHG-2025-004',
    projectName: '해군 센서 시계열 분석',
    chargedAt: '2025-06-15T11:00:00Z',
    credits: 30000,
    reason: '센서 데이터 추가 수집',
    approver: 'AI운영팀',
    status: 'approved',
  },
  /* K-RMF 기능 보류
{
    id: 'CHG-2025-005',
    projectName: 'K-RMF 증빙 자동화',
    chargedAt: '2025-06-10T13:00:00Z',
    credits: 5000,
    reason: '범위 축소로 충전 반려',
    approver: 'AI운영팀',
    status: 'rejected',
  },
*/
];

export const mockUsageHistory: UsageHistory[] = [
  {
    id: 'USE-2025-001',
    projectName: '장비 고장예측 모델 개발',
    usedAt: '2025-06-25T08:00:00Z',
    resourceType: 'gpu',
    amount: '48 gpu-hour',
    deductedCredits: 24000,
    user: '이개발',
    jobName: 'fault-prediction-train-v3',
    note: 'GPU 학습',
  },
  {
    id: 'USE-2025-002',
    projectName: 'DIMS 정비이력 분석 프로젝트',
    usedAt: '2025-06-25T10:00:00Z',
    resourceType: 'cpu',
    amount: '120 core-hour',
    deductedCredits: 1200,
    user: '박분석',
    jobName: 'data-preprocessing',
    note: '데이터 전처리',
  },
  {
    id: 'USE-2025-003',
    projectName: '장비 고장예측 모델 개발',
    usedAt: '2025-06-24T15:00:00Z',
    resourceType: 'storage',
    amount: '512 GB-day',
    deductedCredits: 512,
    user: '최엔지니어',
    jobName: 'dataset-cache',
    note: '학습 데이터 캐시',
  },
  {
    id: 'USE-2025-004',
    projectName: '부품 수요예측 데이터셋 구축',
    usedAt: '2025-06-24T09:00:00Z',
    resourceType: 'notebook',
    amount: '8 hour',
    deductedCredits: 400,
    user: '정PM',
    jobName: 'eda-notebook',
    note: '탐색적 분석',
  },
  {
    id: 'USE-2025-005',
    projectName: '해군 센서 시계열 분석',
    usedAt: '2025-06-23T11:00:00Z',
    resourceType: 'inference_api',
    amount: '50,000 calls',
    deductedCredits: 1000,
    user: '이개발',
    jobName: 'sensor-anomaly-api',
    note: '이상 탐지 API 호출',
  },
  {
    id: 'USE-2025-006',
    projectName: '장비 고장예측 모델 개발',
    usedAt: '2025-06-26T14:30:00Z',
    resourceType: 'training_job',
    amount: '12 job-hour',
    deductedCredits: 3600,
    user: '최엔지니어',
    jobName: 'hyperparam-search',
    note: '하이퍼파라미터 탐색',
  },
];

export const mockResourcePrices: ResourcePrice[] = [
  {
    resourceType: 'cpu',
    unit: 'core-hour',
    price: 10,
    description: 'CPU 코어 사용량',
    active: true,
  },
  {
    resourceType: 'gpu',
    unit: 'gpu-hour',
    price: 500,
    description: 'GPU 사용량',
    active: true,
  },
  {
    resourceType: 'memory',
    unit: 'GB-hour',
    price: 5,
    description: '메모리 사용량',
    active: true,
  },
  {
    resourceType: 'storage',
    unit: 'GB-day',
    price: 1,
    description: '스토리지 사용량',
    active: true,
  },
  {
    resourceType: 'network',
    unit: 'GB',
    price: 2,
    description: '네트워크 전송량',
    active: true,
  },
  {
    resourceType: 'notebook',
    unit: 'hour',
    price: 50,
    description: 'Notebook 인스턴스 사용',
    active: true,
  },
  {
    resourceType: 'training_job',
    unit: 'job-hour',
    price: 300,
    description: '학습 작업 실행',
    active: true,
  },
  {
    resourceType: 'inference_api',
    unit: '1,000 calls',
    price: 20,
    description: 'Inference API 호출',
    active: true,
  },
];

export const mockCreditAlerts: CreditAlert[] = [
  {
    id: 'ALT-001',
    projectName: '장비 고장예측 모델 개발',
    message: '크레딧 사용률이 85%를 초과했습니다.',
    severity: 'warning',
    createdAt: '2025-06-26T10:00:00Z',
  },
  {
    id: 'ALT-002',
    projectName: '해군 센서 시계열 분석',
    message: 'GPU 사용이 제한되었습니다.',
    severity: 'error',
    createdAt: '2025-06-26T08:30:00Z',
  },
  /* K-RMF 기능 보류
{
    id: 'ALT-003',
    projectName: 'K-RMF 증빙 자동화',
    message: '크레딧이 소진되어 워크스페이스가 중지되었습니다.',
    severity: 'error',
    createdAt: '2025-06-20T16:00:00Z',
  },
*/
  {
    id: 'ALT-004',
    projectName: '부품 수요예측 데이터셋 구축',
    message: '크레딧이 10% 미만입니다.',
    severity: 'warning',
    createdAt: '2025-06-25T09:00:00Z',
  },
];

export const getResourceRestrictions = (
  status: CreditStatus,
): ResourceRestriction[] => {
  const all: ResourceType[] = [
    'cpu',
    'gpu',
    'memory',
    'storage',
    'network',
    'notebook',
    'training_job',
    'inference_api',
  ];

  if (status === 'normal') {
    return all.map(t => ({ resourceType: t, allowed: true }));
  }
  if (status === 'warning') {
    return all.map(t =>
      t === 'gpu'
        ? { resourceType: t, allowed: true, reason: '고비용 GPU 사용 주의' }
        : { resourceType: t, allowed: true },
    );
  }
  if (status === 'low') {
    return all.map(t => {
      if (t === 'training_job')
        return {
          resourceType: t,
          allowed: false,
          reason: '신규 Training Job 제한',
        };
      if (t === 'gpu')
        return {
          resourceType: t,
          allowed: true,
          reason: '사용량 모니터링 권고',
        };
      return { resourceType: t, allowed: true };
    });
  }
  if (status === 'exhausted') {
    return all.map(t =>
      t === 'inference_api' || t === 'notebook'
        ? { resourceType: t, allowed: true, reason: '읽기 전용 접근만 허용' }
        : { resourceType: t, allowed: false, reason: '크레딧 소진' },
    );
  }
  return all.map(t => ({
    resourceType: t,
    allowed: false,
    reason: '프로젝트 워크스페이스 중지',
  }));
};
