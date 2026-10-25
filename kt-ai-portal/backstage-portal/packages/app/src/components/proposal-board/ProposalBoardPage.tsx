import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Typography,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { mockProposals } from './mockProposalData';
import { ServerProposalBoard } from './ServerProposalBoard';
import { ProposalSummaryCards } from './ProposalSummaryCards';
import { ProposalTabs } from './ProposalTabs';
import { ProposalList } from './ProposalList';
import { ProposalDetail } from './ProposalDetail';
import { ProposalForm } from './ProposalForm';
import { ProposalAdminReviewPanel } from './ProposalAdminReviewPanel';
import {
  Proposal,
  ProposalDraft,
  ProposalReaction,
  ProposalTab,
} from './types';
import {
  createDemoProposal,
  normalizeProposalDraft,
  proposalId,
  proposalStorageKey,
  readDemoProposals,
  saveDemoProposals,
  toggleProposalReaction,
} from './demoProposalStore';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

const ProposalBoardContent = ({
  tenantId,
  actorId,
  isDemo,
  canReview,
}: {
  tenantId: string;
  actorId: string;
  isDemo: boolean;
  canReview: boolean;
}) => {
  const storageKey = proposalStorageKey(tenantId, actorId);
  const writable = isDemo && !!tenantId && !!actorId;
  const [loaded] = useState(() =>
    writable
      ? readDemoProposals(storageKey, mockProposals)
      : { items: [] as Proposal[], error: undefined },
  );
  const [activeTab, setActiveTab] = useState<ProposalTab>('전체 제안');
  const [proposals, setProposals] = useState<Proposal[]>(loaded.items);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(loaded.error ? { message: loaded.error, error: true } : null);
  const selectedProposal =
    proposals.find(proposal => proposal.id === selectedId) || null;
  const editingProposal = proposals.find(proposal => proposal.id === editingId);
  const filteredProposals = proposals.filter(proposal => {
    if (activeTab === '전체 제안') return true;
    if (activeTab === '내 제안') return proposal.ownerId === actorId;
    if (activeTab === '관리자 검토') return false;
    if (activeTab === '빅데이터 분석')
      return proposal.category === '빅데이터 분석 모델 개발';
    return proposal.category === activeTab;
  });
  const commit = (next: Proposal[], message: string): boolean => {
    if (!writable) return false;
    try {
      // Persist before updating UI: a failed local write must never look successful.
      saveDemoProposals(storageKey, next);
      setProposals(next);
      setNotice({ message, error: false });
      return true;
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : '저장하지 못했습니다.',
        error: true,
      });
      return false;
    }
  };
  const handleFormSubmit = (draft: ProposalDraft): boolean => {
    if (!writable) return false;
    try {
      if (editingProposal && editingProposal.ownerId !== actorId) return false;
      const next = editingProposal
        ? {
            ...editingProposal,
            ...normalizeProposalDraft(draft),
            expectedBenefit: draft.expectedEffect.trim(),
          }
        : createDemoProposal(draft, actorId);
      if (
        !commit(
          editingProposal
            ? proposals.map(p => (p.id === next.id ? next : p))
            : [next, ...proposals],
          editingProposal ? '제안을 수정했습니다.' : '제안을 등록했습니다.',
        )
      )
        return false;
      setSelectedId(next.id);
      setEditingId(null);
      setActiveTab('내 제안');
      return true;
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : '입력 내용을 확인하세요.',
        error: true,
      });
      return false;
    }
  };
  const handleAdminAction = (action: string, id: string) => {
    if (!writable || !canReview) return;
    const statusMap: Record<string, Proposal['status']> = {
      '검토 시작': '검토중',
      '공지 승인': '공지승인',
      '보완 요청': '보완요청',
      반려: '반려',
      '진행 검토': '진행검토',
    };
    const status = statusMap[action];
    if (!status) return;
    commit(
      proposals.map(p =>
        p.id !== id
          ? p
          : {
              ...p,
              status,
              isNoticed: status === '공지승인',
              nextAction: action,
              statusHistory: [
                ...p.statusHistory,
                {
                  status,
                  updatedAt: new Date().toISOString(),
                  updatedBy: '관리자',
                  note: action,
                },
              ],
            },
      ),
      `제안을 ${status} 상태로 변경했습니다.`,
    );
  };
  const handleReaction = (reaction: ProposalReaction) => {
    if (!selectedProposal) return;
    commit(
      proposals.map(p =>
        p.id === selectedId ? toggleProposalReaction(p, reaction) : p,
      ),
      '공감 설정을 저장했습니다.',
    );
  };
  const handleComment = (content: string): boolean => {
    const trimmed = content.trim();
    if (!selectedProposal || !trimmed || trimmed.length > 2000) return false;
    return commit(
      proposals.map(p =>
        p.id !== selectedId
          ? p
          : {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: proposalId(),
                  author: '나',
                  content: trimmed,
                  createdAt: new Date().toISOString().slice(0, 10),
                },
              ],
            },
      ),
      '댓글을 등록했습니다.',
    );
  };
  return (
    <Box padding={3}>
      <Typography variant="h4" gutterBottom style={{ fontWeight: 600 }}>
        제안 게시판
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        AI 모델 개발, 빅데이터 분석, 데이터셋 구축 제안을 등록하고 공감과 의견을
        나눕니다.
      </Typography>
      <Alert severity="info">
        {isDemo
          ? '체험 데이터입니다. 제안과 공감·댓글은 현재 브라우저에서 소속과 사용자별로 저장됩니다.'
          : '제안 서비스 연결이 필요합니다. 연결 후 제안 조회와 등록을 이용할 수 있습니다.'}
      </Alert>
      {notice && (
        <Box mt={2}>
          <Alert
            severity={notice.error ? 'error' : 'success'}
            onClose={() => setNotice(null)}
          >
            {notice.message}
          </Alert>
        </Box>
      )}
      <Box marginTop={2} marginBottom={2}>
        <ProposalSummaryCards proposals={proposals} />
      </Box>
      <Box marginBottom={2}>
        <ProposalTabs
          value={activeTab}
          onChange={tab => {
            setActiveTab(tab);
            setSelectedId(null);
            setEditingId(null);
          }}
          canReview={canReview}
        />
      </Box>
      {activeTab === '관리자 검토' && canReview && (
        <ProposalAdminReviewPanel
          proposals={proposals}
          onActionMock={writable ? handleAdminAction : undefined}
        />
      )}
      {activeTab !== '관리자 검토' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <ProposalList
              proposals={filteredProposals}
              selectedProposal={selectedProposal}
              onSelect={p => setSelectedId(p.id)}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <ProposalDetail
              key={selectedId || 'empty'}
              proposal={selectedProposal}
              onReaction={writable ? handleReaction : undefined}
              onComment={writable ? handleComment : undefined}
              onEdit={
                writable && selectedProposal?.ownerId === actorId
                  ? () => setEditingId(selectedId)
                  : undefined
              }
              onDelete={
                writable && selectedProposal?.ownerId === actorId
                  ? () => setDeleteId(selectedId)
                  : undefined
              }
            />
          </Grid>
        </Grid>
      )}
      {activeTab !== '관리자 검토' && (
        <Box marginTop={3}>
          <ProposalForm
            key={editingId || 'new'}
            onSubmit={handleFormSubmit}
            initialProposal={editingProposal}
            disabled={!writable}
            onCancel={editingId ? () => setEditingId(null) : undefined}
          />
        </Box>
      )}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        aria-labelledby="proposal-delete-title"
      >
        <DialogTitle id="proposal-delete-title">
          내 제안을 삭제할까요?
        </DialogTitle>
        <DialogContent>
          제안에 작성된 댓글과 공감도 함께 삭제됩니다.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>취소</Button>
          <Button
            color="secondary"
            onClick={() => {
              if (proposals.find(p => p.id === deleteId)?.ownerId !== actorId)
                return;
              if (
                commit(
                  proposals.filter(p => p.id !== deleteId),
                  '제안을 삭제했습니다.',
                )
              ) {
                setDeleteId(null);
                setSelectedId(null);
                setEditingId(null);
              }
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// A changed tenant/user remounts every form and selection before any write occurs.
export const ProposalBoardPage = () => {
  const runtime = usePortalRuntime();
  if (runtime.loading) return <Box p={3}>제안 게시판을 불러오는 중입니다.</Box>;
  if (!runtime.isDemo)
    return (
      <Box padding={3}>
        <Typography variant="h4" gutterBottom style={{ fontWeight: 600 }}>
          제안 게시판
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          AI 모델 개발, 빅데이터 분석, 데이터셋 구축 제안을 등록하고 공감과 검토 답변을
          나눕니다.
        </Typography>
        <ServerProposalBoard key={`${runtime.tenantId}:${runtime.actorId}`} />
      </Box>
    );
  return (
    <ProposalBoardContent
      key={`${runtime.isDemo}:${runtime.tenantId}:${runtime.actorId}`}
      tenantId={runtime.tenantId}
      actorId={runtime.actorId}
      isDemo={runtime.isDemo}
      canReview={runtime.roles.some(role =>
        ['portal-admin', 'branch-admin'].includes(role),
      )}
    />
  );
};
