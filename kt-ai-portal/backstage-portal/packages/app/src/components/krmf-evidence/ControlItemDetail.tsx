import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { ControlItem, ControlArea } from './types';
import { ControlStatusChip } from './ControlStatusChip';

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

export const ControlItemDetail = ({ control }: { control: ControlItem }) => {
  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h5" gutterBottom>
        {control.name}
      </Typography>

      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">통제항목 ID</Typography>
          <Typography>{control.id}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">통제영역</Typography>
          <Typography>{areaLabels[control.area]}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">적용 여부</Typography>
          <Chip size="small" label={control.applied ? '적용' : '미적용'} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">점검 상태</Typography>
          <ControlStatusChip status={control.checkStatus} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">담당자</Typography>
          <Typography>
            {control.owner} ({control.ownerOrg})
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">중요도</Typography>
          <Typography>{control.importance}</Typography>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        설명
      </Typography>
      <Typography paragraph>{control.description}</Typography>

      <Typography variant="h6" gutterBottom>
        통제 목적
      </Typography>
      <Typography paragraph>{control.purpose}</Typography>

      <Typography variant="h6" gutterBottom>
        구현 현황
      </Typography>
      <Typography paragraph>{control.implementationStatus}</Typography>

      <Divider style={{ margin: '16px 0' }} />

      <Typography variant="h6" gutterBottom>
        적용 대상 시스템
      </Typography>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {control.targetSystems.map(sys => (
          <Chip key={sys} label={sys} size="small" />
        ))}
      </div>

      <Typography variant="h6" gutterBottom>
        관련 프로젝트
      </Typography>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {control.relatedProjects.map(proj => (
          <Chip key={proj} label={proj} size="small" />
        ))}
      </div>

      {control.relatedExportRequestIds && control.relatedExportRequestIds.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            관련 반출/반입 승인 이력
          </Typography>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {control.relatedExportRequestIds.map(id => (
              <Chip key={id} label={id} size="small" />
            ))}
          </div>
        </>
      )}

      <Typography variant="h6" gutterBottom>
        점검 이력
      </Typography>
      <List dense>
        {control.auditLog.map((log, index) => (
          <ListItem key={index}>
            <ListItemText primary={log} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
