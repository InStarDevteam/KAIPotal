import { DataGenerationRequest, PilotProject } from './types';

export const mockGenerationRequests: DataGenerationRequest[] = [
  {
    id: 'DGR-2026-011',
    pilotProjectId: 'PILOT-001',
    type: 'synthetic',
    status: 'completed',
    requestedAt: '2026-05-12T09:00:00Z',
    targetCount: 12000,
  },
  {
    id: 'DGR-2026-014',
    pilotProjectId: 'PILOT-001',
    type: 'simulator',
    status: 'generating',
    requestedAt: '2026-06-30T09:00:00Z',
    targetCount: 8000,
  },
  {
    id: 'DGR-2026-018',
    pilotProjectId: 'PILOT-002',
    type: 'synthetic',
    status: 'requested',
    requestedAt: '2026-07-20T09:00:00Z',
    targetCount: 6000,
  },
  {
    id: 'DGR-2026-009',
    pilotProjectId: 'PILOT-003',
    type: 'simulator',
    status: 'completed',
    requestedAt: '2026-04-18T09:00:00Z',
    targetCount: 20000,
  },
];

export const mockPilotProjects: PilotProject[] = [
  {
    id: 'PILOT-001',
    name: 'K-9 자주포 완성차 최종검사 결과 예측모델',
    unit: '육군종합정비창',
    dtOt: 'DT+OT',
    scenario:
      '완성차 최종검사 단계의 검사 항목별 결과 이력과 정비 이력을 학습하여 최종검사 합격/불합격 결과를 사전에 예측하고, 불합격 예상 시 주요 원인 항목을 제시한다.',
    acceptanceCriteria:
      'DT 단계 예측 정확도 90% 이상, OT 단계 현장 적용 시 오탐률 5% 이하, 추론 지연 200ms 이하',
    kpis: [
      { name: '예측 정확도', target: '90% 이상', measured: '91.2%' },
      { name: '데이터 처리 속도', target: '10,000건/분 이상', measured: '12,400건/분' },
      { name: '모델 추론 지연 시간', target: '200ms 이하', measured: '168ms' },
      { name: '자원 할당 효율성', target: 'GPU 활용률 70% 이상', measured: '74%' },
    ],
    requiredDataTypes: [
      { type: '정비 이력 데이터', targetCount: 50000, currentCount: 41200 },
      { type: '최종검사 결과 로그', targetCount: 30000, currentCount: 19800 },
      { type: '부품 교체 이력', targetCount: 20000, currentCount: 20000 },
    ],
    acquisitionMethods: ['interop', 'synthetic', 'simulator'],
    linkedSystems: ['DIMS(정비정보체계)', 'ATMS(탄약관리체계)'],
    generationRequestIds: ['DGR-2026-011', 'DGR-2026-014'],
    dataLineage: [
      {
        version: 'v1.0',
        source: 'DIMS 연동 수집',
        generatedAt: '2026-04-02T09:00:00Z',
        note: '정비 이력 1차 적재',
      },
      {
        version: 'v1.1',
        source: '합성데이터 생성(DGR-2026-011)',
        generatedAt: '2026-05-20T09:00:00Z',
        note: '검사 결과 로그 부족분 보강',
      },
      {
        version: 'v1.2',
        source: '시뮬레이터 생성(DGR-2026-014)',
        generatedAt: '2026-07-10T09:00:00Z',
        note: '엔진 부하 조걸별 시계열 보강',
      },
    ],
    qualityCheck: {
      status: 'passed',
      checkedAt: '2026-07-15T09:00:00Z',
      note: '결측률 0.8%, 레이블 정합성 99.1% — 기준 충족',
    },
    dataSplit: { train: 70, validation: 15, test: 15 },
    status: 'ready',
  },
  {
    id: 'PILOT-002',
    name: '초기패턴 기반 K-9 자주포 변속기 최종검사 결과 예측모델',
    unit: '육군종합정비창',
    dtOt: 'DT',
    scenario:
      '변속기 조립 초기 단계의 공정 센서 패턴(토크, 압력, 온도)을 분석하여 최종검사 결과를 조기에 예측함으로써 재작업 비용을 절감한다.',
    acceptanceCriteria:
      '초기 패털만으로 최종검사 결과 예측 정확도 85% 이상, 조기 예측 시점 최종검사 48시간 전',
    kpis: [
      { name: '예측 정확도', target: '85% 이상' },
      { name: '데이터 처리 속도', target: '5,000건/분 이상' },
      { name: '모델 추론 지연 시간', target: '300ms 이하' },
    ],
    requiredDataTypes: [
      { type: '변속기 공정 센서 시계열', targetCount: 40000, currentCount: 9600 },
      { type: '최종검사 결과 로그', targetCount: 15000, currentCount: 7300 },
    ],
    acquisitionMethods: ['synthetic', 'simulator'],
    linkedSystems: ['MES(생산실행체계)'],
    generationRequestIds: ['DGR-2026-018'],
    dataLineage: [
      {
        version: 'v0.1',
        source: 'MES 파일 반입',
        generatedAt: '2026-06-05T09:00:00Z',
        note: '공정 센서 원시 데이터 1차 확보',
      },
    ],
    qualityCheck: { status: 'pending' },
    status: 'data_generation',
  },
  {
    id: 'PILOT-003',
    name: 'K-9 설비 이상징후 실시간 탐지모델',
    unit: '육군종합정비창',
    dtOt: 'OT',
    scenario:
      '정비창 핵심 설비(선반, 밀링, 시험설비)의 진동·전류·온도 센서 스트림을 실시간 수집하여 이상징후를 탐지하고 정비 알림을 발행한다.',
    acceptanceCriteria:
      '이상 탐지 정밀도 92% 이상, 탐지 지연 5초 이하, 월 오경보 3건 이하',
    kpis: [
      { name: '이상 탐지 정밀도', target: '92% 이상', measured: '93.5%' },
      { name: '탐지 지연 시간', target: '5초 이하', measured: '3.8초' },
      { name: '데이터 처리 속도', target: '20,000 이벤트/초 이상', measured: '24,000 이벤트/초' },
      { name: '자원 할당 효율성', target: 'CPU 활용률 65% 이상', measured: '68%' },
    ],
    requiredDataTypes: [
      { type: '설비 센서 시계열', targetCount: 100000, currentCount: 100000 },
      { type: '설비 고장·정비 이력', targetCount: 10000, currentCount: 8400 },
      { type: '정상 운전 기준 프로파일', targetCount: 5000, currentCount: 5000 },
    ],
    acquisitionMethods: ['interop', 'simulator'],
    linkedSystems: ['설비관리체계(FMS)', 'DIMS(정비정보체계)'],
    generationRequestIds: ['DGR-2026-009'],
    dataLineage: [
      {
        version: 'v1.0',
        source: 'FMS 연동 수집',
        generatedAt: '2026-03-10T09:00:00Z',
        note: '센서 스트림 연계 설계 확정',
      },
      {
        version: 'v1.1',
        source: '시뮬레이터 생성(DGR-2026-009)',
        generatedAt: '2026-05-02T09:00:00Z',
        note: '고장 시나리오 시계열 보강',
      },
    ],
    qualityCheck: {
      status: 'passed',
      checkedAt: '2026-05-25T09:00:00Z',
      note: '스트림 지연·중복 점검 통과',
    },
    dataSplit: { train: 80, validation: 10, test: 10 },
    resultSummary:
      'OT 수행 결과 이상 탐지 정밀도 93.5%, 평균 탐지 지연 3.8초로 합격 기준 충족. 월 오경보 2건.',
    artifacts: [
      '성과등록 문서(OT 결과보고서)',
      '반출 승인 모델 패키지 v1.1',
    ],
    status: 'completed',
  },
  {
    id: 'PILOT-004',
    name: '추가 소요부대 실증 과제 후보',
    unit: '육군종합정비창',
    dtOt: 'DT',
    scenario:
      '소요부대 제안 과제 중 후속 실증 후보를 검토 단계에서 관리하기 위한 과제. 시나리오와 합격 기준은 과제 확정 시 구체화한다.',
    acceptanceCriteria: '과제 확정 시 수립',
    kpis: [{ name: '예측 정확도', target: '과제 확정 시 수립' }],
    requiredDataTypes: [
      { type: '정비 이력 데이터', targetCount: 10000, currentCount: 0 },
      { type: '검사 로그', targetCount: 5000, currentCount: 0 },
    ],
    acquisitionMethods: ['interop', 'file-import'],
    linkedSystems: ['DIMS(정비정보체계)'],
    generationRequestIds: [],
    dataLineage: [],
    status: 'preparing',
  },
];
