import { FC } from 'react';
import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@material-ui/core';
import { requirementCoverageChangeHistories } from './mockRequirementCoverageData';

const impactColor = {
  '낮음': 'default',
  '중간': 'primary',
  '높음': 'secondary',
} as const;

const priorityColor = {
  '하': 'default',
  '중': 'primary',
  '상': 'secondary',
} as const;

export const ChangeHistoryCoveragePanel: FC = () => {
  return (
    <Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>변경ID</TableCell>
              <TableCell>영역</TableCell>
              <TableCell>관련 SFR</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>요약</TableCell>
              <TableCell>영향도</TableCell>
              <TableCell>우선순위</TableCell>
              <TableCell>영향 기능</TableCell>
              <TableCell>후속조치</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requirementCoverageChangeHistories.map(row => (
              <TableRow key={row.changeId}>
                <TableCell>{row.changeId}</TableCell>
                <TableCell>{row.area}</TableCell>
                <TableCell>{row.relatedSfr}</TableCell>
                <TableCell>{row.changeType}</TableCell>
                <TableCell>{row.summary}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={impactColor[row.impact]}
                    label={row.impact}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={priorityColor[row.priority]}
                    label={row.priority}
                  />
                </TableCell>
                <TableCell>{row.affectedFeatureNos}</TableCell>
                <TableCell>{row.followUpAction}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
