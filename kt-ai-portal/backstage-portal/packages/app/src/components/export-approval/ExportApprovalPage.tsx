import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import { useAuthz } from '../authz';
import { ROLE_LABELS } from '../authz/types';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { ExportRequestList } from './ExportRequestList';
import { ExportRequestDetail } from './ExportRequestDetail';
import { ExportRequestForm } from './ExportRequestForm';
import { TransferServerPage } from './TransferServerPage';
import { mockExportRequests } from './mockExportRequests';
import {
  applyExportDecision,
  createExportDecision,
  exportDecisionStorageKey,
  readExportDecisions,
  saveExportDecisions,
  ExportDecision,
} from './exportDecisionStore';
import {
  createDemoExportRequest,
  exportRequestStorageKey,
  readDemoExportRequests,
  saveDemoExportRequests,
  DemoExportRequestInput,
} from './exportRequestStore';
import { ExportRequest } from './types';

type ReviewAction = 'approved' | 'rejected';

const reviewActionLabel: Record<ReviewAction, string> = {
  approved: '승인',
  rejected: '반려',
};

const reviewableStatuses: ExportRequest['status'][] = [
  'requested',
  'reviewing',
];

const ExportApprovalContent = () => {
  const { hasPermission } = useAuthz();
  const canReview = hasPermission('export.review');
  const { isDemo, tenantId, actorId, roles } = usePortalRuntime();
  const writable = isDemo && !!tenantId && !!actorId;
  const decisionKey = exportDecisionStorageKey(tenantId, actorId);
  const demoRequestKey = exportRequestStorageKey(tenantId, actorId);
  const [loadedDecisions] = useState(() =>
    writable
      ? readExportDecisions(decisionKey)
      : { items: [] as ExportDecision[], error: undefined },
  );
  const [loadedDemoRequests] = useState(() =>
    writable
      ? readDemoExportRequests(demoRequestKey)
      : { items: [] as ExportRequest[], error: undefined },
  );
  const [decisions, setDecisions] = useState<ExportDecision[]>(
    loadedDecisions.items,
  );
  const [demoRequests, setDemoRequests] = useState<ExportRequest[]>(
    loadedDemoRequests.items,
  );
  const [storageError, setStorageError] = useState<string | null>(
    loadedDecisions.error || loadedDemoRequests.error || null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const [tabIndex, setTabIndex] = useState(0);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('request') ?? mockExportRequests[0].id;
  const setSelectedId = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('request', id);
    setParams(next);
  };
  const [pendingAction, setPendingAction] = useState<
    ReviewAction | undefined
  >();

  const decisionById = new Map(
    decisions.map(decision => [decision.requestId, decision]),
  );
  const requests: ExportRequest[] = [
    ...demoRequests,
    ...mockExportRequests,
  ].map(request => {
    const decision = decisionById.get(request.id);
    return decision ? applyExportDecision(request, decision) : request;
  });

  const selectedRequest =
    requests.find(request => request.id === selectedId) ?? requests[0];
  const reviewable =
    !!selectedRequest && reviewableStatuses.includes(selectedRequest.status);

  const approverLabel = `${actorId}(${
    roles.map(role => ROLE_LABELS[role] ?? role).join(', ') || '역할 없음'
  })`;

  const handleReviewConfirm = () => {
    if (!pendingAction || !selectedRequest) return;
    const action = pendingAction;
    const decision = createExportDecision(
      selectedRequest.id,
      action,
      approverLabel,
    );
    const next = [
      decision,
      ...decisions.filter(item => item.requestId !== decision.requestId),
    ];
    if (writable) {
      try {
        saveExportDecisions(decisionKey, next);
        setStorageError(null);
      } catch (error) {
        setStorageError(
          error instanceof Error ? error.message : '저장하지 못했습니다.',
        );
        return;
      }
    }
    setDecisions(next);
    setNotice(
      `'${selectedRequest.targetName}' 신청을 ${reviewActionLabel[action]} 처리했습니다.`,
    );
    setPendingAction(undefined);
  };

  const handleDemoSubmit = (input: DemoExportRequestInput): string | null => {
    if (!writable) return '데모 모드에서만 로컬 접수할 수 있습니다.';
    try {
      const request = createDemoExportRequest(input);
      const next = [request, ...demoRequests];
      saveDemoExportRequests(demoRequestKey, next);
      setDemoRequests(next);
      setStorageError(null);
      setNotice(
        '신청을 접수 대기(데모) 상태로 저장했습니다. 실제 승인 절차는 서비스 연결 후 진행됩니다.',
      );
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : '저장하지 못했습니다.';
    }
  };

  return (
    <Box padding={3}>
      <Typography variant="h4" gutterBottom>
        반입·반출 승인
      </Typography>
      <Typography color="textSecondary" paragraph>
        반입·반출 승인 관리
      </Typography>

      {storageError && (
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          {storageError}
        </Alert>
      )}

      <Tabs
        value={tabIndex}
        onChange={(_, value) => setTabIndex(value)}
        indicatorColor="primary"
        textColor="primary"
        style={{ marginBottom: 16 }}
      >
        <Tab label="신청 목록" />
        <Tab label="신청 등록" />
      </Tabs>

      {tabIndex === 0 && selectedRequest && (
        <Box>
          <ExportRequestList
            requests={requests}
            selectedId={selectedRequest.id}
            onSelect={request => setSelectedId(request.id)}
          />
          <Box marginTop={3}>
            <ExportRequestDetail request={selectedRequest} />
          </Box>
          <Box
            marginTop={2}
            display="flex"
            alignItems="center"
            style={{ gap: 8 }}
          >
            {canReview ? (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!reviewable}
                  onClick={() => setPendingAction('approved')}
                >
                  승인
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  disabled={!reviewable}
                  onClick={() => setPendingAction('rejected')}
                >
                  반려
                </Button>
                {!reviewable && (
                  <Typography variant="body2" color="textSecondary">
                    현재 상태({selectedRequest.status})에서는 승인·반려할 수
                    없습니다.
                  </Typography>
                )}
              </>
            ) : (
              <Chip
                variant="outlined"
                label="승인 권한이 필요합니다"
                title="반입·반출 검토(export.review) 권한이 있는 사용자만 승인·반려할 수 있습니다."
              />
            )}
          </Box>
        </Box>
      )}

      {tabIndex === 1 && (
        <ExportRequestForm
          demoMode={writable}
          onDemoSubmit={handleDemoSubmit}
        />
      )}

      <Dialog
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(undefined)}
      >
        <DialogTitle>
          반입·반출 신청 {pendingAction ? reviewActionLabel[pendingAction] : ''}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            '{selectedRequest?.targetName}' 신청을{' '}
            {pendingAction ? reviewActionLabel[pendingAction] : ''}하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingAction(undefined)}>취소</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleReviewConfirm}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </Box>
  );
};

export const ExportApprovalPage = () => {
  const { tenantId, actorId, isDemo } = usePortalRuntime();
  const content = isDemo ? (
    <ExportApprovalContent />
  ) : (
    <TransferServerPage />
  );
  return <Box key={`${tenantId}:${actorId}`}>{content}</Box>;
};
