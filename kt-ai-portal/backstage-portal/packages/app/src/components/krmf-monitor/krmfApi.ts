import { DiscoveryApi, IdentityApi } from '@backstage/core-plugin-api';

export type KrmfRequest = <T>(
  path: string,
  init?: RequestInit,
) => Promise<{ data: T }>;

export interface KrmfOverview {
  file_storage_configured?: boolean;
  total_controls: number;
  applied: number;
  excluded: number;
  alternative: number;
  evidence_missing: number;
  review_pending: number;
  actions_open: number;
  actions_overdue: number;
  changes_reassess_pending: number;
  next_due: string | null;
  recent_changes: Array<Record<string, unknown>>;
  implementation_rate: number | null;
  rate_label: string;
  computed_at: string;
}

export interface KrmfBaseline {
  id: string;
  name: string;
  version: string;
  project_id: string | null;
  project_name?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface KrmfControl {
  id: string;
  baseline_id: string;
  control_code: string;
  title: string;
  applicability: string;
  status: string;
  owner_id?: string | null;
  owner_name?: string | null;
  due_date?: string | null;
  project_id?: string | null;
  updated_at?: string;
}

export interface KrmfControlDetail extends KrmfControl {
  description?: string;
  evidences: KrmfEvidence[];
  actions: KrmfAction[];
  changes: KrmfChange[];
  links: Array<Record<string, unknown>>;
}

export type KrmfReviewStatus = 'pending' | 'approved' | 'rejected';

export interface KrmfEvidence {
  id: string;
  control_id: string;
  title: string;
  scope?: string | null;
  version: number;
  review_status: KrmfReviewStatus;
  reviewed_by?: string | null;
  reviewer_name?: string | null;
  file_id?: string | null;
  file_name?: string | null;
  reference_uri?: string | null;
  created_by?: string;
  created_at?: string;
}

export type KrmfActionStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'reconfirmed';

export interface KrmfAction {
  id: string;
  control_id?: string;
  control_code?: string;
  title: string;
  cause?: string;
  impact?: string;
  owner_id?: string | null;
  owner_name?: string | null;
  due_date?: string | null;
  status: KrmfActionStatus;
  overdue?: boolean;
  created_at?: string;
}

export interface KrmfChange {
  id: string;
  title: string;
  description?: string;
  change_type?: string;
  status?: string;
  reassess_required?: boolean;
  reassess_reason?: string | null;
  affected_control_ids?: string[];
  created_at?: string;
}

export interface KrmfTraceabilityControl {
  id: string;
  control_code: string;
  title: string;
  links: Array<Record<string, unknown>>;
  unresolved: boolean;
}

export interface KrmfTraceability {
  controls: KrmfTraceabilityControl[];
  missing: Array<Record<string, unknown>>;
}

export interface KrmfTrrItem {
  id: string;
  project_id?: string;
  item_code?: string;
  title: string;
  test_criteria?: string;
  test_data?: string;
  evidence_ready?: boolean;
  status?: string;
  note?: string;
}

export interface KrmfEvalRecord {
  id: string;
  project_id?: string | null;
  kind: string;
  title: string;
  body: string;
  residual_risk?: string | null;
  source: string;
  status: string;
  asked_by?: string;
  answered_by?: string | null;
  answered_at?: string | null;
  recorded_by?: string;
  recorded_at?: string;
}

export type KrmfExportType = 'implementation' | 'traceability' | 'evidence';

const buildQuery = (params: Record<string, string | undefined>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

export const getKrmfOverview = (
  request: KrmfRequest,
  params: { baselineId?: string; projectId?: string },
): Promise<KrmfOverview> =>
  request<KrmfOverview>(
    `/v1/krmf/overview${buildQuery({
      baseline_id: params.baselineId,
      project_id: params.projectId,
    })}`,
  ).then(response => response.data);

export const getKrmfBaselines = (
  request: KrmfRequest,
  params: { status?: string; projectId?: string } = {},
): Promise<KrmfBaseline[]> =>
  request<KrmfBaseline[]>(
    `/v1/krmf/baselines${buildQuery({
      status: params.status,
      project_id: params.projectId,
    })}`,
  ).then(response => response.data);

export const getKrmfControls = (
  request: KrmfRequest,
  baselineId: string,
  params: { applicability?: string; status?: string } = {},
): Promise<KrmfControl[]> =>
  request<KrmfControl[]>(
    `/v1/krmf/baselines/${encodeURIComponent(baselineId)}/controls${buildQuery(
      { applicability: params.applicability, status: params.status },
    )}`,
  ).then(response => response.data);

export const getKrmfControlDetail = (
  request: KrmfRequest,
  controlId: string,
): Promise<KrmfControlDetail> =>
  request<KrmfControlDetail>(`/v1/krmf/controls/${encodeURIComponent(controlId)}`)
    .then(response => response.data);

export const getKrmfTraceability = (
  request: KrmfRequest,
  baselineId: string,
): Promise<KrmfTraceability> =>
  request<KrmfTraceability>(
    `/v1/krmf/traceability${buildQuery({ baseline_id: baselineId })}`,
  ).then(response => response.data);

export const getKrmfEvidences = (
  request: KrmfRequest,
  params: { controlId?: string; reviewStatus?: string } = {},
): Promise<KrmfEvidence[]> =>
  request<KrmfEvidence[]>(
    `/v1/krmf/evidences${buildQuery({
      control_id: params.controlId,
      review_status: params.reviewStatus,
    })}`,
  ).then(response => response.data);

export const reviewKrmfEvidence = (
  request: KrmfRequest,
  evidenceId: string,
  body: { decision: 'approved' | 'rejected'; comment?: string },
): Promise<KrmfEvidence> =>
  request<KrmfEvidence>(`/v1/krmf/evidences/${encodeURIComponent(evidenceId)}/review`, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(response => response.data);

export const getKrmfActions = (
  request: KrmfRequest,
  params: { status?: string; overdue?: boolean } = {},
): Promise<KrmfAction[]> =>
  request<KrmfAction[]>(
    `/v1/krmf/actions${buildQuery({
      status: params.status,
      overdue: params.overdue === undefined ? undefined : String(params.overdue),
    })}`,
  ).then(response => response.data);

export const createKrmfAction = (
  request: KrmfRequest,
  body: Record<string, unknown>,
): Promise<KrmfAction> =>
  request<KrmfAction>('/v1/krmf/actions', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(response => response.data);

export const updateKrmfActionStatus = (
  request: KrmfRequest,
  actionId: string,
  status: KrmfActionStatus,
): Promise<KrmfAction> =>
  request<KrmfAction>(`/v1/krmf/actions/${encodeURIComponent(actionId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then(response => response.data);

export const getKrmfChanges = (request: KrmfRequest): Promise<KrmfChange[]> =>
  request<KrmfChange[]>('/v1/krmf/changes').then(response => response.data);

export const createKrmfChange = (
  request: KrmfRequest,
  body: Record<string, unknown>,
): Promise<KrmfChange> =>
  request<KrmfChange>('/v1/krmf/changes', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(response => response.data);

export const updateKrmfChange = (
  request: KrmfRequest,
  changeId: string,
  body: Record<string, unknown>,
): Promise<KrmfChange> =>
  request<KrmfChange>(`/v1/krmf/changes/${encodeURIComponent(changeId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }).then(response => response.data);

export const getKrmfTrrItems = (
  request: KrmfRequest,
  projectId?: string,
): Promise<KrmfTrrItem[]> =>
  request<KrmfTrrItem[]>(
    `/v1/krmf/trr${buildQuery({ project_id: projectId })}`,
  ).then(response => response.data);

export const upsertKrmfTrrItems = (
  request: KrmfRequest,
  items: Array<Record<string, unknown>>,
): Promise<KrmfTrrItem[]> =>
  request<KrmfTrrItem[]>('/v1/krmf/trr/items', {
    method: 'POST',
    body: JSON.stringify(items),
  }).then(response => response.data);

export const updateKrmfTrrItem = (
  request: KrmfRequest,
  itemId: string,
  body: Record<string, unknown>,
): Promise<KrmfTrrItem> =>
  request<KrmfTrrItem>(`/v1/krmf/trr/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }).then(response => response.data);

export const getKrmfEvalRecords = (
  request: KrmfRequest,
): Promise<KrmfEvalRecord[]> =>
  request<KrmfEvalRecord[]>('/v1/krmf/eval-records').then(
    response => response.data,
  );

export const createKrmfEvalRecord = (
  request: KrmfRequest,
  body: Record<string, unknown>,
): Promise<KrmfEvalRecord> =>
  request<KrmfEvalRecord>('/v1/krmf/eval-records', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(response => response.data);

export const answerKrmfEvalRecord = (
  request: KrmfRequest,
  recordId: string,
  body: { answer: string; idempotency_key?: string },
): Promise<KrmfEvalRecord> =>
  request<KrmfEvalRecord>(
    `/v1/krmf/eval-records/${encodeURIComponent(recordId)}/answer`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  ).then(response => response.data);

export const updateKrmfEvalRecordStatus = (
  request: KrmfRequest,
  recordId: string,
  status: string,
): Promise<KrmfEvalRecord> =>
  request<KrmfEvalRecord>(`/v1/krmf/eval-records/${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then(response => response.data);

export interface KrmfRawDeps {
  identity: IdentityApi;
  discovery: DiscoveryApi;
}

const rawFetch = async (
  deps: KrmfRawDeps,
  tenantId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  const [{ token }, base] = await Promise.all([
    deps.identity.getCredentials(),
    deps.discovery.getBaseUrl('portal'),
  ]);
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (tenantId) headers.set('x-portal-tenant-id', tenantId);
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const requestError = new Error(
      body?.error?.message ||
        `요청을 처리하지 못했습니다 (${response.status}).`,
    );
    (requestError as { status?: number }).status = response.status;
    throw requestError;
  }
  return response;
};

const filenameFromDisposition = (disposition: string | null): string => {
  if (!disposition) return 'download';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match?.[1] ? decodeURIComponent(match[1]) : 'download';
};

export const uploadKrmfEvidence = async (
  deps: KrmfRawDeps,
  tenantId: string,
  form: FormData,
): Promise<KrmfEvidence> => {
  const response = await rawFetch(deps, tenantId, '/v1/krmf/evidences', {
    method: 'POST',
    body: form,
  });
  return (await response.json()) as KrmfEvidence;
};

export const downloadKrmfEvidenceFile = async (
  deps: KrmfRawDeps,
  tenantId: string,
  evidenceId: string,
): Promise<{ blob: Blob; filename: string }> => {
  const response = await rawFetch(
    deps,
    tenantId,
    `/v1/krmf/evidences/${encodeURIComponent(evidenceId)}/file`,
  );
  const blob = await response.blob();
  return {
    blob,
    filename: filenameFromDisposition(
      response.headers.get('content-disposition'),
    ),
  };
};

export const downloadKrmfExportCsv = async (
  deps: KrmfRawDeps,
  tenantId: string,
  type: KrmfExportType,
  baselineId?: string,
): Promise<{ blob: Blob; filename: string }> => {
  const response = await rawFetch(
    deps,
    tenantId,
    `/v1/krmf/export${buildQuery({ type, baseline_id: baselineId })}`,
  );
  const blob = await response.blob();
  return {
    blob,
    filename: filenameFromDisposition(
      response.headers.get('content-disposition'),
    ),
  };
};

export const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    filename.endsWith('.csv') || filename.includes('.')
      ? filename
      : `${filename}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
