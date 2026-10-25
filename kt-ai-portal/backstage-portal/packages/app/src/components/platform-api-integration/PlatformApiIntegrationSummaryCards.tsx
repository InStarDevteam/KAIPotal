import { FC } from 'react';
import { Box, Card, CardContent, Typography } from '@material-ui/core';
import { platformApiIntegrationSummary } from './mockPlatformApiIntegrationData';

export const PlatformApiIntegrationSummaryCards: FC = () => {
  const { total, byStatus } = platformApiIntegrationSummary;
  const cards = [
    { label: '전체 API/연계', value: total },
    { label: '화면 구현', value: byStatus['화면 구현'] },
    { label: '연계 설계', value: byStatus['연계 설계'] },
    { label: '후속 API 연동', value: byStatus['후속 API 연동'] },
    { label: '타 플랫폼 제공 전제', value: byStatus['타 플랫폼 제공 전제'] },
    { label: '확인 필요', value: byStatus['확인 필요'] },
  ];

  return (
    <Box display="flex" flexWrap="wrap" marginY={2} style={{ gap: 16 }}>
      {cards.map(card => (
        <Box key={card.label} flex="1 1 140px" minWidth={120}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {card.label}
              </Typography>
              <Typography variant="h4">{card.value}</Typography>
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  );
};
