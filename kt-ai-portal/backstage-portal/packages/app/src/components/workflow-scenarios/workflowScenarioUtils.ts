import { WorkflowScenario, WorkflowScenarioStep, ScenarioStepStatus } from './types';

export const statusOrder: Record<ScenarioStepStatus, number> = {
  '화면구현': 1,
  '부분구현': 2,
  '기반 자료': 3,
  '모의 연동': 4,
  'API 연계필요': 5,
  '설계필요': 6,
  '후속개발': 7,
  '후속연동': 8,
  '운영설계필요': 9,
  '연계설계': 10,
  '후속API연동': 11,
  '타플랫폼제공전제': 12,
};

export const countStepsByStatus = (scenario: WorkflowScenario) => {
  return scenario.steps.reduce<Record<string, number>>((acc, step) => {
    acc[step.status] = (acc[step.status] ?? 0) + 1;
    return acc;
  }, {});
};

export const getScenarioStatusSummary = (scenario: WorkflowScenario): string => {
  const counts = countStepsByStatus(scenario);
  const parts = Object.entries(counts).map(([status, count]) => `${status} ${count}건`);
  return parts.join(', ');
};

export const sortSteps = (steps: WorkflowScenarioStep[]): WorkflowScenarioStep[] => {
  return [...steps].sort((a, b) => a.order - b.order);
};
