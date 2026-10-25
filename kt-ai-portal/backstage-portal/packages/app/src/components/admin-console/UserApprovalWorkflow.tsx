import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { RegistrationStatus } from './types';

interface UserApprovalWorkflowProps {
  status: RegistrationStatus;
  onAction: (action: 'review' | 'approve' | 'reject' | 'requestSupplement' | 'resubmit') => void;
}

export const UserApprovalWorkflow = ({ status, onAction }: UserApprovalWorkflowProps) => {
  return (
    <Box marginTop={2}>
      <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: 8 }}>
        승인 workflow
      </Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
        신청 → 본인확인완료 → 검토중 → 승인
        <br />
        검토중 → 반려 / 보완요청 → 재신청 → 검토중
      </Typography>
      <Box display="flex" flexWrap="wrap">
        <Button
          size="small"
          variant="outlined"
          color="primary"
          disabled={status !== '신청' && status !== '본인확인완료'}
          onClick={() => onAction('review')}
          style={{ marginRight: 8, marginBottom: 8 }}
        >
          검토 시작
        </Button>
        <Button
          size="small"
          variant="contained"
          color="primary"
          disabled={status !== '검토중'}
          onClick={() => onAction('approve')}
          style={{ marginRight: 8, marginBottom: 8 }}
        >
          승인
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="secondary"
          disabled={status !== '검토중'}
          onClick={() => onAction('reject')}
          style={{ marginRight: 8, marginBottom: 8 }}
        >
          반려
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={status !== '검토중'}
          onClick={() => onAction('requestSupplement')}
          style={{ marginRight: 8, marginBottom: 8 }}
        >
          보완요청
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={status !== '보완요청'}
          onClick={() => onAction('resubmit')}
          style={{ marginRight: 8, marginBottom: 8 }}
        >
          재신청 접수
        </Button>
      </Box>
    </Box>
  );
};
