import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import { useAuthz } from '../authz';
import { ROLE_LABELS, PORTAL_ROLES } from '../authz/types';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { useTenantSettings } from './TenantSettingsContext';
import { usePlatformAccess } from './PlatformAccessContext';
import {
  PLATFORM_DETAILS,
  PLATFORM_IDS,
  PlatformId,
  PlatformMember,
  validPlatformPolicy,
} from './platformAccessModel';

export function PlatformAccessManagementPanel({
  section = 'all',
}: {
  section?: 'all' | 'platforms' | 'members';
}) {
  const { roles, hasPermission } = useAuthz();
  const { setHasUnsavedChanges } = useTenantSettings();
  const { isDemo, tenantId, tenants } = usePortalRuntime();
  const {
    policy,
    members,
    loading,
    saving,
    error,
    savePolicy,
    assignTenantAdmin,
    reload,
  } = usePlatformAccess();
  const [draft, setDraft] = useState(policy);
  const [message, setMessage] = useState<{
    severity: 'success' | 'error';
    text: string;
  }>();
  const [adminMember, setAdminMember] = useState<PlatformMember>();
  const [reason, setReason] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState('');
  const canManage = hasPermission('tenant.manage');
  const superuser = roles.includes('portal-admin');
  const dirty = JSON.stringify(draft) !== JSON.stringify(policy);
  useEffect(() => {
    setDraft(policy);
  }, [policy]);
  useEffect(() => {
    setHasUnsavedChanges(dirty, 'platform-access');
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      setHasUnsavedChanges(false, 'platform-access');
    };
  }, [dirty, setHasUnsavedChanges]);
  useEffect(() => {
    setMessage(undefined);
    setAdminMember(undefined);
    setSearch('');
  }, [tenantId]);
  const updatePlatform = (id: PlatformId, updates: object) =>
    setDraft(current => ({
      ...current,
      platforms: current.platforms.map(platform =>
        platform.id === id ? { ...platform, ...updates } : platform,
      ),
    }));
  const move = (id: PlatformId, direction: number) => {
    const ordered = [...draft.platforms].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex(p => p.id === id);
    const adjacent = ordered[index + direction];
    if (!adjacent) return;
    const current = ordered[index];
    setDraft(value => ({
      ...value,
      platforms: value.platforms.map(p => {
        if (p.id === current.id) return { ...p, order: adjacent.order };
        if (p.id === adjacent.id) return { ...p, order: current.order };
        return p;
      }),
    }));
  };
  const save = async () => {
    setMessage(undefined);
    try {
      await savePolicy(draft);
      setMessage({
        severity: 'success',
        text: '플랫폼 구성과 사용자 접근 권한을 저장했습니다.',
      });
    } catch (cause) {
      setMessage({
        severity: 'error',
        text: cause instanceof Error ? cause.message : '저장하지 못했습니다.',
      });
    }
  };
  const assign = async () => {
    if (!adminMember) return;
    setAssigning(true);
    try {
      await assignTenantAdmin(adminMember, reason);
      setAdminMember(undefined);
      setReason('');
      setMessage({
        severity: 'success',
        text: `${adminMember.name}님을 이 테넌트의 관리자로 지정했습니다.`,
      });
    } catch (cause) {
      setMessage({
        severity: 'error',
        text: cause instanceof Error ? cause.message : '지정하지 못했습니다.',
      });
    } finally {
      setAssigning(false);
    }
  };
  return (
    <Paper
      variant="outlined"
      style={{ padding: 24, borderRadius: 18 }}
      data-testid="platform-access-management"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Typography variant="h6" style={{ fontWeight: 700 }}>
            {section === 'members'
              ? '사용자와 플랫폼 권한'
              : '플랫폼 연결과 접근 설정'}
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            style={{ marginTop: 6 }}
          >
            {tenants.find(t => t.id === tenantId)?.name}의 플랫폼 진입 권한을
            관리합니다. 상세 작업 권한은 각 플랫폼에서도 확인합니다.
          </Typography>
        </div>
        <Button
          color="primary"
          variant="contained"
          disableElevation
          disabled={
            !canManage ||
            !dirty ||
            saving ||
            loading ||
            !!error ||
            !validPlatformPolicy(draft)
          }
          onClick={save}
        >
          {saving ? '저장 중…' : '접근 설정 저장'}
        </Button>
      </div>
      {isDemo && (
        <Alert severity="info" style={{ marginTop: 16 }}>
          협의용 샘플 계정과 설정입니다. 변경은 현재 브라우저의 선택한 테넌트에
          저장됩니다.
        </Alert>
      )}
      {error && (
        <Alert
          severity="error"
          style={{ marginTop: 16 }}
          action={
            <Button size="small" onClick={reload}>
              다시 불러오기
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {message && (
        <Alert
          severity={message.severity}
          style={{ marginTop: 16 }}
          onClose={() => setMessage(undefined)}
        >
          {message.text}
        </Alert>
      )}
      {loading ? (
        <div style={{ padding: 32 }}>
          <CircularProgress size={24} />
        </div>
      ) : (
        <>
          {section !== 'members' && (
            <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
              {[...draft.platforms]
                .sort((a, b) => a.order - b.order)
                .map((platform, index) => (
                  <div
                    key={platform.id}
                    style={{
                      border: '1px solid #e6e9f0',
                      borderRadius: 14,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <Typography style={{ fontWeight: 700 }}>
                        {PLATFORM_DETAILS[platform.id].name}
                      </Typography>
                      <div>
                        <Tooltip title="위로 이동">
                          <span>
                            <IconButton
                              aria-label={`${
                                PLATFORM_DETAILS[platform.id].name
                              } 위로 이동`}
                              size="small"
                              disabled={!canManage || index === 0 || saving}
                              onClick={() => move(platform.id, -1)}
                            >
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="아래로 이동">
                          <span>
                            <IconButton
                              aria-label={`${
                                PLATFORM_DETAILS[platform.id].name
                              } 아래로 이동`}
                              size="small"
                              disabled={!canManage || index === 3 || saving}
                              onClick={() => move(platform.id, 1)}
                            >
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <FormControlLabel
                          control={
                            <Switch
                              color="primary"
                              checked={platform.enabled}
                              disabled={!canManage || saving}
                              onChange={(_, enabled) =>
                                updatePlatform(platform.id, { enabled })
                              }
                              inputProps={{
                                'aria-label': `${
                                  PLATFORM_DETAILS[platform.id].name
                                } 이용 허용`,
                              }}
                            />
                          }
                          label={platform.enabled ? '이용 허용' : '이용 중지'}
                        />
                      </div>
                    </div>
                    <TextField
                      id={`platform-service-url-${platform.id}`}
                      label={`${
                        PLATFORM_DETAILS[platform.id].name
                      } 서비스 접속 주소`}
                      placeholder="https://platform.example.mil"
                      value={platform.href}
                      onChange={event =>
                        updatePlatform(platform.id, {
                          href: event.target.value.trim(),
                        })
                      }
                      variant="outlined"
                      size="small"
                      fullWidth
                      disabled={!canManage || saving}
                      style={{ marginTop: 12 }}
                      helperText="플랫폼의 공식 HTTPS 주소를 입력하세요. 비워 두면 연결 준비 안내를 표시합니다."
                    />
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      style={{ display: 'block', marginTop: 10 }}
                    >
                      이용 가능한 역할 · 사용자별 제한도 함께 적용
                    </Typography>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {PORTAL_ROLES.map(role => (
                        <FormControlLabel
                          key={role}
                          style={{ marginRight: 12 }}
                          control={
                            <Checkbox
                              size="small"
                              color="primary"
                              checked={platform.allowedRoles.includes(role)}
                              disabled={!canManage || saving}
                              onChange={(_, checked) =>
                                updatePlatform(platform.id, {
                                  allowedRoles: checked
                                    ? [...platform.allowedRoles, role]
                                    : platform.allowedRoles.filter(
                                        r => r !== role,
                                      ),
                                })
                              }
                              inputProps={{
                                'aria-label': `${
                                  PLATFORM_DETAILS[platform.id].name
                                } ${ROLE_LABELS[role]} 허용`,
                              }}
                            />
                          }
                          label={
                            <Typography variant="caption">
                              {ROLE_LABELS[role]}
                            </Typography>
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
          {section !== 'platforms' && (
            <div style={{ marginTop: 28 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Typography style={{ fontWeight: 700 }}>
                  테넌트 사용자 · {members.length}명
                </Typography>
                <TextField
                  id="tenant-member-search"
                  label="사용자 찾기"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  variant="outlined"
                  size="small"
                />
              </div>
              <Typography
                variant="body2"
                color="textSecondary"
                style={{ margin: '10px 0 14px' }}
              >
                {superuser
                  ? '슈퍼유저는 소속 사용자를 테넌트 관리자로 지정할 수 있습니다.'
                  : '테넌트 관리자 지정은 슈퍼유저가 수행합니다.'}{' '}
                사용자별 허용 목록은 역할과 테넌트 이용 설정을 넘어서지
                않습니다.
              </Typography>
              <TableContainer>
                <Table size="small" aria-label="테넌트 사용자 플랫폼 접근 권한">
                  <TableHead>
                    <TableRow>
                      <TableCell>사용자</TableCell>
                      <TableCell>역할</TableCell>
                      {PLATFORM_IDS.map(id => (
                        <TableCell key={id} align="center">
                          {PLATFORM_DETAILS[id].name}
                        </TableCell>
                      ))}
                      <TableCell>관리자 지정</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members
                      .filter(
                        member =>
                          member.name.includes(search) ||
                          member.id.includes(search),
                      )
                      .map(member => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <Typography
                              variant="body2"
                              style={{ whiteSpace: 'nowrap', fontWeight: 600 }}
                            >
                              {member.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {member.roles.map(role => (
                              <Chip
                                key={role}
                                size="small"
                                label={
                                  role === 'portal-admin'
                                    ? '슈퍼유저'
                                    : ROLE_LABELS[role]
                                }
                                style={{ margin: 2 }}
                              />
                            ))}
                          </TableCell>
                          {PLATFORM_IDS.map(id => {
                            const platform = draft.platforms.find(
                              p => p.id === id,
                            )!;
                            const eligible =
                              platform.enabled &&
                              platform.allowedRoles.some(role =>
                                member.roles.includes(role),
                              );
                            const checked = (
                              draft.userGrants[member.id] || [...PLATFORM_IDS]
                            ).includes(id);
                            return (
                              <TableCell key={id} align="center">
                                <Tooltip
                                  title={
                                    !eligible
                                      ? '테넌트 또는 역할 설정으로 제한됩니다.'
                                      : '사용자별 이용 허용'
                                  }
                                >
                                  <span>
                                    <Checkbox
                                      color="primary"
                                      checked={eligible && checked}
                                      disabled={
                                        !canManage || !eligible || saving
                                      }
                                      inputProps={{
                                        'aria-label': `${member.name} ${PLATFORM_DETAILS[id].name} 접근`,
                                      }}
                                      onChange={(_, allow) =>
                                        setDraft(current => ({
                                          ...current,
                                          userGrants: {
                                            ...current.userGrants,
                                            [member.id]: allow
                                              ? Array.from(
                                                  new Set([
                                                    ...(current.userGrants[
                                                      member.id
                                                    ] || PLATFORM_IDS),
                                                    id,
                                                  ]),
                                                )
                                              : (
                                                  current.userGrants[
                                                    member.id
                                                  ] || PLATFORM_IDS
                                                ).filter(p => p !== id),
                                          },
                                        }))
                                      }
                                    />
                                  </span>
                                </Tooltip>
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            {member.roles.includes('branch-admin') ||
                            member.roles.includes('portal-admin') ? (
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                지정 완료
                              </Typography>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!superuser || saving}
                                onClick={() => {
                                  setAdminMember(member);
                                  setReason('');
                                }}
                              >
                                관리자로 지정
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {members.length === 0 && (
                <Typography color="textSecondary" style={{ padding: 24 }}>
                  등록된 사용자가 없습니다.
                </Typography>
              )}
            </div>
          )}
        </>
      )}
      <Dialog
        open={!!adminMember}
        onClose={() => !assigning && setAdminMember(undefined)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>테넌트 관리자 지정</DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={{ marginBottom: 20 }}>
            {adminMember?.name}님에게{' '}
            {tenants.find(t => t.id === tenantId)?.name}의 사용자·플랫폼
            접근·포털 디자인 관리 권한을 부여합니다.
          </Typography>
          <TextField
            id="tenant-admin-reason"
            fullWidth
            multiline
            minRows={2}
            label="지정 사유"
            variant="outlined"
            value={reason}
            onChange={event => setReason(event.target.value)}
            inputProps={{ maxLength: 1000 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            disabled={assigning}
            onClick={() => setAdminMember(undefined)}
          >
            취소
          </Button>
          <Button
            color="primary"
            variant="contained"
            disabled={assigning || !reason.trim()}
            onClick={assign}
          >
            {assigning ? '지정 중…' : '관리자 지정'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
