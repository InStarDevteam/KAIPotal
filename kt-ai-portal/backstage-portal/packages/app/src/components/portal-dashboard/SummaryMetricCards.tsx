import { Grid, Typography } from '@material-ui/core';
import { MetricCard } from '../common';
import { SummaryMetrics, CreditSummary } from './types';

/** 집계 API 연결 전에는 fixture 수치를 실제 운영 지표로 표시하지 않는다. */
export const SummaryMetricCards = (_props: {
  metrics: SummaryMetrics;
  credit: CreditSummary;
}) => (
  <Grid container spacing={2}>
    {['내 프로젝트', '승인 대기', '사용 가능한 크레딧', '최근 등록 자산'].map(
      label => (
        <Grid item xs={6} md={3} key={label}>
          <MetricCard label={label} value="—" size="primary" />
          <Typography
            variant="caption"
            color="textSecondary"
            style={{ display: 'block', padding: '6px 4px 0' }}
          >
            업무 집계 연동 준비 중
          </Typography>
        </Grid>
      ),
    )}
  </Grid>
);
