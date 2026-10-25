export type ExportDirection = 'export' | 'import';

export type ExportTargetType =
  | 'server'
  | 'ai_model'
  | 'algorithm'
  | 'dataset'
  | 'document'
  | 'docker_image'
  | 'pypi_package';

export type ExportStatus =
  | 'requested'
  | 'reviewing'
  | 'need_revision'
  | 'approved'
  | 'rejected'
  | 'export_completed'
  | 'import_completed';

export type SecurityLevel = 'public' | 'internal' | 'secret';

export type Visibility = 'public' | 'private' | 'restricted';

export type AccessScope =
  | 'all_users'
  | 'project_members'
  | 'approved_users'
  | 'admins_only';

export interface AuditLogEntry {
  timestamp: string;
  actor: string;
  action: string;
  result: string;
  note: string;
}

export interface ExportRequest {
  id: string;
  direction: ExportDirection;
  targetType: ExportTargetType;
  targetName: string;
  targetDescription: string;
  projectId: string;
  projectName: string;
  reason: string;
  requester: string;
  requesterOrg: string;
  securityLevel: SecurityLevel;
  visibility: Visibility;
  accessScope: AccessScope;
  status: ExportStatus;
  requestedAt: string;
  approver?: string;
  approvedAt?: string;
  downloadable: boolean;
  attachments: string[];
  revisionNote?: string;
  demoPending?: boolean;
  auditLog: AuditLogEntry[];
}
