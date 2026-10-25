import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { PortalFeatureRequirement } from './types';
import { REQUIREMENT_PROGRESS_SUMMARY } from './mockRequirementProgressData';

const summaryLabels: Record<string, string> = {
  totalSfr: '전체 SFR 수',
  totalFeature: '전체 기능 수',
  previousFeature: '기존 기능 수',
  newFeature: '신규 기능 수',
  changedSfr: '변경 SFR 수',
  completedUi: '화면 구현',
  partialUi: '부분 구현',
  followUp: '후속 개발',
  reviewNeeded: '검토 필요',
};

const SummaryCard = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <Card variant="outlined" style={{ height: '100%' }}>
    <CardContent>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="h5" style={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export const RequirementProgressSummaryCards: React.FC<{
  features: PortalFeatureRequirement[];
}> = ({ features }) => {
  const completedUi = features.filter(f => f.implementationStatus === '화면구현').length;
  const partialUi = features.filter(f => f.implementationStatus === '부분구현').length;
  const followUp = features.filter(
    f => f.implementationStatus === '후속개발' || f.implementationStatus === '미구현',
  ).length;
  const reviewNeeded = features.filter(f => f.implementationStatus === '검토필요').length;

  const items = [
    { key: 'totalSfr', value: 21 },
    { key: 'totalFeature', value: REQUIREMENT_PROGRESS_SUMMARY.latestTotalFeatures },
    { key: 'previousFeature', value: REQUIREMENT_PROGRESS_SUMMARY.previousTotalFeatures },
    { key: 'newFeature', value: REQUIREMENT_PROGRESS_SUMMARY.newFeaturesAdded },
    { key: 'changedSfr', value: REQUIREMENT_PROGRESS_SUMMARY.changedSfrCount },
    { key: 'completedUi', value: completedUi },
    { key: 'partialUi', value: partialUi },
    { key: 'followUp', value: followUp },
    { key: 'reviewNeeded', value: reviewNeeded },
  ];

  return (
    <Grid container spacing={2}>
      {items.map(item => (
        <Grid item xs={6} md={4} lg={3} key={item.key}>
          <SummaryCard label={summaryLabels[item.key]} value={item.value} />
        </Grid>
      ))}
    </Grid>
  );
};
