export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: '진행 중',
  suspended: '일시 중지',
  closing: '종료 진행 중',
  closed: '종료 완료',
};

export const PROJECT_MEMBER_ROLE_LABELS: Record<string, string> = {
  manager: '관리자',
  member: '멤버',
  viewer: '뷰어',
};

export const PROJECT_VISIBILITY_LABELS: Record<string, string> = {
  public: '전체 공개',
  member: '멤버 공개',
};

export const INVITE_STATUS_LABELS: Record<string, string> = {
  invited: '초대 대기',
  accepted: '수락',
  declined: '거절',
  expired: '만료',
};

export interface ServerProjectSummary {
  id: string;
  name: string;
  description: string;
  purpose: string;
  status: string;
  statusLabel: string;
  visibility: string;
  visibilityLabel: string;
  startAt: string;
  endAt: string;
  version: number;
  ownerId: string;
  myRole: string | null;
  isMember: boolean;
  createdAt: string;
}

export interface ServerProjectMemberView {
  userId: string;
  displayName: string;
  role: string;
  roleLabel: string;
  joinedAt: string;
}

export interface ServerProjectInviteView {
  id: string;
  inviteeId: string;
  role: string;
  roleLabel: string;
  status: string;
  statusLabel: string;
  invitedAt: string;
}

export interface ServerProjectDetailView {
  project: ServerProjectSummary;
  members: ServerProjectMemberView[];
  invites: ServerProjectInviteView[];
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const asBoolean = (value: unknown): boolean => value === true;

export const formatServerDate = (value: unknown): string => {
  const raw = asString(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const formatServerDateTime = (value: unknown): string => {
  const raw = asString(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR');
};

export const mapServerProjectSummary = (
  row: Record<string, unknown>,
): ServerProjectSummary => {
  const status = asString(row.status);
  const visibility = asString(row.visibility);
  return {
    id: asString(row.id),
    name: asString(row.name),
    description: asString(row.description),
    purpose: asString(row.purpose),
    status,
    statusLabel: PROJECT_STATUS_LABELS[status] ?? status,
    visibility,
    visibilityLabel: PROJECT_VISIBILITY_LABELS[visibility] ?? visibility,
    startAt: formatServerDate(row.start_at),
    endAt: formatServerDate(row.end_at),
    version: asNumber(row.version),
    ownerId: asString(row.owner_id),
    myRole: typeof row.my_role === 'string' ? row.my_role : null,
    isMember: asBoolean(row.is_member),
    createdAt: asString(row.created_at),
  };
};

export const mapServerProjectDetail = (bundle: {
  project: Record<string, unknown>;
  members: Array<Record<string, unknown>>;
  invites: Array<Record<string, unknown>>;
}): ServerProjectDetailView => ({
  project: mapServerProjectSummary(bundle.project),
  members: (bundle.members ?? []).map(member => {
    const role = asString(member.role);
    return {
      userId: asString(member.user_id),
      displayName: asString(member.display_name) || asString(member.user_id),
      role,
      roleLabel: PROJECT_MEMBER_ROLE_LABELS[role] ?? role,
      joinedAt: formatServerDate(member.joined_at),
    };
  }),
  invites: (bundle.invites ?? []).map(invite => {
    const role = asString(invite.role);
    const status = asString(invite.status);
    return {
      id: asString(invite.id),
      inviteeId: asString(invite.invitee_id),
      role,
      roleLabel: PROJECT_MEMBER_ROLE_LABELS[role] ?? role,
      status,
      statusLabel: INVITE_STATUS_LABELS[status] ?? status,
      invitedAt: formatServerDate(invite.invited_at),
    };
  }),
});

export const CLOSE_BLOCKED_MESSAGE_PREFIX = '종료할 수 없습니다.';

export const parseCloseBlockers = (message: string): string[] => {
  if (!message.startsWith(CLOSE_BLOCKED_MESSAGE_PREFIX)) return [];
  return message
    .split(';')
    .map(part => {
      const start = part.indexOf('[');
      return start === -1 ? '' : part.slice(start).trim();
    })
    .filter(part => part.length > 0);
};

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUserId = (value: string): boolean =>
  UUID_PATTERN.test(value.trim());
