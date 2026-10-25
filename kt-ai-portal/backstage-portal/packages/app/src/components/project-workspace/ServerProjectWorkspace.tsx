import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RefreshIcon from '@material-ui/icons/Refresh';
import InputAdornment from '@material-ui/core/InputAdornment';
import SearchIcon from '@material-ui/icons/Search';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import AddIcon from '@material-ui/icons/Add';
import Alert from '@material-ui/lab/Alert';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  classifyPortalClientError,
  PortalClientError,
} from '../portal-runtime/portalClientError';
import {
  PROJECT_MEMBER_ROLE_LABELS,
  ServerProjectDetailView,
  ServerProjectSummary,
  formatServerDate,
  isValidUserId,
  mapServerProjectDetail,
  mapServerProjectSummary,
  parseCloseBlockers,
} from './projectServerData';
import {
  ServerProjectForm,
  ServerProjectFormValues,
} from './ServerProjectForm';

interface ProjectListResponse {
  items: Array<Record<string, unknown>>;
  pagination: { page: number; pageSize: number; total: number };
}

const newIdempotencyKey = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const MEMBER_ROLES = Object.keys(PROJECT_MEMBER_ROLE_LABELS);
const PROJECT_PAGE_SIZE = 20;

export const ServerProjectWorkspace = () => {
  const runtime = usePortalRuntime();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('project');
  const requestedPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;
  const query = params.get('q') || '';
  const [queryInput, setQueryInput] = useState(query);
  const [total, setTotal] = useState(0);
  const setPage = (value: number) => {
    const next = new URLSearchParams(params);
    if (value > 1) next.set('page', String(value));
    else next.delete('page');
    setParams(next);
  };
  const searchProjects = () => {
    const next = new URLSearchParams(params);
    const text = queryInput.trim();
    if (text) next.set('q', text);
    else next.delete('q');
    next.delete('page');
    setParams(next);
  };
  useEffect(() => {
    setQueryInput(query);
  }, [query]);
  const setSelectedId = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('project', id);
    setParams(next);
  };
  const canCreate = runtime.permissions.includes('project.request');
  const [items, setItems] = useState<ServerProjectSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listFailure, setListFailure] = useState<PortalClientError | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [detailReload, setDetailReload] = useState(0);
  const [detail, setDetail] = useState<ServerProjectDetailView | null>(null);
  const [detailFailure, setDetailFailure] = useState<PortalClientError | null>(
    null,
  );
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ServerProjectSummary | null>(null);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [inviteeId, setInviteeId] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [preserveOutputs, setPreserveOutputs] = useState(false);

  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListFailure(null);
    runtime
      .request<ProjectListResponse>(
        `/v1/projects?page=${page}&pageSize=${PROJECT_PAGE_SIZE}${query ? `&q=${encodeURIComponent(query)}` : ''}`,
      )
      .then(response => {
        if (!active) return;
        const nextItems = (response.data.items ?? []).map(
          mapServerProjectSummary,
        );
        setItems(nextItems);
        setTotal(response.data.pagination?.total ?? nextItems.length);
        setListLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setListFailure(classifyPortalClientError(error));
        setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runtime, reloadToken, page, query]);

  const reloadDetail = async (id: string) => {
    const response = await runtime.request<{
      project: Record<string, unknown>;
      members: Array<Record<string, unknown>>;
      invites: Array<Record<string, unknown>>;
    }>(`/v1/projects/${id}`);
    const nextDetail = mapServerProjectDetail(response.data);
    setDetail(nextDetail);
    setItems(prev =>
      prev.map(item => (item.id === id ? nextDetail.project : item)),
    );
  };

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailFailure(null);
      return undefined;
    }
    let active = true;
    setDetailFailure(null);
    setDetail(null);
    setEditing(null);
    setPreserveOutputs(false);
    runtime
      .request<{
        project: Record<string, unknown>;
        members: Array<Record<string, unknown>>;
        invites: Array<Record<string, unknown>>;
      }>(`/v1/projects/${selectedId}`)
      .then(response => {
        if (!active) return;
        setDetail(mapServerProjectDetail(response.data));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDetail(null);
        setDetailFailure(classifyPortalClientError(error));
      });
    return () => {
      active = false;
    };
  }, [runtime, selectedId, detailReload]);

  const run = async (action: string, work: () => Promise<string>) => {
    if (busy) return;
    setBusy(action);
    setNotice(null);
    setBlockers([]);
    try {
      const message = await work();
      setNotice({ message, error: false });
    } catch (error) {
      const failure = classifyPortalClientError(error);
      if (failure.code === 'close_blocked')
        setBlockers(parseCloseBlockers(failure.message));
      setNotice({ message: failure.message, error: true });
    } finally {
      setBusy(null);
    }
  };

  const projectPayload = (values: ServerProjectFormValues) => ({
    name: values.name.trim(),
    description: values.description.trim() || null,
    purpose: values.purpose.trim() || null,
    visibility: values.visibility,
    ...(values.startAt ? { startAt: values.startAt } : {}),
    ...(values.endAt ? { endAt: values.endAt } : {}),
  });

  const handleCreate = (values: ServerProjectFormValues) => {
    if (!canCreate) return;
    void run('create', async () => {
      const response = await runtime.request<Record<string, unknown>>(
        '/v1/projects',
        {
          method: 'POST',
          body: JSON.stringify({
            ...projectPayload(values),
            idempotencyKey: newIdempotencyKey(),
          }),
        },
      );
      const created = mapServerProjectSummary(response.data);
      setCreateOpen(false);
      setReloadToken(token => token + 1);
      setSelectedId(created.id);
      return '프로젝트를 생성했습니다.';
    });
  };

  const handleUpdate = (values: ServerProjectFormValues) => {
    if (!editing) return;
    const target = editing;
    void run('update', async () => {
      await runtime.request<Record<string, unknown>>(
        `/v1/projects/${target.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...projectPayload(values),
            expectedVersion: target.version,
          }),
        },
      );
      setEditing(null);
      await reloadDetail(target.id);
      return '프로젝트를 수정했습니다.';
    });
  };

  const handleAddMember = () => {
    if (!detail) return;
    if (!isValidUserId(memberUserId)) {
      setNotice({
        message: '추가할 사용자 ID는 UUID 형식이어야 합니다.',
        error: true,
      });
      return;
    }
    const id = detail.project.id;
    const userId = memberUserId.trim();
    const role = memberRole;
    void run('member', async () => {
      await runtime.request(`/v1/projects/${id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, role }),
      });
      setMemberUserId('');
      await reloadDetail(id);
      return '멤버를 추가했습니다.';
    });
  };

  const handleInvite = () => {
    if (!detail) return;
    if (!isValidUserId(inviteeId)) {
      setNotice({
        message: '초대할 사용자 ID는 UUID 형식이어야 합니다.',
        error: true,
      });
      return;
    }
    const id = detail.project.id;
    const target = inviteeId.trim();
    const role = inviteRole;
    void run('invite', async () => {
      await runtime.request(`/v1/projects/${id}/invites`, {
        method: 'POST',
        body: JSON.stringify({ inviteeId: target, role }),
      });
      setInviteeId('');
      await reloadDetail(id);
      return '초대를 보냈습니다.';
    });
  };

  const handleInviteRespond = (
    inviteId: string,
    action: 'accept' | 'decline',
  ) => {
    if (!detail) return;
    const projectId = detail.project.id;
    void run('respond', async () => {
      await runtime.request(`/v1/projects/invites/${inviteId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await reloadDetail(projectId);
      setReloadToken(token => token + 1);
      return action === 'accept'
        ? '초대를 수락했습니다.'
        : '초대를 거절했습니다.';
    });
  };

  const handleCloseRequest = () => {
    if (!detail) return;
    const id = detail.project.id;
    void run('close-request', async () => {
      await runtime.request(`/v1/projects/${id}/close-request`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await reloadDetail(id);
      return '종료 요청을 등록했습니다.';
    });
  };

  const handleClose = () => {
    if (!detail || !preserveOutputs) return;
    const id = detail.project.id;
    void run('close', async () => {
      await runtime.request(`/v1/projects/${id}/close`, {
        method: 'POST',
        body: JSON.stringify({ preserveOutputs: true }),
      });
      setPreserveOutputs(false);
      await reloadDetail(id);
      return '프로젝트를 종료했습니다.';
    });
  };

  const canManage =
    !!detail &&
    (detail.project.ownerId === runtime.actorId ||
      runtime.permissions.includes('project.approve'));

  return (
    <Box>
      <Box className="project-toolbar" mb={2}>
        <Typography variant="body2" color="textSecondary">
          현재 소속의 프로젝트 {total.toLocaleString()}개 · 프로젝트명을
          선택하면 상세를 확인할 수 있습니다.
        </Typography>
        <Box display="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            disabled={listLoading || !!busy}
            onClick={() => {
              setReloadToken(token => token + 1);
              setDetailReload(token => token + 1);
            }}
          >
            새로고침
          </Button>
          {canCreate && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setCreateOpen(open => !open);
                setEditing(null);
              }}
            >
              새 프로젝트 생성
            </Button>
          )}
        </Box>
      </Box>

      {notice && (
        <Box mb={2}>
          <Alert
            severity={notice.error ? 'error' : 'success'}
            onClose={() => setNotice(null)}
          >
            {notice.message}
          </Alert>
        </Box>
      )}
      {blockers.length > 0 && (
        <Box mb={2}>
          <Alert severity="warning">
            종료를 막는 미처리 업무가 있습니다.
            <List dense>
              {blockers.map(blocker => (
                <ListItem key={blocker}>
                  <ListItemText primary={blocker} />
                </ListItem>
              ))}
            </List>
          </Alert>
        </Box>
      )}

      {createOpen && (
        <Box mb={3}>
          <ServerProjectForm
            submitting={busy === 'create'}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </Box>
      )}

      <Box
        component="form"
        mb={2}
        display="flex"
        alignItems="flex-start"
        style={{ gap: 8 }}
        onSubmit={event => {
          event.preventDefault();
          searchProjects();
        }}
      >
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          id="server-project-search"
          label="전체 프로젝트 검색"
          placeholder="프로젝트명, 설명 또는 목적"
          value={queryInput}
          onChange={event => setQueryInput(event.target.value)}
          inputProps={{ maxLength: 100 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button type="submit" variant="outlined" style={{ flexShrink: 0 }}>
          검색
        </Button>
      </Box>

      {listLoading && (
        <Typography color="textSecondary">
          프로젝트 목록을 불러오는 중입니다.
        </Typography>
      )}
      {!listLoading && listFailure && (
        <Alert
          severity={listFailure.kind === 'permission' ? 'warning' : 'error'}
          action={
            listFailure.kind !== 'permission' ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => setReloadToken(token => token + 1)}
              >
                다시 시도
              </Button>
            ) : undefined
          }
        >
          {listFailure.message}
        </Alert>
      )}
      {!listLoading && !listFailure && (
        <>
          <TableContainer
            component={Paper}
            variant="outlined"
            className="project-table"
          >
            <Table size="small" aria-label="서버 프로젝트 목록">
              <TableHead>
                <TableRow>
                  <TableCell>프로젝트명</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>공개범위</TableCell>
                  <TableCell>기간</TableCell>
                  <TableCell>내 역할</TableCell>
                  <TableCell>생성일</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box padding={2}>
                        <Typography color="textSecondary">
                          {query
                            ? '검색 조건에 맞는 프로젝트가 없습니다.'
                            : '아직 등록된 프로젝트가 없습니다.'}
                        </Typography>
                        {!query && !items.length && (
                          <Typography variant="body2" color="textSecondary">
                            {canCreate
                              ? '새 프로젝트 생성으로 첫 프로젝트를 등록하세요.'
                              : '참여 프로젝트가 등록되면 여기에 표시됩니다.'}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {items.map(item => (
                  <TableRow
                    key={item.id}
                    hover
                    selected={selectedId === item.id}
                    onClick={() => setSelectedId(item.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell style={{ minWidth: 220 }}>
                      <Button
                        color="primary"
                        className="project-name-link"
                        onClick={() => setSelectedId(item.id)}
                        aria-pressed={selectedId === item.id}
                      >
                        {item.name}
                      </Button>
                      {item.description && (
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          className="project-description-preview"
                        >
                          {item.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={item.statusLabel}
                        color={item.status === 'active' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{item.visibilityLabel}</TableCell>
                    <TableCell style={{ whiteSpace: 'nowrap' }}>
                      {item.startAt || '-'} ~ {item.endAt || '-'}
                    </TableCell>
                    <TableCell>
                      {item.myRole
                        ? PROJECT_MEMBER_ROLE_LABELS[item.myRole] ?? item.myRole
                        : '비멤버'}
                    </TableCell>
                    <TableCell>{formatServerDate(item.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box
            mt={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            style={{ gap: 8 }}
            aria-label="프로젝트 목록 페이지 이동"
          >
            <Typography variant="body2" color="textSecondary" role="status">
              {query ? '검색 결과' : '전체'} {total.toLocaleString()}개 ·{' '}
              {page} / {Math.max(1, Math.ceil(total / PROJECT_PAGE_SIZE))}페이지
            </Typography>
            <Box display="flex" style={{ gap: 8 }}>
              <Button
                aria-label="이전 프로젝트 페이지"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                이전
              </Button>
              <Button
                aria-label="다음 프로젝트 페이지"
                disabled={page * PROJECT_PAGE_SIZE >= total}
                onClick={() => setPage(page + 1)}
              >
                다음
              </Button>
            </Box>
          </Box>
        </>
      )}

      {selectedId && detailFailure && (
        <Box mt={3}>
          <Alert
            severity={detailFailure.kind === 'permission' ? 'warning' : 'error'}
            action={
              detailFailure.kind !== 'permission' ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setDetailReload(token => token + 1)}
                >
                  다시 시도
                </Button>
              ) : undefined
            }
          >
            {detailFailure.message}
          </Alert>
        </Box>
      )}
      {selectedId && !detail && !detailFailure && (
        <Box mt={3}>
          <Typography color="textSecondary">
            프로젝트 상세를 불러오는 중입니다.
          </Typography>
        </Box>
      )}

      {detail && (
        <Box mt={3}>
          <Paper variant="outlined" style={{ padding: 24 }}>
            <Box
              display="flex"
              alignItems="center"
              flexWrap="wrap"
              style={{ gap: 8 }}
              mb={2}
            >
              <Typography variant="h5">{detail.project.name}</Typography>
              <Chip
                size="small"
                label={detail.project.statusLabel}
                color={
                  detail.project.status === 'active' ? 'primary' : 'default'
                }
              />
              <Chip
                size="small"
                variant="outlined"
                label={detail.project.visibilityLabel}
              />
            </Box>
            {canManage && detail.project.status !== 'closed' && (
              <Box mb={2} display="flex" flexWrap="wrap" style={{ gap: 8 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setEditing(
                      items.find(item => item.id === detail.project.id) ??
                        detail.project,
                    );
                    setCreateOpen(false);
                  }}
                >
                  프로젝트 수정
                </Button>
                {['active', 'suspended'].includes(detail.project.status) && (
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busy === 'close-request'}
                    onClick={handleCloseRequest}
                  >
                    종료 요청
                  </Button>
                )}
              </Box>
            )}

            {editing && editing.id === detail.project.id && (
              <Box mb={3}>
                <ServerProjectForm
                  initial={editing}
                  submitting={busy === 'update'}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditing(null)}
                />
              </Box>
            )}

            <Grid container spacing={2} style={{ marginBottom: 16 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  기간
                </Typography>
                <Typography variant="body2">
                  {detail.project.startAt || '-'} ~{' '}
                  {detail.project.endAt || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  생성일
                </Typography>
                <Typography variant="body2">
                  {formatServerDate(detail.project.createdAt)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">
                  설명
                </Typography>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {detail.project.description || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">
                  이용목적
                </Typography>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {detail.project.purpose || '-'}
                </Typography>
              </Grid>
            </Grid>

            <Divider style={{ margin: '16px 0' }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  멤버
                </Typography>
                <List dense>
                  {detail.members.map(member => (
                    <ListItem key={member.userId}>
                      <ListItemText
                        primary={member.displayName}
                        secondary={`${member.roleLabel} · 가입 ${
                          member.joinedAt || '-'
                        }`}
                      />
                    </ListItem>
                  ))}
                </List>
                {canManage && detail.project.status !== 'closed' && (
                  <Box display="flex" flexWrap="wrap" style={{ gap: 8 }} mt={1}>
                    <TextField
                      size="small"
                      id="server-project-member"
                      label="사용자 ID(UUID)"
                      value={memberUserId}
                      onChange={e => setMemberUserId(e.target.value)}
                      style={{ flex: 1, minWidth: 220 }}
                    />
                    <FormControl size="small" style={{ minWidth: 110 }}>
                      <InputLabel id="member-role-label">역할</InputLabel>
                      <Select
                        labelId="member-role-label"
                        value={memberRole}
                        onChange={e => setMemberRole(e.target.value as string)}
                      >
                        {MEMBER_ROLES.map(role => (
                          <MenuItem key={role} value={role}>
                            {PROJECT_MEMBER_ROLE_LABELS[role]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy === 'member'}
                      onClick={handleAddMember}
                    >
                      멤버 추가
                    </Button>
                  </Box>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  초대
                </Typography>
                <List dense>
                  {detail.invites.length === 0 && (
                    <ListItem>
                      <ListItemText primary="보낸 초대가 없습니다." />
                    </ListItem>
                  )}
                  {detail.invites.map(invite => (
                    <ListItem key={invite.id}>
                      <ListItemText
                        primary={`${invite.inviteeId} · ${invite.roleLabel}`}
                        secondary={`${invite.statusLabel} · ${
                          invite.invitedAt || '-'
                        }`}
                      />
                      {invite.inviteeId === runtime.actorId &&
                        invite.status === 'invited' && (
                          <Box display="flex" style={{ gap: 4 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={busy === 'respond'}
                              onClick={() =>
                                handleInviteRespond(invite.id, 'accept')
                              }
                            >
                              수락
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={busy === 'respond'}
                              onClick={() =>
                                handleInviteRespond(invite.id, 'decline')
                              }
                            >
                              거절
                            </Button>
                          </Box>
                        )}
                    </ListItem>
                  ))}
                </List>
                {canManage && detail.project.status !== 'closed' && (
                  <Box display="flex" flexWrap="wrap" style={{ gap: 8 }} mt={1}>
                    <TextField
                      size="small"
                      id="server-project-invitee"
                      label="초대 사용자 ID(UUID)"
                      value={inviteeId}
                      onChange={e => setInviteeId(e.target.value)}
                      style={{ flex: 1, minWidth: 220 }}
                    />
                    <FormControl size="small" style={{ minWidth: 110 }}>
                      <InputLabel id="invite-role-label">역할</InputLabel>
                      <Select
                        labelId="invite-role-label"
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as string)}
                      >
                        {MEMBER_ROLES.map(role => (
                          <MenuItem key={role} value={role}>
                            {PROJECT_MEMBER_ROLE_LABELS[role]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy === 'invite'}
                      onClick={handleInvite}
                    >
                      초대 보내기
                    </Button>
                  </Box>
                )}
              </Grid>
            </Grid>

            {canManage && detail.project.status === 'closing' && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <Typography variant="h6" gutterBottom>
                  종료 확정
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  종료 요청 상태입니다. 미처리 업무가 없어야 종료할 수 있으며,
                  종료 후에는 수정할 수 없습니다.
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={preserveOutputs}
                      onChange={e => setPreserveOutputs(e.target.checked)}
                    />
                  }
                  label="산출물 보존을 확인했습니다."
                />
                <Box mt={1}>
                  <Button
                    variant="contained"
                    color="secondary"
                    disabled={!preserveOutputs || busy === 'close'}
                    onClick={handleClose}
                  >
                    프로젝트 종료
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};
