import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@material-ui/core';
import { RequirementChangeHistory } from './types';
import { RequirementImpactChip } from './RequirementImpactChip';
import { RequirementPriorityChip } from './RequirementPriorityChip';

export const RequirementChangeHistoryTable: React.FC<{
  changes: RequirementChangeHistory[];
}> = ({ changes }) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>변경ID</TableCell>
            <TableCell>관련 SFR</TableCell>
            <TableCell>영역</TableCell>
            <TableCell>변경요약</TableCell>
            <TableCell>영향도</TableCell>
            <TableCell>우선순위</TableCell>
            <TableCell>영향 기능번호</TableCell>
            <TableCell>후속 조치</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {changes.map(change => (
            <TableRow key={change.changeId}>
              <TableCell>{change.changeId}</TableCell>
              <TableCell>{change.relatedSfr}</TableCell>
              <TableCell>{change.area}</TableCell>
              <TableCell>{change.summary}</TableCell>
              <TableCell>
                <RequirementImpactChip impact={change.impact} />
              </TableCell>
              <TableCell>
                <RequirementPriorityChip priority={change.priority} />
              </TableCell>
              <TableCell>{change.affectedFeatureNos}</TableCell>
              <TableCell>{change.followUpAction}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
