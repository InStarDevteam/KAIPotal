export type CreditStatus =
  | 'normal'
  | 'warning'
  | 'low'
  | 'exhausted'
  | 'suspended';

export type ResourceType =
  | 'cpu'
  | 'gpu'
  | 'memory'
  | 'storage'
  | 'network'
  | 'notebook'
  | 'training_job'
  | 'inference_api';

export type ChargeStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'applied';

export interface ProjectCredit {
  projectId: string;
  projectName: string;
  ownerOrganization: string;
  pm: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  usageRate: number;
  estimatedDays: number;
  status: CreditStatus;
  lastUsedAt: string;
}

export interface ChargeHistory {
  id: string;
  projectName: string;
  chargedAt: string;
  credits: number;
  reason: string;
  approver: string;
  status: ChargeStatus;
}

export interface UsageHistory {
  id: string;
  projectName: string;
  usedAt: string;
  resourceType: ResourceType;
  amount: string;
  deductedCredits: number;
  user: string;
  jobName: string;
  note: string;
}

export interface ResourcePrice {
  resourceType: ResourceType;
  unit: string;
  price: number;
  description: string;
  active: boolean;
}

export interface ResourceRestriction {
  resourceType: ResourceType;
  allowed: boolean;
  reason?: string;
}

export interface CreditAlert {
  id: string;
  projectName: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  createdAt: string;
}
