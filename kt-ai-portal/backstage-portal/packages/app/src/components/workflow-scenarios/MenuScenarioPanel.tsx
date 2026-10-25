import { FC } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Link as MuiLink,
} from '@material-ui/core';
import { Link } from 'react-router-dom';
import { menuRequirementCoverage } from '../requirement-coverage';
import { workflowScenarios } from './mockWorkflowScenarioData';

interface Props {
  menuId: string;
}

export const MenuScenarioPanel: FC<Props> = ({ menuId }) => {
  const coverage = menuRequirementCoverage.find(m => m.menuId === menuId);
  if (!coverage) return null;

  const scenarios = workflowScenarios.filter(s =>
    s.relatedMenus.includes(coverage.menuName),
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {coverage.menuName} — 업무흐름/연계 정보
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {coverage.rfpMappingReason}
        </Typography>
        <Box marginTop={1}>
          <Typography variant="subtitle2">관련 SFR</Typography>
          {coverage.relatedSfrIds.map(id => (
            <Chip key={id} size="small" label={id} style={{ margin: 2 }} />
          ))}
        </Box>
        <Box marginTop={1}>
          <Typography variant="subtitle2">포털 역할</Typography>
          <Typography variant="body2">{coverage.coverageSummary}</Typography>
        </Box>
        <Box marginTop={1}>
          <Typography variant="subtitle2">연계 플랫폼</Typography>
          {coverage.relatedPlatformRoles.map(role => (
            <Chip key={role} size="small" variant="outlined" label={role} style={{ margin: 2 }} />
          ))}
        </Box>
        {scenarios.length > 0 && (
          <Box marginTop={1}>
            <Typography variant="subtitle2">관련 업무흐름 시나리오</Typography>
            {scenarios.map(s => (
              <Chip
                key={s.id}
                size="small"
                color="primary"
                label={`${s.id} ${s.title}`}
                style={{ margin: 2 }}
                component={Link}
                to="/workflow-scenarios"
                clickable
              />
            ))}
          </Box>
        )}
        <Box marginTop={1}>
          <Typography variant="subtitle2">관련 API 후보</Typography>
          {scenarios.flatMap(s => s.relatedApiIds).filter((v, i, a) => a.indexOf(v) === i).map(id => (
            <Chip key={id} size="small" variant="outlined" label={id} style={{ margin: 2 }} />
          ))}
        </Box>
        {coverage.followUpItems.length > 0 && (
          <Box marginTop={1}>
            <Typography variant="subtitle2" color="error">
              후속개발 항목
            </Typography>
            <ul style={{ margin: 0 }}>
              {coverage.followUpItems.slice(0, 5).map(item => (
                <li key={item}>
                  <Typography variant="body2">{item}</Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}
        <Box marginTop={1}>
          <MuiLink component={Link} to="/requirement-coverage">
            요구사항 대응현황 보기
          </MuiLink>
          {' · '}
          <MuiLink component={Link} to="/workflow-scenarios">
            업무흐름/연계 시나리오 보기
          </MuiLink>
        </Box>
      </CardContent>
    </Card>
  );
};
