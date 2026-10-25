import { FC } from 'react';
import { Box, Card, CardContent, Typography } from '@material-ui/core';
import { menuRequirementCoverage } from './mockRequirementCoverageData';

export const RequirementCoverageSummaryCards: FC = () => {
  const totalMenus = menuRequirementCoverage.length;
  const adminMenus = menuRequirementCoverage.filter(m => m.visibleTo === 'admin').length;
  const allMenus = totalMenus - adminMenus;
  const implementedItems = menuRequirementCoverage.reduce(
    (sum, m) => sum + m.implementedItems.length,
    0,
  );
  const partialItems = menuRequirementCoverage.reduce(
    (sum, m) => sum + m.partialItems.length,
    0,
  );
  const followUpItems = menuRequirementCoverage.reduce(
    (sum, m) => sum + m.followUpItems.length,
    0,
  );

  const cards = [
    { label: '전체 메뉴', value: totalMenus, sub: `일반 ${allMenus} / 관리자 ${adminMenus}` },
    { label: '화면구현 항목', value: implementedItems },
    { label: '부분구현 항목', value: partialItems },
    { label: '후속/미구현 항목', value: followUpItems },
  ];

  return (
    <Box display="flex" flexWrap="wrap" marginY={2} style={{ gap: 16 }}>
      {cards.map(card => (
        <Box key={card.label} flex="1 1 200px" minWidth={180}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {card.label}
              </Typography>
              <Typography variant="h4">{card.value}</Typography>
              {card.sub && (
                <Typography variant="caption" color="textSecondary">
                  {card.sub}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  );
};
