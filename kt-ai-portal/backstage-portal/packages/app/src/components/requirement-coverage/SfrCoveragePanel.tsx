import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  LinearProgress,
} from '@material-ui/core';
import { sfrCoverageDetails, featureCoverageDetails } from './mockRequirementCoverageData';

export const SfrCoveragePanel = () => {
  const [filter, setFilter] = useState('');
  const rows = sfrCoverageDetails.filter(
    s =>
      s.sfrId.toLowerCase().includes(filter.toLowerCase()) ||
      s.title.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <Box>
      <Box marginBottom={2}>
        <TextField
          label="SFR ID 또는 제목 검색"
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
              <TableCell>SFR</TableCell>
              <TableCell>진행률</TableCell>
              <TableCell>관련 메뉴</TableCell>
              <TableCell>대응 근거</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => {
              const relatedFeatures = featureCoverageDetails.filter(f =>
                f.sfrId.split(',').map(s => s.trim()).includes(row.sfrId),
              );
              const completed = relatedFeatures.filter(
                f => f.implementationStatus === '화면구현',
              ).length;
              const progress = relatedFeatures.length > 0 ? (completed / relatedFeatures.length) * 100 : 0;
              return (
                <TableRow key={row.sfrId}>
                  <TableCell>
                    <strong>{row.sfrId}</strong>
                    <br />
                    <Typography variant="caption">{row.title}</Typography>
                  </TableCell>
                  <TableCell>
                    <LinearProgress variant="determinate" value={progress} />
                    <Typography variant="caption">
                      {completed}/{relatedFeatures.length} ({Math.round(progress)}%)
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {row.relatedMenuNames.map(name => (
                      <Chip key={name} size="small" label={name} style={{ margin: 2 }} />
                    ))}
                  </TableCell>
                  <TableCell>{row.rfpMappingReason}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
