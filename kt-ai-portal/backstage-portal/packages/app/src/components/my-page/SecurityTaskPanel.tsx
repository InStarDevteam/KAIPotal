import { useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { useAuthz } from '../authz';
import { KrmfEvidenceAssignment } from './types';

interface SecurityTaskPanelProps {
  assignments: KrmfEvidenceAssignment[];
}

const statusColor = (status: KrmfEvidenceAssignment['status']) => {
  if (status === '반려') return 'secondary';
  if (status === '기한임박') return 'primary';
  return 'default';
};

export const SecurityTaskPanel = ({ assignments }: SecurityTaskPanelProps) => {
  const { hasPermission } = useAuthz();
  const canSubmit = hasPermission('krmf.evidence.submit');
  const canViewKrmf = hasPermission('krmf.view');

  const [items, setItems] = useState(assignments);
  const [confirmTarget, setConfirmTarget] = useState<KrmfEvidenceAssignment | undefined>();

  const handleSubmitConfirm = () => {
    if (!confirmTarget) return;
    setItems(prev =>
      prev.map(item =>
        item.id === confirmTarget.id
          ? { ...item, status: '제출예정' as const, rejectReason: undefined }
          : item,
      ),
    );
    setConfirmTarget(undefined);
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom={1}>
        <Typography variant="h6" style={{ fontWeight: 600 }}>
          보안 과제 (K-RMF 증적 제출)
        </Typography>
        {canViewKrmf && (
          <Button size="small" component={Link} to="/krmf-monitor">
            전체 K-RMF 관리 화면
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        본인에게 배정된 K-RMF 증적 제출 과제만 표시됩니다.
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>통제항목</TableCell>
              <TableCell>증적명</TableCell>
              <TableCell>기한</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>비고</TableCell>
              <TableCell>조치</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.controlId} {item.controlName}
                </TableCell>
                <TableCell>{item.evidenceName}</TableCell>
                <TableCell>{item.dueDate}</TableCell>
                <TableCell>
                  <Chip size="small" color={statusColor(item.status)} label={item.status} />
                </TableCell>
                <TableCell>
                  {item.rejectReason ? (
                    <Typography variant="body2" color="error">
                      {item.rejectReason}
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {canSubmit ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => setConfirmTarget(item)}
                    >
                      제출
                    </Button>
                  ) : (
                    <Button size="small" variant="outlined" disabled>
                      제출 권한 필요
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(confirmTarget)} onClose={() => setConfirmTarget(undefined)}>
        <DialogTitle>증적 제출 확인</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmTarget
              ? `'${confirmTarget.controlId} ${confirmTarget.controlName}' 통제항목의 '${confirmTarget.evidenceName}' 증적을 제출하시겠습니까?`
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTarget(undefined)}>취소</Button>
          <Button color="primary" variant="contained" onClick={handleSubmitConfirm}>
            제출
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
