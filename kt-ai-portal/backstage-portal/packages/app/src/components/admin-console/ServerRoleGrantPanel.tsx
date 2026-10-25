import { useCallback, useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  AdminFetchFailure,
  RoleGrantFailure,
  ServerMembership,
  ServerRole,
  buildRoleGrantInput,
  classifyAdminFetchError,
  classifyRoleGrantError,
  parseMemberships,
  parseRolePermissions,
  parseRoles,
  roleScopeLabel,
} from './adminConsoleServerData';

export const ServerRoleGrantPanel = () => {
  const runtime = usePortalRuntime();
  const canManageRbac = runtime.permissions.includes('rbac.manage');
  const [roles, setRoles] = useState<ServerRole[] | null>(null);
  const [members, setMembers] = useState<ServerMembership[] | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<AdminFetchFailure | null>(null);
  const [membershipId, setMembershipId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [reason, setReason] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);

  const load = useCallback(() => {
    setFailure(null);
    Promise.all([
      runtime.request<unknown>('/v1/roles'),
      runtime.request<unknown>('/v1/permissions'),
      runtime.request<unknown>('/v1/memberships'),
    ])
      .then(([rolesRes, permissionsRes, membershipsRes]) => {
        setRoles(parseRoles(rolesRes.data));
        setPermissions(parseRolePermissions(permissionsRes.data));
        const parsedMembers = parseMemberships(membershipsRes.data);
        setMembers(parsedMembers);
        setMembershipId(current =>
          current && parsedMembers.some(m => m.membershipId === current)
            ? current
            : (parsedMembers[0]?.membershipId ?? ''),
        );
      })
      .catch((error: unknown) =>
        setFailure(
          classifyAdminFetchError(error, '역할 정보를 불러오지 못했습니다.'),
        ),
      );
  }, [runtime]);

  useEffect(() => {
    setRoles(null);
    setMembers(null);
    load();
  }, [load]);

  const activeMembers = (members ?? []).filter(
    member => member.status === 'active',
  );

  const handleSubmit = () => {
    const input = buildRoleGrantInput(membershipId, roleId, reason, validUntil);
    if (!input.ok) {
      setNotice({ message: input.message, error: true });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    runtime
      .request<unknown>('/v1/role-assignments', {
        method: 'POST',
        body: JSON.stringify(input.payload),
      })
      .then(() => {
        setNotice({
          message: '역할을 부여했습니다. 서버 감사 원장에 기록되었습니다.',
          error: false,
        });
        setReason('');
        setValidUntil('');
      })
      .catch((error: unknown) => {
        const classified: RoleGrantFailure = classifyRoleGrantError(
          error,
          '역할 부여를 처리하지 못했습니다.',
        );
        setNotice({ message: classified.message, error: true });
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 8, fontWeight: 600 }}>
        권한 / RBAC 관리
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        역할 목록은 서버 기준 데이터를 조회합니다. 역할 부여는 서버 권한 규칙
        (본인 부여 금지, 위임 범위, 중복 부여)에 따라 처리됩니다.
      </Typography>
      {failure?.kind === 'permission' && (
        <Alert severity="error">{failure.message}</Alert>
      )}
      {failure?.kind === 'network' && (
        <Box marginBottom={2}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={load}>
                다시 시도
              </Button>
            }
          >
            {failure.message}
          </Alert>
        </Box>
      )}
      {!failure && roles === null && (
        <Typography color="textSecondary">역할 정보를 불러오는 중입니다.</Typography>
      )}
      {!failure && roles !== null && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={7}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>역할 ID</TableCell>
                    <TableCell>역할명</TableCell>
                    <TableCell>적용 범위</TableCell>
                    <TableCell>정책 버전</TableCell>
                    <TableCell>권한 수</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map(role => (
                    <TableRow
                      key={role.roleId}
                      selected={role.roleId === roleId}
                      onClick={() => setRoleId(role.roleId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell>{role.roleId}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>
                        {role.name}
                      </TableCell>
                      <TableCell>{roleScopeLabel(role.scope)}</TableCell>
                      <TableCell>{role.policyVersion ?? '—'}</TableCell>
                      <TableCell>
                        {(permissions[role.roleId] ?? []).length}
                      </TableCell>
                    </TableRow>
                  ))}
                  {roles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        조회된 역할이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {roleId && (permissions[roleId] ?? []).length > 0 && (
              <Box marginTop={2}>
                <Typography variant="subtitle2" gutterBottom>
                  {roleId} 권한 목록
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {(permissions[roleId] ?? []).join(', ')}
                </Typography>
              </Box>
            )}
          </Grid>
          <Grid item xs={12} lg={5}>
            <Paper variant="outlined" style={{ padding: 24 }}>
              <Typography
                variant="h6"
                style={{ fontWeight: 600 }}
                gutterBottom
              >
                역할 부여
              </Typography>
              {!canManageRbac && (
                <Box marginBottom={2}>
                  <Alert severity="info">
                    권한(RBAC) 관리 권한이 있어야 역할을 부여할 수 있습니다.
                  </Alert>
                </Box>
              )}
              {notice && (
                <Box marginBottom={2}>
                  <Alert
                    severity={notice.error ? 'error' : 'success'}
                    onClose={() => setNotice(null)}
                  >
                    {notice.message}
                  </Alert>
                </Box>
              )}
              <Box>
                <Box marginBottom={2}>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label="대상 사용자"
                    value={membershipId}
                    disabled={!canManageRbac || activeMembers.length === 0}
                    onChange={event => setMembershipId(event.target.value)}
                  >
                    {activeMembers.map(member => (
                      <MenuItem
                        key={member.membershipId}
                        value={member.membershipId}
                      >
                        {member.displayName} ({member.email ?? member.userId})
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box marginBottom={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="역할"
                    value={roleId}
                    disabled
                    helperText="왼쪽 역할 목록에서 선택하세요."
                  />
                </Box>
                <Box marginBottom={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="만료일 (선택)"
                    type="date"
                    value={validUntil}
                    disabled={!canManageRbac}
                    onChange={event => setValidUntil(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box marginBottom={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="변경 사유 (필수)"
                    value={reason}
                    disabled={!canManageRbac}
                    onChange={event => setReason(event.target.value)}
                    multiline
                    rows={3}
                  />
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!canManageRbac || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? '부여 중' : '역할 부여'}
                </Button>
                <Box marginTop={2}>
                  <Typography variant="caption" color="textSecondary">
                    본인에게는 역할을 부여할 수 없고, 마지막 유효 관리자 역할의
                    회수는 서버에서 차단됩니다.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
