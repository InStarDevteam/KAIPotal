import { useState, useMemo } from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Chip from '@material-ui/core/Chip';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import {
  KrmfImplementationPlan,
  ControlItem,
  EvidenceType,
  ImplementationStatus,
  IMPLEMENTATION_PHASE_LABELS,
  IMPLEMENTATION_STATUS_LABELS,
} from './types';
import { GatedButton, PermissionHint } from './KrmfPermissionGate';

const evidenceTypeLabels: Record<EvidenceType, string> = {
  policy_document: '정책문서',
  config_capture: '설정캡처',
  log_file: '로그파일',
  scan_report: '스캔보고서',
  approval_history: '승인이력',
  training_material: '교육자료',
  architecture_doc: '아키텍처',
  operational_procedure: '운영절차',
};

const statusChipColor = (
  status: ImplementationStatus,
): 'primary' | 'secondary' | 'default' => {
  if (status === 'completed') return 'primary';
  if (status === 'delayed') return 'secondary';
  return 'default';
};

export const ImplementationPlanPanel = ({
  plans,
  controls,
}: {
  plans: KrmfImplementationPlan[];
  controls: ControlItem[];
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const controlMap = useMemo(() => {
    const map = new Map<string, ControlItem>();
    controls.forEach(c => map.set(c.id, c));
    return map;
  }, [controls]);

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h6" gutterBottom>
        보안통제 이행계획
      </Typography>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <GatedButton
          permission="krmf.manage"
          label="이행계획 편집"
          onClick={() => setDialogOpen(true)}
        />
        <PermissionHint permission="krmf.manage" action="이행계획 편집" />
      </div>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>통제항목</TableCell>
              <TableCell>단계</TableCell>
              <TableCell>담당조직</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>계획시작</TableCell>
              <TableCell>계획종료</TableCell>
              <TableCell>점검방법</TableCell>
              <TableCell>예상 증적유형</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map(plan => (
              <TableRow key={plan.id} hover>
                <TableCell>{plan.id}</TableCell>
                <TableCell>
                  {controlMap.get(plan.controlId)?.id ?? plan.controlId}
                </TableCell>
                <TableCell>{IMPLEMENTATION_PHASE_LABELS[plan.phase]}</TableCell>
                <TableCell>{plan.ownerOrg}</TableCell>
                <TableCell>{plan.ownerUser}</TableCell>
                <TableCell>{plan.plannedStart}</TableCell>
                <TableCell>{plan.plannedEnd}</TableCell>
                <TableCell>{plan.verificationMethod}</TableCell>
                <TableCell>
                  {plan.expectedEvidenceTypes
                    .map(t => evidenceTypeLabels[t])
                    .join(', ')}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={statusChipColor(plan.status)}
                    label={IMPLEMENTATION_STATUS_LABELS[plan.status]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>이행계획 편집</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            기준 데이터 환경에서는 실제 저장이 수행되지 않습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="primary">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
