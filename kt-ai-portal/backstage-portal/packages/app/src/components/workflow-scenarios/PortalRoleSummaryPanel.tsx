import { FC } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@material-ui/core';
import { platformRoleSummaries } from './mockWorkflowScenarioData';

export const PortalRoleSummaryPanel: FC = () => {
  return (
    <Box>
      <Typography variant="body1" gutterBottom>
        <strong>포털</strong>은 데이터 수집·정제나 AI 모델 학습을 직접 수행하는 플랫폼이 아니라,
        사용자와 프로젝트를 중심으로 데이터 플랫폼, AI 플랫폼, 지능형 클라우드/CMP를 연결하는
        통합 진입점이자 업무 오케스트레이션 계층입니다.
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>플랫폼</TableCell>
              <TableCell>주요 역할</TableCell>
              <TableCell>경계/비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {platformRoleSummaries.map(row => (
              <TableRow key={row.platform}>
                <TableCell>
                  <strong>{row.platform}</strong>
                </TableCell>
                <TableCell>
                  {row.responsibilities.map(item => (
                    <Chip key={item} size="small" label={item} style={{ margin: 2 }} />
                  ))}
                </TableCell>
                <TableCell>{row.boundaryNote}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
