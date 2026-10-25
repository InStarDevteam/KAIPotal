import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { Proposal } from './types';

interface ProposalSummaryCardsProps {
  proposals: Proposal[];
}

export const ProposalSummaryCards = ({ proposals }: ProposalSummaryCardsProps) => {
  const total = proposals.length;
  const categoryCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};

  proposals.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  const items = [
    { label: '전체 제안', value: total },
    { label: '검토 대기', value: statusCounts['등록'] || 0 },
    { label: '공지 승인', value: statusCounts['공지승인'] || 0 },
    { label: '진행 검토', value: statusCounts['진행검토'] || 0 },
    { label: '반려', value: statusCounts['반려'] || 0 },
    { label: 'AI 모델 제안', value: categoryCounts['AI 모델 개발'] || 0 },
    { label: '데이터셋 구축 제안', value: categoryCounts['데이터셋 구축'] || 0 },
    { label: '빅데이터 분석 제안', value: categoryCounts['빅데이터 분석 모델 개발'] || 0 },
  ];

  return (
    <Grid container spacing={2}>
      {items.map(item => (
        <Grid item xs={6} sm={4} md={3} key={item.label}>
          <Card variant="outlined">
            <CardContent style={{ padding: 12 }}>
              <Typography variant="caption" color="textSecondary">
                {item.label}
              </Typography>
              <Box marginTop={0.5}>
                <Typography variant="h5" style={{ fontWeight: 600 }}>
                  {item.value}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
