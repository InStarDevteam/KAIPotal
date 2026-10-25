import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { EmptyState, SectionCard, StatusChip } from '../common';
import {
  ACTION_STATUS_FLOW,
  ACTION_STATUS_LABELS,
  actionStatusLabel,
  formatDate,
  isOverdue,
} from './krmfLabels';
import {
  KrmfAction,
  KrmfActionStatus,
  KrmfControl,
  createKrmfAction,
  getKrmfActions,
  getKrmfControls,
  updateKrmfActionStatus,
} from './krmfApi';
import { KrmfQueryBoundary } from './KrmfQueryView';
import { ChangePanel } from './ChangePanel';
import { EvalSupportPanel } from './EvalSupportPanel';
import { KrmfTabContext } from './KrmfMonitorPage';
import { useKrmfQuery } from './useKrmfQuery';

const PAGE_SIZE = 10;

const actionStatusTone = (status: string) => {
  if (status === 'open') return 'error' as const;
  if (status === 'in_progress') return 'warning' as const;
  if (status === 'resolved') return 'success' as const;
  return 'info' as const;
};

export const KrmfActionsTab = ({ context }: { context: KrmfTabContext }) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [pendingStatus, setPendingStatus] = useState<{
    action: KrmfAction;
    next: KrmfActionStatus;
  } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newControlId, setNewControlId] = useState('');
  const [newCause, setNewCause] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const actionsState = useKrmfQuery<KrmfAction[]>(
    () =>
      getKrmfActions(context.request, {
        status: statusFilter || undefined,
        overdue: overdueOnly || undefined,
      }),
    [context.tenantId, statusFilter, overdueOnly],
  );

  const controlsState = useKrmfQuery<KrmfControl[]>(
    () =>
      context.baselineId
        ? getKrmfControls(context.request, context.baselineId)
        : Promise.resolve([] as KrmfControl[]),
    [context.tenantId, context.baselineId],
  );

  const nextStatusOf = (action: KrmfAction): KrmfActionStatus | null => {
    const index = ACTION_STATUS_FLOW.indexOf(action.status);
    if (index < 0 || index >= ACTION_STATUS_FLOW.length - 1) return null;
    return ACTION_STATUS_FLOW[index + 1] as KrmfActionStatus;
  };

  const handleTransition = async () => {
    if (!pendingStatus) return;
    setTransitioning(true);
    setTransitionError('');
    try {
      await updateKrmfActionStatus(
        context.request,
        pendingStatus.action.id,
        pendingStatus.next,
      );
      setPendingStatus(null);
      actionsState.reload();
    } catch (error) {
      setTransitionError(
        error instanceof Error ? error.message : '상태 변경에 실패했습니다.',
      );
    } finally {
      setTransitioning(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setCreateError('조치 제목을 입력하세요.');
      return;
    }
    if (!context.baselineId || !newControlId) {
      setCreateError('기준선을 선택하고 통제를 지정하세요.');
      return;
    }
    if (!newCause.trim()) {
      setCreateError('미흡 원인을 입력하세요.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await createKrmfAction(context.request, {
        control_id: newControlId,
        title: newTitle.trim(),
        cause: newCause.trim(),
        due_date: newDueDate || undefined,
      });
      setNewTitle('');
      setNewControlId('');
      setNewCause('');
      setNewDueDate('');
      actionsState.reload();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : '조치 등록에 실패했습니다.',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <SectionCard title="미흡 조치" compact data-testid="krmf-actions-tab">
          <Box display="flex" gridGap={1} flexWrap="wrap" marginBottom={1}>
            <TextField
              select
              size="small"
              label="상태"
              value={statusFilter}
              onChange={event => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
              style={{ minWidth: 150 }}
            >
              <MenuItem value="">전체</MenuItem>
              {Object.entries(ACTION_STATUS_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="기한"
              value={overdueOnly ? 'overdue' : ''}
              onChange={event => {
                setOverdueOnly(event.target.value === 'overdue');
                setPage(0);
              }}
              style={{ minWidth: 150 }}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="overdue">기한 초과만</MenuItem>
            </TextField>
          </Box>

          <KrmfQueryBoundary state={actionsState}>
            {actions => {
              if (!actions.length)
                return (
                  <EmptyState
                    message="표시할 조치가 없습니다"
                    description="담당 조치가 없거나 필터 조건에 해당하는 조치가 없습니다."
                  />
                );
              const paged = actions.slice(
                page * PAGE_SIZE,
                page * PAGE_SIZE + PAGE_SIZE,
              );
              return (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>조치</TableCell>
                          <TableCell>통제</TableCell>
                          <TableCell>원인</TableCell>
                          <TableCell>담당</TableCell>
                          <TableCell>기한</TableCell>
                          <TableCell>상태</TableCell>
                          <TableCell>전이</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paged.map(action => {
                          const overdue =
                            action.overdue === true ||
                            isOverdue(action.due_date);
                          const next = nextStatusOf(action);
                          return (
                            <TableRow key={action.id}>
                              <TableCell>{action.title}</TableCell>
                              <TableCell>
                                {action.control_code || action.control_id || '—'}
                              </TableCell>
                              <TableCell>{action.cause || '—'}</TableCell>
                              <TableCell>{action.owner_name || action.owner_id || '—'}</TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  color={overdue ? 'error' : 'initial'}
                                  style={
                                    overdue ? { fontWeight: 600 } : undefined
                                  }
                                >
                                  {formatDate(action.due_date)}
                                  {overdue ? ' (초과)' : ''}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <StatusChip
                                  tone={actionStatusTone(action.status)}
                                  label={actionStatusLabel(action.status)}
                                />
                              </TableCell>
                              <TableCell>
                                {next ? (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() =>
                                      setPendingStatus({ action, next })
                                    }
                                  >
                                    {actionStatusLabel(next)}
                                  </Button>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={actions.length}
                    page={page}
                    onPageChange={(_, next) => setPage(next)}
                    rowsPerPage={PAGE_SIZE}
                    rowsPerPageOptions={[PAGE_SIZE]}
                    labelRowsPerPage="페이지당 행"
                  />
                </>
              );
            }}
          </KrmfQueryBoundary>

          {context.canManage ? (
            <Box display="flex" gridGap={1} flexWrap="wrap" marginTop={1} alignItems="center">
              <TextField
                size="small"
                label="조치 제목"
                value={newTitle}
                onChange={event => setNewTitle(event.target.value)}
                style={{ minWidth: 220 }}
              />
              <TextField
                select
                size="small"
                label="통제"
                value={newControlId}
                onChange={event => setNewControlId(event.target.value)}
                style={{ minWidth: 220 }}
                disabled={!context.baselineId}
                helperText={
                  context.baselineId ? undefined : '기준선을 먼저 선택하세요'
                }
              >
                {(controlsState.data ?? []).map(control => (
                  <MenuItem key={control.id} value={control.id}>
                    {control.control_code} {control.title}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="원인"
                value={newCause}
                onChange={event => setNewCause(event.target.value)}
                style={{ minWidth: 180 }}
              />
              <TextField
                size="small"
                label="기한"
                type="date"
                value={newDueDate}
                onChange={event => setNewDueDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button
                size="small"
                variant="contained"
                color="primary"
                disabled={creating}
                onClick={() => void handleCreate()}
              >
                조치 등록
              </Button>
            </Box>
          ) : null}
          {createError ? (
            <Typography variant="body2" color="error">
              {createError}
            </Typography>
          ) : null}

          {pendingStatus ? (
            <Dialog
              open
              onClose={() => setPendingStatus(null)}
              fullWidth
              maxWidth="xs"
            >
              <DialogTitle>조치 상태 전이</DialogTitle>
              <DialogContent>
                <Typography variant="body2">
                  '{pendingStatus.action.title}' 상태를{' '}
                  {actionStatusLabel(pendingStatus.next)}(으)로 변경합니다.
                </Typography>
                {transitionError ? (
                  <Typography variant="body2" color="error">
                    {transitionError}
                  </Typography>
                ) : null}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setPendingStatus(null)}
                  disabled={transitioning}
                >
                  취소
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  disabled={transitioning}
                  onClick={() => void handleTransition()}
                >
                  확인
                </Button>
              </DialogActions>
            </Dialog>
          ) : null}
        </SectionCard>
      </Grid>
      <Grid item xs={12}>
        <ChangePanel context={context} />
      </Grid>
      <Grid item xs={12}>
        <EvalSupportPanel context={context} />
      </Grid>
    </Grid>
  );
};
