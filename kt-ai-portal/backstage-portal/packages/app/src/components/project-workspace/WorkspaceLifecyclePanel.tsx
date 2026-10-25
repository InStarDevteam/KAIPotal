import { useState } from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Chip from '@material-ui/core/Chip';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import LinearProgress from '@material-ui/core/LinearProgress';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Link from '@material-ui/core/Link';
import Box from '@material-ui/core/Box';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { WorkspaceLifecycle, WorkspaceLifecycleState } from './types';
import { useAuthz } from '../authz';

const LIFECYCLE_STEPS = ['신청', '승인', '생성중', '사용중', '만료예정', '종료'];

const STATE_LABEL: Record<WorkspaceLifecycleState, string> = {
  requested: '신청',
  approved: '승인',
  provisioning: '생성중',
  active: '사용중',
  expiring: '만료예정',
  terminated: '종료',
  failed: '생성실패',
  rolling_back: '원복 진행중',
};

const stateChipColor = (state: WorkspaceLifecycleState) => {
  if (state === 'active') return 'primary';
  if (state === 'failed' || state === 'rolling_back') return 'secondary';
  return 'default';
};

const stateToStep = (state: WorkspaceLifecycleState): number => {
  switch (state) {
    case 'requested':
      return 0;
    case 'approved':
      return 1;
    case 'provisioning':
    case 'failed':
    case 'rolling_back':
      return 2;
    case 'active':
      return 3;
    case 'expiring':
      return 4;
    case 'terminated':
      return LIFECYCLE_STEPS.length;
    default:
      return 0;
  }
};

const EXPIRY_WARNING_DAYS = 30;

const isExpiringSoon = (lifecycle: WorkspaceLifecycle): boolean => {
  if (lifecycle.state !== 'active' && lifecycle.state !== 'expiring') {
    return false;
  }
  const diffMs =
    new Date(lifecycle.expiresAt).getTime() - new Date().getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= EXPIRY_WARNING_DAYS;
};

const QuotaBar = ({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
}) => {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <Box marginBottom={1}>
      <Box display="flex" justifyContent="space-between">
        <Typography variant="body2" color="textSecondary">
          {label}
        </Typography>
        <Typography variant="body2">
          {used} / {limit} {unit}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={percent} />
    </Box>
  );
};

export const WorkspaceLifecyclePanel = ({
  lifecycle,
}: {
  lifecycle: WorkspaceLifecycle;
}) => {
  const { hasPermission } = useAuthz();
  const canRequestWorkspace = hasPermission('workspace.request');
  const [requestedAction, setRequestedAction] = useState<
    'resource' | 'terminate' | null
  >(null);

  const isFailedState =
    lifecycle.state === 'failed' || lifecycle.state === 'rolling_back';
  const activeStep = stateToStep(lifecycle.state);
  const expiringSoon = isExpiringSoon(lifecycle);
  const isActive = lifecycle.state === 'active' || lifecycle.state === 'expiring';

  const handleResourceRequest = () => {
    if (requestedAction) return;
    // eslint-disable-next-line no-alert
    if (window.confirm('추가 자원을 요청하시겠습니까? 승인 후 할당량에 반영됩니다.')) {
      setRequestedAction('resource');
    }
  };

  const [terminateConfirmOpen, setTerminateConfirmOpen] = useState(false);

  const handleTerminateRequest = () => {
    if (requestedAction) return;
    setTerminateConfirmOpen(true);
  };

  const confirmTerminateRequest = () => {
    setRequestedAction('terminate');
    setTerminateConfirmOpen(false);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" gridGap={8}>
          <Typography variant="h6">워크스페이스 생애주기</Typography>
          <Chip
            size="small"
            label={STATE_LABEL[lifecycle.state]}
            color={stateChipColor(lifecycle.state)}
          />
          {expiringSoon && (
            <Chip
              size="small"
              color="secondary"
              label={`만료예정 (${lifecycle.expiresAt} 종료)`}
            />
          )}
          {requestedAction === 'resource' && (
            <Chip size="small" color="primary" label="추가 자원 요청 접수됨" />
          )}
          {requestedAction === 'terminate' && (
            <Chip size="small" color="secondary" label="종료 신청 접수됨" />
          )}
        </Box>

        <Box marginTop={2} marginBottom={2}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {LIFECYCLE_STEPS.map(label => (
              <Step key={label}>
                <StepLabel
                  error={
                    isFailedState && label === '생성중'
                  }
                >
                  {isFailedState && label === '생성중'
                    ? `${label} (${STATE_LABEL[lifecycle.state]})`
                    : label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {lifecycle.rollback && (
          <Box marginBottom={2}>
            <Typography variant="subtitle2" gutterBottom>
              자원·크레딧 원복 상태
            </Typography>
            <Typography variant="body2" color="textSecondary">
              사유: {lifecycle.rollback.reason}
            </Typography>
            <Box display="flex" gridGap={8} marginTop={1}>
              <Chip
                size="small"
                label={
                  lifecycle.rollback.status === 'completed'
                    ? '자원 원복 완료'
                    : '자원 원복 진행중'
                }
                color={
                  lifecycle.rollback.status === 'completed'
                    ? 'primary'
                    : 'secondary'
                }
              />
              <Chip
                size="small"
                label={
                  lifecycle.rollback.creditRestored
                    ? '크레딧 원복 완료'
                    : '크레딧 원복 진행중'
                }
                color={
                  lifecycle.rollback.creditRestored ? 'primary' : 'secondary'
                }
              />
            </Box>
          </Box>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              할당량 사용 현황
            </Typography>
            <QuotaBar
              label="CPU"
              used={lifecycle.usage.cpuCores}
              limit={lifecycle.limit.cpuCores}
              unit="vCore"
            />
            <QuotaBar
              label="GPU"
              used={lifecycle.usage.gpuCount}
              limit={lifecycle.limit.gpuCount}
              unit="개"
            />
            <QuotaBar
              label="Memory"
              used={lifecycle.usage.memoryGiB}
              limit={lifecycle.limit.memoryGiB}
              unit="GiB"
            />
            <QuotaBar
              label="Storage"
              used={lifecycle.usage.storageGiB}
              limit={lifecycle.limit.storageGiB}
              unit="GiB"
            />

            {lifecycle.realtimeUsage && (
              <Box marginTop={2}>
                <Typography variant="subtitle2" gutterBottom>
                  실시간 사용량 (기준 데이터)
                </Typography>
                <Typography variant="body2">
                  CPU {lifecycle.realtimeUsage.cpuPercent}% · GPU{' '}
                  {lifecycle.realtimeUsage.gpuPercent}%
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  갱신 시각:{' '}
                  {new Date(
                    lifecycle.realtimeUsage.measuredAt,
                  ).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              멤버·RBAC
            </Typography>
            <List dense>
              {lifecycle.members.map(member => (
                <ListItem key={member.userId} disableGutters>
                  <ListItemText
                    primary={`${member.name} (${member.userId})`}
                    secondary={`${member.organization} · ${member.role}`}
                  />
                </ListItem>
              ))}
            </List>

            <Typography variant="subtitle2" gutterBottom>
              접속 링크
            </Typography>
            {isActive && lifecycle.accessUrl ? (
              <Link href={lifecycle.accessUrl} target="_blank" rel="noreferrer">
                {lifecycle.accessUrl}
              </Link>
            ) : (
              <Typography variant="body2" color="textSecondary">
                사용중 상태에서 접속 링크가 활성화됩니다.
              </Typography>
            )}

            <Box marginTop={2}>
              <Typography variant="body2" color="textSecondary">
                신청 {new Date(lifecycle.requestedAt).toLocaleString()}
                {lifecycle.approvedAt &&
                  ` · 승인 ${new Date(lifecycle.approvedAt).toLocaleString()}`}
                {lifecycle.activatedAt &&
                  ` · 생성 완료 ${new Date(
                    lifecycle.activatedAt,
                  ).toLocaleString()}`}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                사용 종료일: {lifecycle.expiresAt}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider style={{ margin: '16px 0' }} />

        <Box display="flex" alignItems="center" gridGap={8} flexWrap="wrap">
          {canRequestWorkspace && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              disabled={requestedAction !== null || isFailedState}
              onClick={handleResourceRequest}
            >
              추가 자원 요청
            </Button>
          )}
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            disabled={requestedAction !== null || lifecycle.state === 'terminated'}
            onClick={handleTerminateRequest}
          >
            종료 신청
          </Button>
          <Typography variant="caption" color="textSecondary">
            종료 신청 전 산출물 보존·성과등록·반출 절차를 연결하여 진행해야
            합니다. 산출물은 결과 영속보관 위치로 이관되며, 성과등록 및 반출은
            별도 승인 절차를 따릅니다.
          </Typography>
        </Box>
      </CardContent>

      <Dialog
        open={terminateConfirmOpen}
        onClose={() => setTerminateConfirmOpen(false)}
      >
        <DialogTitle>워크스페이스 종료 신청</DialogTitle>
        <DialogContent>
          <DialogContentText>
            워크스페이스 종료를 신청하시겠습니까? 종료 전 산출물 보존 조치가
            필요합니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateConfirmOpen(false)}>취소</Button>
          <Button
            onClick={confirmTerminateRequest}
            color="secondary"
            variant="contained"
          >
            종료 신청
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
