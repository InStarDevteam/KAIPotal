import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { UserRegistration, UserStatusHistory } from './types';
import { UserIdentityVerificationChip } from './UserIdentityVerificationChip';
import { UserApprovalStatusChip } from './UserApprovalStatusChip';
import { UserApprovalWorkflow } from './UserApprovalWorkflow';

interface UserRegistrationDetailProps {
  registration: UserRegistration;
  onUpdate: (updated: UserRegistration, history: UserStatusHistory) => void;
}

export const UserRegistrationDetail = ({ registration, onUpdate }: UserRegistrationDetailProps) => {
  const [comment, setComment] = useState(registration.reviewComment || '');

  const handleAction = (action: 'review' | 'approve' | 'reject' | 'requestSupplement' | 'resubmit') => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    let newStatus = registration.status;
    let reason = comment || '';

    switch (action) {
      case 'review':
        newStatus = '검토중';
        reason = reason || '검토 시작';
        break;
      case 'approve':
        newStatus = '승인';
        reason = reason || '승인 완료';
        break;
      case 'reject':
        newStatus = '반려';
        reason = reason || '반려';
        break;
      case 'requestSupplement':
        newStatus = '보완요청';
        reason = reason || '보완 요청';
        break;
      case 'resubmit':
        newStatus = '검토중';
        reason = reason || '재신청 접수';
        break;
      default:
        return;
    }

    const updated: UserRegistration = {
      ...registration,
      status: newStatus,
      reviewComment: comment,
    };

    const history: UserStatusHistory = {
      id: `hist-${Date.now()}`,
      timestamp: now,
      actor: '김국방',
      userId: registration.id,
      event: ({ approve: '승인', reject: '반려', review: '검토 시작', requestSupplement: '보완요청', resubmit: '사용자 등록 신청' } as const)[action],
      previousStatus: registration.status,
      newStatus,
      reason,
      ip: '10.0.1.10',
    };

    onUpdate(updated, history);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Box marginBottom={3}>
      <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 12 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Box marginBottom={1}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="body2">{value || '-'}</Typography>
    </Box>
  );

  return (
    <Paper variant="outlined" style={{ padding: 24, height: '100%' }}>
      <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 16 }}>
        등록 신청 상세
      </Typography>

      <Section title="기본 정보">
        <Grid container spacing={2}>
          <Grid item xs={6}><Field label="이름" value={registration.name} /></Grid>
          <Grid item xs={6}><Field label="이메일" value={registration.email} /></Grid>
          <Grid item xs={6}><Field label="연락처" value={registration.phone} /></Grid>
          <Grid item xs={6}><Field label="소속기관" value={registration.organization} /></Grid>
          <Grid item xs={6}><Field label="부서" value={registration.department} /></Grid>
          <Grid item xs={6}><Field label="직급/직책" value={registration.position} /></Grid>
          <Grid item xs={6}><Field label="사용자 유형" value={registration.userType} /></Grid>
        </Grid>
      </Section>

      <Divider style={{ marginBottom: 16 }} />

      <Section title="본인확인 정보">
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Field label="본인확인 상태" value={<UserIdentityVerificationChip status={registration.identityStatus} />} />
          </Grid>
          <Grid item xs={6}><Field label="본인확인 방식" value={registration.identityMethod} /></Grid>
          <Grid item xs={6}><Field label="본인확인 일시" value={registration.identityVerifiedAt} /></Grid>
          <Grid item xs={6}><Field label="본인확인 결과" value={registration.identityResult} /></Grid>
          <Grid item xs={6}><Field label="확인자" value={registration.verifier} /></Grid>
        </Grid>
      </Section>

      <Divider style={{ marginBottom: 16 }} />

      <Section title="신청 정보">
        <Grid container spacing={2}>
          <Grid item xs={12}><Field label="신청 사유" value={registration.reason} /></Grid>
          <Grid item xs={12}><Field label="업무 목적" value={registration.businessPurpose} /></Grid>
          <Grid item xs={6}><Field label="요청 역할" value={registration.requestedRole} /></Grid>
          <Grid item xs={6}><Field label="요청 서비스" value={registration.requestedServices?.join(', ')} /></Grid>
          <Grid item xs={6}><Field label="접속 희망 시작일" value={registration.accessStartDate} /></Grid>
          <Grid item xs={6}><Field label="접속 희망 종료일" value={registration.accessEndDate} /></Grid>
          <Grid item xs={6}><Field label="신청일" value={registration.appliedAt} /></Grid>
          <Grid item xs={6}><Field label="승인 상태" value={<UserApprovalStatusChip status={registration.status} />} /></Grid>
        </Grid>
      </Section>

      <Divider style={{ marginBottom: 16 }} />

      <Section title="보안 확인">
        <Grid container spacing={2}>
          <Grid item xs={4}><Field label="보안서약 제출" value={registration.securityOathSubmitted ? '예' : '아니오'} /></Grid>
          <Grid item xs={4}><Field label="개인정보 동의" value={registration.privacyAgreed ? '예' : '아니오'} /></Grid>
          <Grid item xs={4}><Field label="외부 사용자 보안 확인" value={registration.externalSecurityConfirmed ? '예' : '아니오'} /></Grid>
        </Grid>
      </Section>

      <Divider style={{ marginBottom: 16 }} />

      <Section title="승인 처리">
        <TextField
          label="검토 의견"
          variant="outlined"
          fullWidth
          size="small"
          multiline
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <UserApprovalWorkflow status={registration.status} onAction={handleAction} />
        <Box marginTop={2}>
          <Button size="small" variant="outlined" disabled>
            저장
          </Button>
        </Box>
      </Section>
    </Paper>
  );
};
