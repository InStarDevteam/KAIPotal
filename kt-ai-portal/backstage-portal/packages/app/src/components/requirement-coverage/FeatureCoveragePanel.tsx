import { useState } from 'react';
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
  TextField,
} from '@material-ui/core';
import { featureCoverageDetails } from './mockRequirementCoverageData';
import { RequirementImplementationStatus } from '../requirement-progress/types';

const statusColor: Record<RequirementImplementationStatus, 'default' | 'primary' | 'secondary'> = {
  화면구현: 'primary',
  부분구현: 'secondary',
  후속개발: 'default',
  미구현: 'default',
  검토필요: 'default',
};

export const FeatureCoveragePanel = () => {
  const [filter, setFilter] = useState('');
  const rows = featureCoverageDetails.filter(
    f =>
      f.detailFunction.toLowerCase().includes(filter.toLowerCase()) ||
      f.sfrId.toLowerCase().includes(filter.toLowerCase()) ||
      f.relatedMenuName.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <Box>
      <Box marginBottom={2}>
        <TextField
          label="기능, SFR, 메뉴 검색"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          fullWidth
          variant="outlined"
        />
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>번호</TableCell>
              <TableCell>대분류</TableCell>
              <TableCell>세부기능</TableCell>
              <TableCell>구현상태</TableCell>
              <TableCell>관련 메뉴</TableCell>
              <TableCell>플랫폼 연계</TableCell>
              <TableCell>후속조치</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.no}>
                <TableCell>{row.no}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.detailFunction}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={statusColor[row.implementationStatus]}
                    label={row.implementationStatus}
                  />
                </TableCell>
                <TableCell>{row.relatedMenuName}</TableCell>
                <TableCell>
                  {row.apiIntegrationRequired ? (
                    <>
                      {row.relatedPlatformRoles.map(role => (
                        <Chip key={role} size="small" variant="outlined" label={role} style={{ margin: 2 }} />
                      ))}
                    </>
                  ) : (
                    <Chip size="small" label="포털 자체" />
                  )}
                </TableCell>
                <TableCell>{row.followUpAction}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
