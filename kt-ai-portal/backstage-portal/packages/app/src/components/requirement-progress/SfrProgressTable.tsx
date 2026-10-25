import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Box,
  Typography,
} from '@material-ui/core';
import { SfrRequirementSummary } from './types';
import { RequirementImpactChip } from './RequirementImpactChip';
import { RequirementPriorityChip } from './RequirementPriorityChip';

const computeProgress = (sfr: SfrRequirementSummary): number => {
  const total = sfr.totalFeatureCount || 1;
  return Math.round(
    ((sfr.completedUiCount + sfr.partialUiCount * 0.5) / total) * 100,
  );
};

export const SfrProgressTable: React.FC<{
  summaries: SfrRequirementSummary[];
}> = ({ summaries }) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>SFR ID</TableCell>
            <TableCell>요구사항명</TableCell>
            <TableCell>영역</TableCell>
            <TableCell>변경유형</TableCell>
            <TableCell>영향도</TableCell>
            <TableCell>우선순위</TableCell>
            <TableCell align="right">전체 기능</TableCell>
            <TableCell align="right">화면 구현</TableCell>
            <TableCell align="right">부분 구현</TableCell>
            <TableCell align="right">후속 개발</TableCell>
            <TableCell>진척률</TableCell>
            <TableCell>권고사항</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summaries.map(sfr => {
            const progress = computeProgress(sfr);
            return (
              <TableRow key={sfr.sfrId}>
                <TableCell>{sfr.sfrId}</TableCell>
                <TableCell>{sfr.title}</TableCell>
                <TableCell>{sfr.area}</TableCell>
                <TableCell>{sfr.changeType}</TableCell>
                <TableCell>
                  <RequirementImpactChip impact={sfr.impact} />
                </TableCell>
                <TableCell>
                  <RequirementPriorityChip priority={sfr.priority} />
                </TableCell>
                <TableCell align="right">{sfr.totalFeatureCount}</TableCell>
                <TableCell align="right">{sfr.completedUiCount}</TableCell>
                <TableCell align="right">{sfr.partialUiCount}</TableCell>
                <TableCell align="right">{sfr.followUpCount}</TableCell>
                <TableCell style={{ minWidth: 120 }}>
                  <Box display="flex" alignItems="center">
                    <Box flexGrow={1} mr={1}>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        style={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Typography variant="caption">{progress}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>{sfr.recommendation}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
