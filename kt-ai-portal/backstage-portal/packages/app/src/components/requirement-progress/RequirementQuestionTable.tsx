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
import { RequirementQuestion } from './types';
import { RequirementPriorityChip } from './RequirementPriorityChip';

export const RequirementQuestionTable: React.FC<{
  questions: RequirementQuestion[];
}> = ({ questions }) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>No</TableCell>
            <TableCell>영역</TableCell>
            <TableCell>관련 SFR</TableCell>
            <TableCell>질의사항</TableCell>
            <TableCell>질의 사유</TableCell>
            <TableCell>우선순위</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {questions.map(question => (
            <TableRow key={question.no}>
              <TableCell>{question.no}</TableCell>
              <TableCell>{question.area}</TableCell>
              <TableCell>{question.relatedSfr}</TableCell>
              <TableCell>{question.question}</TableCell>
              <TableCell>{question.reason}</TableCell>
              <TableCell>
                <RequirementPriorityChip priority={question.priority} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
