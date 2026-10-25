import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import { Link } from 'react-router-dom';
import SwapHorizIcon from '@material-ui/icons/SwapHoriz';
import { SectionCard, StatusChip } from '../common';
import type { StatusTone } from '../common';
import { ExportPendingItem, ExportStatus, ExportTargetType } from './types';

interface ExportPendingPanelProps {
  items: ExportPendingItem[];
}

const statusConfig: Record<ExportStatus, { label: string; tone: StatusTone }> = {
  requested: { label: '신청', tone: 'neutral' },
  reviewing: { label: '검토중', tone: 'info' },
  need_revision: { label: '수정요청', tone: 'warning' },
  approved: { label: '승인', tone: 'success' },
  rejected: { label: '반려', tone: 'error' },
};

const typeLabel = (type: ExportTargetType): string => {
  const map: Record<ExportTargetType, string> = {
    server: '서버',
    ai_model: 'AI 모델',
    algorithm: '알고리즘',
    dataset: '데이터셋',
    document: '문서',
    docker_image: 'Docker 이미지',
    pypi_package: 'PyPI 패키지',
  };
  return map[type];
};

export const ExportPendingPanel = ({ items }: ExportPendingPanelProps) => {
  return (
    <SectionCard
      title={
        <Box component="span" display="flex" justifyContent="space-between" alignItems="center">
          반출/반입 대기 현황
          <Button
            variant="outlined"
            color="primary"
            size="small"
            component={Link}
            to="/export-approval"
            startIcon={<SwapHorizIcon />}
          >
            승인 관리
          </Button>
        </Box>
      }
    >
      {items.map(item => {
        const status = statusConfig[item.status];
        return (
          <Box key={item.id} paddingY={1.5} borderBottom="1px solid #f3f4f6">
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={0.5}>
              <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                {item.targetName}
              </Typography>
              <StatusChip tone={status.tone} label={status.label} />
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="textSecondary">
                유형: {typeLabel(item.targetType)} · 요청자: {item.requester}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {item.requestedAt}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </SectionCard>
  );
};
