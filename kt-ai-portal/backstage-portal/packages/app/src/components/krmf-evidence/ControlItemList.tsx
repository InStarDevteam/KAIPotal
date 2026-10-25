import { useState } from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Chip from '@material-ui/core/Chip';
import Typography from '@material-ui/core/Typography';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import { ControlItem, ControlArea } from './types';
import { ControlStatusChip } from './ControlStatusChip';
import { GatedButton, PermissionHint } from './KrmfPermissionGate';

const areaLabels: Record<ControlArea, string> = {
  access_control: '접근통제',
  account_management: '계정관리',
  log_management: '로그관리',
  encryption: '암호화',
  network_security: '네트워크 보안',
  vulnerability_management: '취약점 관리',
  data_protection: '데이터 보호',
  backup_recovery: '백업/복구',
  change_management: '변경관리',
  security_audit: '보안감사',
  security_requirement_plan: '보안요구사항 이행계획',
  krmf_standard: 'K-RMF 적용기준 관리',
  control_implementation: '보안통제항목 이행관리',
  security_plan: '보안계획서',
  evidence_submission: '구현증적 제출',
  security_evaluation: '보안평가·후속조치·인가',
  operational_transition: '운영전환·모니터링 준비',
};

export const ControlItemList = ({
  controls,
  selectedId,
  onSelect,
}: {
  controls: ControlItem[];
  selectedId?: string;
  onSelect: (control: ControlItem) => void;
}) => {
  const [dialogAction, setDialogAction] = useState<string | null>(null);

  return (
    <Paper style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <GatedButton
          permission="krmf.manage"
          label="통제항목 수정"
          onClick={() => setDialogAction('통제항목 수정')}
        />
        <GatedButton
          permission="krmf.manage"
          label="통제항목 삭제"
          color="secondary"
          onClick={() => setDialogAction('통제항목 삭제')}
        />
        <PermissionHint
          permission="krmf.manage"
          action="통제항목 수정·삭제"
        />
      </div>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>통제영역</TableCell>
              <TableCell>통제항목명</TableCell>
              <TableCell>적용 여부</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>조직</TableCell>
              <TableCell>중요도</TableCell>
              <TableCell>점검 상태</TableCell>
              <TableCell>증빙</TableCell>
              <TableCell>미흡</TableCell>
              <TableCell>최종 점검일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {controls.map(control => (
              <TableRow
                key={control.id}
                hover
                selected={selectedId === control.id}
                onClick={() => onSelect(control)}
                style={{ cursor: 'pointer' }}
              >
                <TableCell>{control.id}</TableCell>
                <TableCell>{areaLabels[control.area]}</TableCell>
                <TableCell>{control.name}</TableCell>
                <TableCell>
                  <Chip size="small" label={control.applied ? '적용' : '미적용'} />
                </TableCell>
                <TableCell>{control.owner}</TableCell>
                <TableCell>{control.ownerOrg}</TableCell>
                <TableCell>{control.importance}</TableCell>
                <TableCell>
                  <ControlStatusChip status={control.checkStatus} />
                </TableCell>
                <TableCell>{control.evidenceCount}</TableCell>
                <TableCell>{control.issueCount}</TableCell>
                <TableCell>
                  {control.lastCheckedAt
                    ? new Date(control.lastCheckedAt).toLocaleDateString()
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogAction !== null} onClose={() => setDialogAction(null)}>
        <DialogTitle>{dialogAction}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            기준 데이터 환경에서는 실제 저장이 수행되지 않습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAction(null)} color="primary">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
