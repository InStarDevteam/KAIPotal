import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import { Link } from 'react-router-dom';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import { SectionCard, colors } from '../common';
import { CreditSummary } from './types';

interface CreditSummaryPanelProps {
  summary: CreditSummary;
}

export const CreditSummaryPanel = ({ summary }: CreditSummaryPanelProps) => {
  return (
    <SectionCard
      title={
        <Box component="span" display="flex" justifyContent="space-between" alignItems="center">
          크레딧 요약
          <Button
            variant="outlined"
            color="primary"
            size="small"
            component={Link}
            to="/credit-manager"
            startIcon={<AccountBalanceIcon />}
          >
            상세 보기
          </Button>
        </Box>
      }
    >
      <Box display="flex" justifyContent="space-around" marginBottom={2}>
        <Box textAlign="center">
          <Typography variant="h5" style={{ fontWeight: 600 }}>
            {summary.totalRemaining.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            잔여 크레딧
          </Typography>
        </Box>
        <Box textAlign="center">
          <Typography variant="h5" style={{ fontWeight: 600 }}>
            {summary.monthlyEstimate.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            월 예상 사용
          </Typography>
        </Box>
      </Box>
      <Box display="flex" justifyContent="space-between" marginBottom={2}>
        <Typography variant="body2" color="textSecondary">
          부족 프로젝트
        </Typography>
        <Typography variant="body2" style={{ fontWeight: 600, color: colors.error.text }}>
          {summary.shortageProjects}개
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" marginBottom={2}>
        <Typography variant="body2" color="textSecondary">
          GPU 제한 프로젝트
        </Typography>
        <Typography variant="body2" style={{ fontWeight: 600, color: colors.warning.text }}>
          {summary.gpuLimitedProjects}개
        </Typography>
      </Box>
      {summary.warnings.length > 0 && (
        <Box style={{ backgroundColor: colors.error.bg, borderRadius: 4, padding: 12 }}>
          <Typography variant="subtitle2" style={{ color: colors.error.text, marginBottom: 8 }}>
            주의 사항
          </Typography>
          {summary.warnings.map(warning => (
            <Typography key={warning.id} variant="body2" style={{ color: colors.error.text }}>
              · {warning.projectName}: {warning.message}
            </Typography>
          ))}
        </Box>
      )}
    </SectionCard>
  );
};
