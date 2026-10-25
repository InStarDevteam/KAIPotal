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
import { requirementCoverageQuestions } from './mockRequirementCoverageData';

const priorityColor = {
  '하': 'default',
  '중': 'primary',
  '상': 'secondary',
} as const;

export const QuestionCoveragePanel: FC = () => {
  return (
    <Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>번호</TableCell>
              <TableCell>영역</TableCell>
              <TableCell>질의</TableCell>
              <TableCell>관련 SFR</TableCell>
              <TableCell>사유/근거</TableCell>
              <TableCell>우선순위</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requirementCoverageQuestions.map(row => (
              <TableRow key={row.no}>
                <TableCell>{row.no}</TableCell>
                <TableCell>{row.area}</TableCell>
                <TableCell>{row.question}</TableCell>
                <TableCell>{row.relatedSfr}</TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={priorityColor[row.priority]}
                    label={row.priority}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
