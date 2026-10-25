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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { menuRequirementCoverage } from './mockRequirementCoverageData';

export const MenuCoveragePanel = () => {
  const [filter, setFilter] = useState('');
  const rows = menuRequirementCoverage.filter(
    m =>
      m.menuName.toLowerCase().includes(filter.toLowerCase()) ||
      m.relatedSfrIds.some(s => s.toLowerCase().includes(filter.toLowerCase())),
  );

  return (
    <Box>
      <Box marginBottom={2}>
        <TextField
          label="메뉴 또는 SFR ID 검색"
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
              <TableCell>메뉴</TableCell>
              <TableCell>노출대상</TableCell>
              <TableCell>관련 SFR</TableCell>
              <TableCell>요약</TableCell>
              <TableCell>관련 플랫폼</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.menuId}>
                <TableCell>
                  <strong>{row.menuName}</strong>
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {row.route}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={row.visibleTo === 'admin' ? 'secondary' : 'primary'}
                    label={row.visibleTo === 'admin' ? '관리자' : '전체'}
                  />
                </TableCell>
                <TableCell>
                  {row.relatedSfrIds.map(id => (
                    <Chip key={id} size="small" label={id} style={{ margin: 2 }} />
                  ))}
                </TableCell>
                <TableCell>{row.coverageSummary}</TableCell>
                <TableCell>
                  {row.relatedPlatformRoles.map(role => (
                    <Chip key={role} size="small" variant="outlined" label={role} style={{ margin: 2 }} />
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box marginTop={2}>
        {rows.map(row => (
          <Accordion key={row.menuId} defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {row.menuName} — {row.coverageSummary}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box width="100%">
                <Typography variant="body2" gutterBottom>
                  <strong>대응 근거:</strong> {row.rfpMappingReason}
                </Typography>
                {row.implementedItems.length > 0 && (
                  <Box marginTop={1}>
                    <Typography variant="subtitle2" color="primary">
                      화면구현
                    </Typography>
                    <ul style={{ margin: 0 }}>
                      {row.implementedItems.map(item => (
                        <li key={item}>
                          <Typography variant="body2">{item}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
                {row.partialItems.length > 0 && (
                  <Box marginTop={1}>
                    <Typography variant="subtitle2" color="textSecondary">
                      부분구현
                    </Typography>
                    <ul style={{ margin: 0 }}>
                      {row.partialItems.map(item => (
                        <li key={item}>
                          <Typography variant="body2">{item}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
                {row.followUpItems.length > 0 && (
                  <Box marginTop={1}>
                    <Typography variant="subtitle2" color="error">
                      후속/미구현
                    </Typography>
                    <ul style={{ margin: 0 }}>
                      {row.followUpItems.map(item => (
                        <li key={item}>
                          <Typography variant="body2">{item}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};
