import { platformApiIntegrations } from '../platform-api-integration/mockPlatformApiIntegrationData';
import { PlatformApiIntegration } from '../platform-api-integration/types';

export type PlatformKey =
  | 'ai'
  | 'data'
  | 'cloud'
  | 'vdi'
  | 'identity'
  | 'security'
  | 'portal'
  | 'external';
export const platforms: {
  id: PlatformKey;
  label: string;
  short: string;
  color: string;
  responsibility: string;
}[] = [
  {
    id: 'ai',
    label: 'AI 플랫폼',
    short: 'AI',
    color: '#6e57d7',
    responsibility: '모델 개발 · 학습 · 배포',
  },
  {
    id: 'data',
    label: '데이터 플랫폼',
    short: 'DA',
    color: '#168c88',
    responsibility: '데이터 수집 · 가공 · 분석',
  },
  {
    id: 'cloud',
    label: '클라우드 플랫폼',
    short: 'CL',
    color: '#3678cb',
    responsibility: '컴퓨팅 · 스토리지 · 과금',
  },
  {
    id: 'vdi',
    label: 'VDI',
    short: 'VD',
    color: '#ba7344',
    responsibility: '가상 데스크톱 · 업무 세션',
  },
  {
    id: 'identity',
    label: '인증 / 권한',
    short: 'ID',
    color: '#727e91',
    responsibility: 'SSO · 신원 · 역할 원천',
  },
  {
    id: 'security',
    label: '보안 / K-RMF',
    short: 'SC',
    color: '#727e91',
    responsibility: '반출 심사 · 증빙 · 감사',
  },
  {
    id: 'portal',
    label: '포털 내부',
    short: 'PO',
    color: '#727e91',
    responsibility: '업무 신청 · 승인 · 통합 조회',
  },
  {
    id: 'external',
    label: '외부 체계',
    short: 'EX',
    color: '#727e91',
    responsibility: '원천 데이터 제공 · 전송',
  },
];

export interface IntegrationContract
  extends Omit<PlatformApiIntegration, 'relatedSfrIds'> {
  platform: PlatformKey;
}
const platformFor = (target: string): PlatformKey =>
  (({
    'AI 플랫폼': 'ai',
    '데이터 플랫폼': 'data',
    '지능형 클라우드/CMP': 'cloud',
    '인증/권한': 'identity',
    '보안/K-RMF': 'security',
    포털: 'portal',
  }[target] as PlatformKey) || 'external');

export const integrationContracts: IntegrationContract[] = [
  // 고객 확인(2026-10-01): 실증은 체계 활용 활동이며 별도 포털 업무가 아니다.
  // 과거 가설 계약은 원본 자료에 보존하되 활성 API 협의 목록에서는 제외한다.
  ...platformApiIntegrations
    .filter(entry => !entry.id.startsWith('PORTAL-PILOT-'))
    .map(({ relatedSfrIds: _requirements, ...entry }) => ({
      ...entry,
      platform: platformFor(entry.targetSystem),
    })),
  ...[
    {
      id: 'vdi-desktops',
      name: '사용 가능한 가상 데스크톱 조회',
      endpointCandidate: '/api/vdi/desktops',
      responseData: ['desktops', 'availableCount'],
    },
    {
      id: 'vdi-sessions',
      name: '사용자 VDI 세션 상태 조회',
      endpointCandidate: '/api/vdi/sessions',
      responseData: ['sessions', 'activeCount'],
    },
  ].map(entry => ({
    ...entry,
    platform: 'vdi' as const,
    category: '가상 데스크톱',
    sourceSystem: '포털' as const,
    targetSystem: '지능형 서비스' as const,
    method: 'GET' as const,
    protocolCandidates: ['REST'],
    requestData: ['tenantId', 'userId'],
    relatedMenus: ['VDI'],
    securityConsiderations: [
      '테넌트 격리',
      '사용자 위임 인증',
      '일회성 접속 티켓 별도 협의',
    ],
    status: '연계 설계' as const,
    followUpQuestions: ['VDI 공급사 API 경로·인증·SSO 진입 URL 확정'],
    description:
      'VDI 진입 전 사용 가능 자원과 상태를 조회하는 신규 협의안입니다.',
    portalRole:
      '접근 권한 확인, 데스크톱 목록과 세션 상태 요약, VDI 서비스 진입',
    platformRole: '가상 데스크톱 할당, 접속 티켓 발급, 세션 실행·종료',
    responsibilityBoundary:
      '실제 데스크톱 업무와 세션 제어는 VDI 서비스에서 수행합니다.',
  })),
];

type FieldType = 'string' | 'number' | 'array' | 'object';
const arrays = new Set([
  'workspaces',
  'models',
  'items',
  'results',
  'history',
  'roles',
  'permissions',
  'tenants',
  'datasets',
  'desktops',
  'sessions',
  'controlItems',
  'evidenceList',
  'followUpActions',
  'qualityChecks',
  'lineage',
  'kpiResults',
]);
const numbers = new Set([
  'total',
  'totalCredit',
  'usedCredit',
  'balance',
  'availableCount',
  'activeCount',
  'gpuUsage',
  'cpuUsage',
  'memoryUsage',
  'storageUsage',
  'qualityScore',
  'implementationRate',
]);
export const fieldName = (value: string) =>
  value.match(/^[a-zA-Z][a-zA-Z0-9_]*/)?.[0] || value;
const fieldType = (value: string): FieldType => {
  if (arrays.has(value)) return 'array';
  if (numbers.has(value)) return 'number';
  return 'string';
};
export const contractSchema = (fields: string[]) => ({
  type: 'object',
  properties: Object.fromEntries(
    fields.map(fieldName).map(name => [name, { type: fieldType(name) }]),
  ),
  required: fields.map(fieldName),
  additionalProperties: true,
});
const requestValue = (name: string, tenantId: string): unknown => {
  if (name === 'tenantId') return tenantId;
  if (name === 'userId') return 'sample-user';
  if (name === 'period') return '2026-09';
  if (name === 'projectId') return 'sample-project';
  if (name.endsWith('Id'))
    return `sample-${name.replace(/Id$/, '').toLowerCase()}`;
  if (name === 'query' || name === 'keyword') return '정비';
  if (fieldType(name) === 'array') return [];
  if (fieldType(name) === 'number') return 10;
  return 'sample';
};
export const sampleRequest = (
  contract: IntegrationContract,
  tenantId: string,
) =>
  Object.fromEntries(
    contract.requestData
      .map(fieldName)
      .map(name => [name, requestValue(name, tenantId)]),
  );

export const validateContract = (
  value: unknown,
  fields: string[],
): string[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return ['JSON 객체를 입력하세요.'];
  const object = value as Record<string, unknown>;
  return fields.map(fieldName).flatMap(name => {
    if (!(name in object)) return [`${name}: 필수 필드 누락`];
    const type = fieldType(name);
    const actual = object[name];
    const valid =
      type === 'array' ? Array.isArray(actual) : typeof actual === type;
    return valid ? [] : [`${name}: ${type} 형식 필요`];
  });
};
const responseValue = (
  name: string,
  contract: IntegrationContract,
): unknown => {
  if (fieldType(name) === 'array') {
    const names: Partial<Record<PlatformKey, string>> = {
      ai: '항공 정비 예측 모델',
      vdi: '표준 업무 데스크톱',
    };
    return [
      {
        id: 'sample-01',
        name: names[contract.platform] || '정비 분석 워크스페이스',
        status: 'available',
      },
    ];
  }
  if (fieldType(name) === 'number') return 12;
  if (name.toLowerCase().includes('status')) return 'ready';
  if (name.endsWith('At')) return '2026-09-24T00:00:00Z';
  return `sample-${name}`;
};
export const sampleResponse = (contract: IntegrationContract) =>
  Object.fromEntries(
    contract.responseData
      .map(fieldName)
      .map(name => [name, responseValue(name, contract)]),
  );

export type TestMode = 'sample' | 'live';
export interface TestResult {
  id: string;
  occurredAt: string;
  contractName: string;
  platform: PlatformKey;
  mode: TestMode;
  kind: 'contract' | 'connection';
  outcome: 'passed' | 'failed' | 'blocked';
  status: number | null;
  elapsedMs: number;
  message: string;
  response?: unknown;
  checks: string[];
}
export const historyKey = (tenantId: string, actorId: string) =>
  `kai.integration-tests.v1.${tenantId}.${actorId}`;
export const readHistory = (
  tenantId: string,
  actorId: string,
): TestResult[] => {
  try {
    const value = JSON.parse(
      localStorage.getItem(historyKey(tenantId, actorId)) || '[]',
    );
    return Array.isArray(value)
      ? value
          .filter(
            item =>
              item &&
              typeof item.id === 'string' &&
              ['sample', 'live'].includes(item.mode),
          )
          .slice(0, 40)
      : [];
  } catch {
    return [];
  }
};
export const saveHistory = (
  tenantId: string,
  actorId: string,
  results: TestResult[],
) => {
  // Only summaries are persisted. Request values and platform response bodies stay in memory.
  localStorage.setItem(
    historyKey(tenantId, actorId),
    JSON.stringify(
      results.slice(0, 40).map(({ response: _response, ...result }) => result),
    ),
  );
};

export const resolveReadPath = (
  contract: IntegrationContract,
  request: Record<string, unknown>,
) => {
  const used = new Set<string>();
  const path = contract.endpointCandidate.replace(
    /\{(\w+)\}/g,
    (_match, key) => {
      used.add(key);
      const value = request[key];
      if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value))
        throw new Error(
          `${key}: 경로 값은 영문·숫자·밑줄·하이픈만 허용됩니다.`,
        );
      return encodeURIComponent(value);
    },
  );
  const query = new URLSearchParams();
  Object.entries(request).forEach(([key, value]) => {
    if (!used.has(key) && key !== 'tenantId')
      query.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  });
  return { path, query: query.toString() };
};
