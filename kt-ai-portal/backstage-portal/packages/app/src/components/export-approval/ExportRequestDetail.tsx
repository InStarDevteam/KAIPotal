import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { ExportRequest } from './types';
import { ExportStatusChip } from './ExportStatusChip';
import { ExportTargetTypeChip } from './ExportTargetTypeChip';
import { SecurityLevelChip } from './SecurityLevelChip';
import { AuditLogPanel } from './AuditLogPanel';

const directionLabel: Record<string, string> = {
  export: '반출',
  import: '반입',
};

const visibilityLabel: Record<string, string> = {
  public: '공개',
  private: '비공개',
  restricted: '제한공개',
};

const accessScopeLabel: Record<string, string> = {
  all_users: '전체 사용자',
  project_members: '프로젝트 참여자',
  approved_users: '승인 사용자',
  admins_only: '관리자 전용',
};

export const ExportRequestDetail = ({ request }: { request: ExportRequest }) => {
  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h5" gutterBottom>
        {request.targetName}
      </Typography>

      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">신청 ID</Typography>
          <Typography>{request.id}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">반출/반입</Typography>
          <Typography>{directionLabel[request.direction]}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">대상 유형</Typography>
          <ExportTargetTypeChip targetType={request.targetType} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">상태</Typography>
          <ExportStatusChip
            status={request.status}
            demoPending={request.demoPending}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">관련 프로젝트</Typography>
          <Typography>{request.projectName}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">신청자</Typography>
          <Typography>
            {request.requester} ({request.requesterOrg})
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">보안등급</Typography>
          <SecurityLevelChip level={request.securityLevel} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">공개 여부</Typography>
          <Typography>{visibilityLabel[request.visibility]}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">사용권한</Typography>
          <Typography>{accessScopeLabel[request.accessScope]}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">다운로드 가능</Typography>
          <Chip size="small" label={request.downloadable ? '가능' : '불가'} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">신청일</Typography>
          <Typography>{new Date(request.requestedAt).toLocaleString()}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">승인자 / 승인일</Typography>
          <Typography>
            {request.approver
              ? `${request.approver} / ${request.approvedAt ? new Date(request.approvedAt).toLocaleString() : '-'}`
              : '-'}
          </Typography>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        신청 사유
      </Typography>
      <Typography paragraph>{request.reason}</Typography>

      <Typography variant="h6" gutterBottom>
        대상 설명
      </Typography>
      <Typography paragraph>{request.targetDescription}</Typography>

      {request.revisionNote && (
        <>
          <Typography variant="h6" gutterBottom>
            보완요청 내용
          </Typography>
          <Typography paragraph color="error">
            {request.revisionNote}
          </Typography>
        </>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <Typography variant="h6" gutterBottom>
        첨부자료
      </Typography>
      {request.attachments.length === 0 ? (
        <Typography color="textSecondary">첨부자료가 없습니다.</Typography>
      ) : (
        <List dense>
          {request.attachments.map(file => (
            <ListItem key={file}>
              <ListItemText primary={file} />
            </ListItem>
          ))}
        </List>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <AuditLogPanel logs={request.auditLog} />
    </Paper>
  );
};
