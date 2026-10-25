import { FC } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
} from '@material-ui/core';
import { userJourneys } from './mockWorkflowScenarioData';

export const UserJourneyCards: FC = () => {
  return (
    <Box display="flex" flexWrap="wrap" style={{ gap: 16 }}>
      {userJourneys.map(journey => (
        <Box key={journey.role} flex="1 1 320px" minWidth={280}>
          <Card style={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {journey.role}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                <strong>목표:</strong> {journey.goal}
              </Typography>
              <Box marginTop={1}>
                <Typography variant="subtitle2">사용 메뉴</Typography>
                {journey.menus.map(menu => (
                  <Chip key={menu} size="small" label={menu} style={{ margin: 2 }} />
                ))}
              </Box>
              <Box marginTop={1}>
                <Typography variant="subtitle2">연계 플랫폼</Typography>
                {journey.platforms.map(platform => (
                  <Chip key={platform} size="small" variant="outlined" label={platform} style={{ margin: 2 }} />
                ))}
              </Box>
              <Box marginTop={1}>
                <Typography variant="subtitle2">주요 산출물</Typography>
                {journey.outputs.map(output => (
                  <Chip key={output} size="small" color="primary" label={output} style={{ margin: 2 }} />
                ))}
              </Box>
              <Box marginTop={1}>
                <Typography variant="subtitle2">관련 SFR</Typography>
                {journey.relatedSfrIds.map(id => (
                  <Chip key={id} size="small" variant="outlined" label={id} style={{ margin: 2 }} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  );
};
