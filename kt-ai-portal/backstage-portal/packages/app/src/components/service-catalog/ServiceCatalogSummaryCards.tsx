import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { ToolCategory, ToolStatus } from './types';

interface ServiceCatalogSummaryCardsProps {
  tools: { category: ToolCategory; status: ToolStatus }[];
}

export const ServiceCatalogSummaryCards = ({
  tools,
}: ServiceCatalogSummaryCardsProps) => {
  const total = tools.length;
  const categoryCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};

  tools.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  const items = [
    { label: '전체 도구', value: total },
    { label: '분석 프레임워크', value: categoryCounts['분석 프레임워크'] || 0 },
    { label: '개발도구', value: categoryCounts['개발도구'] || 0 },
    { label: '데이터 도구', value: categoryCounts['데이터 도구'] || 0 },
    { label: '시각화 도구', value: categoryCounts['시각화 도구'] || 0 },
    { label: '라벨링 도구', value: categoryCounts['라벨링 도구'] || 0 },
    { label: '사용 가능', value: statusCounts['사용가능'] || 0 },
    { label: '신청 필요', value: statusCounts['신청필요'] || 0 },
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
