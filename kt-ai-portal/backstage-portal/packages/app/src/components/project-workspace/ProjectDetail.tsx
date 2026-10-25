import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import { Project } from './types';
import { ProjectStatusChip } from './ProjectStatusChip';
import { ResourceQuotaCard } from './ResourceQuotaCard';
import { WorkspaceLifecyclePanel } from './WorkspaceLifecyclePanel';

const roleLabel: Record<string, string> = {
  PM: 'PM',
  Developer: '개발자',
  Analyst: '분석가',
  DataManager: '데이터 관리자',
  SecurityReviewer: '보안 검토자',
  ExternalUser: '외부 사용자',
};

const renderChips = (items: string[], emptyText: string) => {
  if (items.length === 0) {
    return <Typography color="textSecondary">{emptyText}</Typography>;
  }
  return (
    <div
      style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}
    >
      {items.map(item => (
        <Chip key={item} label={item} size="small" />
      ))}
    </div>
  );
};

export const ProjectDetail = ({ project }: { project: Project }) => {
  return (
    <Paper style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Typography variant="h5" gutterBottom>
          {project.name}
        </Typography>
      </div>

      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">프로젝트 ID</Typography>
          <Typography>{project.id}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">상태</Typography>
          <ProjectStatusChip status={project.status} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">요청 유형</Typography>
          <Typography>{project.requestType ?? '일반 프로젝트'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">보안등급</Typography>
          <Typography>{project.securityLevel}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">소속기관</Typography>
          <Typography>{project.ownerOrganization}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">PM</Typography>
          <Typography>
            {project.pm.name} ({project.pm.userId})
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">기간</Typography>
          <Typography>
            {project.startDate} ~ {project.endDate}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography color="textSecondary">워크스페이스 상태</Typography>
          <Chip size="small" label={project.workspaceStatus} />
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        설명
      </Typography>
      <Typography paragraph>{project.description}</Typography>

      <Typography variant="h6" gutterBottom>
        이용목적
      </Typography>
      <Typography paragraph>{project.purpose}</Typography>

      {project.utilizationPurpose && (
        <>
          <Typography variant="h6" gutterBottom>
            활용목적/과제
          </Typography>
          <Typography paragraph>{project.utilizationPurpose}</Typography>
        </>
      )}

      {project.qualityVerificationPlan && (
        <>
          <Typography variant="h6" gutterBottom>
            품질검증계획
          </Typography>
          <Typography paragraph>{project.qualityVerificationPlan}</Typography>
        </>
      )}

      {project.participatingOrganizations &&
        project.participatingOrganizations.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              참여조직 정보
            </Typography>
            {renderChips(
              project.participatingOrganizations,
              '등록된 참여조직이 없습니다.',
            )}
          </>
        )}

      {project.selectedDataset && (
        <>
          <Typography variant="h6" gutterBottom>
            활용 데이터셋 선택
          </Typography>
          <Typography paragraph>{project.selectedDataset}</Typography>
        </>
      )}

      {project.selectedModel && (
        <>
          <Typography variant="h6" gutterBottom>
            활용 모델 선택
          </Typography>
          <Typography paragraph>{project.selectedModel}</Typography>
        </>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            참여자
          </Typography>
          <List dense>
            {project.members.map(member => (
              <ListItem key={member.userId}>
                <ListItemText
                  primary={`${member.name} (${member.userId})`}
                  secondary={`${member.organization} · ${
                    roleLabel[member.role] ?? member.role
                  }`}
                />
              </ListItem>
            ))}
          </List>
        </Grid>

        <Grid item xs={12} md={6}>
          <ResourceQuotaCard quota={project.quota} />
        </Grid>
      </Grid>

      {project.workspaceLifecycle && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <WorkspaceLifecyclePanel lifecycle={project.workspaceLifecycle} />
        </>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <Typography variant="h6" gutterBottom>
        사용가능 데이터셋
      </Typography>
      {renderChips(
        project.availableDatasets ?? project.datasets,
        '등록된 사용가능 데이터셋이 없습니다.',
      )}

      <Typography variant="h6" gutterBottom>
        사용가능 모델
      </Typography>
      {renderChips(
        project.availableModels ?? project.models,
        '등록된 사용가능 모델이 없습니다.',
      )}

      <Typography variant="h6" gutterBottom>
        사용 데이터셋
      </Typography>
      {renderChips(project.datasets, '등록된 데이터셋이 없습니다.')}

      <Typography variant="h6" gutterBottom>
        사용 AI 모델
      </Typography>
      {renderChips(project.models, '등록된 모델이 없습니다.')}

      {(project.serviceCatalogSelection || project.customServiceInput) && (
        <>
          <Typography variant="h6" gutterBottom>
            서비스 카탈로그 선택/직접 입력
          </Typography>
          {project.serviceCatalogSelection && (
            <Typography paragraph>{project.serviceCatalogSelection}</Typography>
          )}
          {project.customServiceInput && (
            <Typography paragraph>
              직접 입력: {project.customServiceInput}
            </Typography>
          )}
        </>
      )}

      {project.frameworks && project.frameworks.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            머신러닝/분석 프레임워크/라이브러리
          </Typography>
          {renderChips(
            project.frameworks,
            '등록된 프레임워크/라이브러리가 없습니다.',
          )}
        </>
      )}

      {project.labelingTools && project.labelingTools.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            라벨링 툴
          </Typography>
          {renderChips(project.labelingTools, '등록된 라벨링 툴이 없습니다.')}
        </>
      )}

      {project.visualizationTools && project.visualizationTools.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            시각화 도구
          </Typography>
          {renderChips(
            project.visualizationTools,
            '등록된 시각화 도구가 없습니다.',
          )}
        </>
      )}

      {project.trainingDataTools && project.trainingDataTools.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            학습데이터 구축 도구
          </Typography>
          {renderChips(
            project.trainingDataTools,
            '등록된 학습데이터 구축 도구가 없습니다.',
          )}
        </>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <Typography variant="h6" gutterBottom>
        활동 로그
      </Typography>
      <List dense>
        {project.activityLog.map((log, index) => (
          <ListItem key={index}>
            <ListItemText primary={log} />
          </ListItem>
        ))}
      </List>

      <Typography variant="h6" gutterBottom>
        신청/승인/상태조회 이력
      </Typography>
      <List dense>
        {project.approvalHistory.map((history, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={`${history.action.toUpperCase()} - ${history.actor}`}
              secondary={`${history.comment} (${new Date(
                history.timestamp,
              ).toLocaleString()})`}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
