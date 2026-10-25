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
import { platformApiIntegrations } from './mockPlatformApiIntegrationData';
import { ApiIntegrationStatus } from './types';

const statusColor: Record<
  ApiIntegrationStatus,
  'default' | 'primary' | 'secondary'
> = {
  '화면 구현': 'primary',
  '연계 설계': 'secondary',
  '후속 API 연동': 'default',
  '타 플랫폼 제공 전제': 'default',
  '확인 필요': 'secondary',
};

const ListSection = ({ title, items }: { title: string; items: string[] }) => (
  <Box marginTop={1}>
    <Typography variant="subtitle2">{title}</Typography>
    <ul style={{ margin: 0 }}>
      {items.map(item => (
        <li key={item}>
          <Typography variant="body2">{item}</Typography>
        </li>
      ))}
    </ul>
  </Box>
);

export const PlatformApiIntegrationPanel = () => {
  const [filter, setFilter] = useState('');
  const rows = platformApiIntegrations.filter(
    i =>
      i.name.toLowerCase().includes(filter.toLowerCase()) ||
      i.id.toLowerCase().includes(filter.toLowerCase()) ||
      i.category.toLowerCase().includes(filter.toLowerCase()) ||
      i.targetSystem.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <Box>
      <Box marginBottom={2}>
        <TextField
          label="API명, ID, 카테고리, 대상 시스템 검색"
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
              <TableCell>ID</TableCell>
              <TableCell>API/연계명</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>출발 → 도착</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>
                  <Chip size="small" label={row.method} />
                </TableCell>
                <TableCell>
                  {row.sourceSystem} → {row.targetSystem}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={statusColor[row.status]}
                    label={row.status}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box marginTop={2}>
        {rows.map(row => (
          <Accordion key={row.id} defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {row.id} {row.name} — {row.sourceSystem} → {row.targetSystem}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box width="100%">
                <Typography variant="body2" gutterBottom>
                  <strong>설명:</strong> {row.description}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Endpoint 후보:</strong> {row.endpointCandidate}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>프로토콜 후보:</strong>{' '}
                  {row.protocolCandidates.join(', ')}
                </Typography>
                {row.portalRole && (
                  <Typography variant="body2" gutterBottom>
                    <strong>포털 역할:</strong> {row.portalRole}
                  </Typography>
                )}
                {row.platformRole && (
                  <Typography variant="body2" gutterBottom>
                    <strong>플랫폼 역할:</strong> {row.platformRole}
                  </Typography>
                )}
                {row.responsibilityBoundary && (
                  <Typography variant="body2" gutterBottom>
                    <strong>책임 경계:</strong> {row.responsibilityBoundary}
                  </Typography>
                )}
                <Box marginTop={1}>
                  <Typography variant="subtitle2">요청 데이터</Typography>
                  <ul style={{ margin: 0 }}>
                    {row.requestData.map(item => (
                      <li key={item}>
                        <Typography variant="body2">{item}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
                <Box marginTop={1}>
                  <Typography variant="subtitle2">응답 데이터</Typography>
                  <ul style={{ margin: 0 }}>
                    {row.responseData.map(item => (
                      <li key={item}>
                        <Typography variant="body2">{item}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
                <Box marginTop={1}>
                  <Typography variant="subtitle2">보안 고려사항</Typography>
                  <ul style={{ margin: 0 }}>
                    {row.securityConsiderations.map(item => (
                      <li key={item}>
                        <Typography variant="body2">{item}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
                {row.followUpConditions &&
                  row.followUpConditions.length > 0 && (
                    <ListSection
                      title="후속 연동 조건"
                      items={row.followUpConditions}
                    />
                  )}
                {row.errorHandling && row.errorHandling.length > 0 && (
                  <ListSection title="오류/재처리" items={row.errorHandling} />
                )}
                {row.auditLog && row.auditLog.length > 0 && (
                  <ListSection title="감사로그" items={row.auditLog} />
                )}
                {row.followUpQuestions.length > 0 && (
                  <Box marginTop={1}>
                    <Typography variant="subtitle2" color="error">
                      후속 확인사항
                    </Typography>
                    <ul style={{ margin: 0 }}>
                      {row.followUpQuestions.map(item => (
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
