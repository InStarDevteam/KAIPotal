import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import LinearProgress from '@material-ui/core/LinearProgress';
import Box from '@material-ui/core/Box';
import { Link } from 'react-router-dom';
import WorkIcon from '@material-ui/icons/Work';
import { SectionCard, StatusChip } from '../common';
import type { StatusTone } from '../common';
import { MyProject, ProjectStatus } from './types';

interface MyProjectPanelProps {
  projects: MyProject[];
}

const statusConfig: Record<ProjectStatus, { label: string; tone: StatusTone }> = {
  requested: { label: '신청', tone: 'neutral' },
  pending_approval: { label: '승인대기', tone: 'warning' },
  approved: { label: '승인', tone: 'info' },
  running: { label: '운영중', tone: 'success' },
  paused: { label: '일시중지', tone: 'warning' },
  closed: { label: '종료', tone: 'neutral' },
};

export const MyProjectPanel = ({ projects }: MyProjectPanelProps) => {
  return (
    <SectionCard
      title={
        <Box component="span" display="flex" justifyContent="space-between" alignItems="center">
          내 프로젝트
          <Button
            variant="outlined"
            color="primary"
            size="small"
            component={Link}
            to="/project-workspace"
            startIcon={<WorkIcon />}
          >
            전체 보기
          </Button>
        </Box>
      }
    >
      {projects.map(project => {
        const status = statusConfig[project.status];
        return (
          <Box key={project.id} paddingY={1.5} borderBottom="1px solid #f3f4f6">
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
              <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                {project.name}
              </Typography>
              <StatusChip tone={status.tone} label={status.label} />
            </Box>
            <Box display="flex" justifyContent="space-between" marginBottom={1}>
              <Typography variant="body2" color="textSecondary">
                PM: {project.pm}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                종료: {project.endDate}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Box flex={1} marginRight={1}>
                <LinearProgress variant="determinate" value={project.resourceUsage} />
              </Box>
              <Typography variant="caption" color="textSecondary">
                {project.resourceUsage}%
              </Typography>
            </Box>
          </Box>
        );
      })}
    </SectionCard>
  );
};
