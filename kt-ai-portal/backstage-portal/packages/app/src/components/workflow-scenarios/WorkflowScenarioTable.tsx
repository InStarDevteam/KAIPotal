import { FC, useState } from 'react';
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
import { Link } from 'react-router-dom';
import { workflowScenarios } from './mockWorkflowScenarioData';
import { sortSteps } from './workflowScenarioUtils';

const statusColor: Record<string, 'default' | 'primary' | 'secondary'> = {
  '화면구현': 'primary',
  '부분구현': 'primary',
  '기반 자료': 'secondary',
  '모의 연동': 'secondary',
  'API 연계필요': 'default',
  '설계필요': 'default',
  '후속개발': 'default',
  '후속연동': 'default',
  '운영설계필요': 'default',
  '연계설계': 'default',
  '후속API연동': 'default',
  '타플랫폼제공전제': 'secondary',
};

interface Props {
  selectedScenarioId?: string;
  onSelect?: (id: string) => void;
}

export const WorkflowScenarioTable: FC<Props> = ({
  selectedScenarioId,
  onSelect,
}) => {
  const [filter, setFilter] = useState('');
  const rows = workflowScenarios.filter(
    s =>
      s.id.toLowerCase().includes(filter.toLowerCase()) ||
      s.title.toLowerCase().includes(filter.toLowerCase()) ||
      s.primaryUser.toLowerCase().includes(filter.toLowerCase()) ||
      s.relatedSfrIds.some(id => id.toLowerCase().includes(filter.toLowerCase())),
  );

  return (
    <Box>
      <Box marginBottom={2}>
        <TextField
          label="시나리오 ID, 제목, 사용자, SFR 검색"
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
              <TableCell>제목</TableCell>
              <TableCell>주요 사용자</TableCell>
              <TableCell>관련 메뉴</TableCell>
              <TableCell>관련 플랫폼</TableCell>
              <TableCell>관련 SFR</TableCell>
              <TableCell>단계</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow
                key={row.id}
                selected={selectedScenarioId === row.id}
                onClick={() => onSelect?.(row.id)}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              >
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.title}</TableCell>
                <TableCell>{row.primaryUser}</TableCell>
                <TableCell>
                  {row.relatedMenus.map(menu => (
                    <Chip key={menu} size="small" label={menu} style={{ margin: 2 }} />
                  ))}
                </TableCell>
                <TableCell>
                  {row.platforms.map(platform => (
                    <Chip key={platform} size="small" variant="outlined" label={platform} style={{ margin: 2 }} />
                  ))}
                </TableCell>
                <TableCell>
                  {row.relatedSfrIds.map(id => (
                    <Chip key={id} size="small" variant="outlined" label={id} style={{ margin: 2 }} />
                  ))}
                </TableCell>
                <TableCell>{row.steps.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box marginTop={2}>
        {rows.map(scenario => (
          <Accordion key={scenario.id} defaultExpanded={selectedScenarioId === scenario.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {scenario.id} {scenario.title} — {scenario.primaryUser}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box width="100%">
                <Typography variant="body2" gutterBottom>
                  <strong>목적:</strong> {scenario.purpose}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>핵심 메시지:</strong> {scenario.proposalMessage}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>RFP 매핑 근거:</strong> {scenario.rfpMappingReason}
                </Typography>
                <Box marginTop={1}>
                  <Typography variant="subtitle2">단계 흐름</Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>순서</TableCell>
                          <TableCell>수행 주체</TableCell>
                          <TableCell>행위</TableCell>
                          <TableCell>사용 메뉴</TableCell>
                          <TableCell>대상 플랫폼</TableCell>
                          <TableCell>교환 데이터</TableCell>
                          <TableCell>관련 API</TableCell>
                          <TableCell>상태</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortSteps(scenario.steps).map(step => (
                          <TableRow key={step.order}>
                            <TableCell>{step.order}</TableCell>
                            <TableCell>{step.actor}</TableCell>
                            <TableCell>{step.action}</TableCell>
                            <TableCell>
                              {step.sourceMenu && step.sourceRoute ? (
                                <Link to={step.sourceRoute}>{step.sourceMenu}</Link>
                              ) : (step.sourceMenu || '-')}
                            </TableCell>
                            <TableCell>{step.targetPlatform}</TableCell>
                            <TableCell>
                              {step.exchangedData.map(d => (
                                <Chip key={d} size="small" label={d} style={{ margin: 2 }} />
                              ))}
                            </TableCell>
                            <TableCell>
                              {step.relatedApiIds.map(id => (
                                <Chip key={id} size="small" variant="outlined" label={id} style={{ margin: 2 }} />
                              ))}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={statusColor[step.status] ?? 'default'}
                                label={step.status}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
                {scenario.followUpItems.length > 0 && (
                  <Box marginTop={1}>
                    <Typography variant="subtitle2" color="error">
                      후속 확인사항
                    </Typography>
                    <ul style={{ margin: 0 }}>
                      {scenario.followUpItems.map(item => (
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
