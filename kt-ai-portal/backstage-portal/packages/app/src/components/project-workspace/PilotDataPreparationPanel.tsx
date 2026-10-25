import { useMemo, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Chip from '@material-ui/core/Chip';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import LinearProgress from '@material-ui/core/LinearProgress';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Box from '@material-ui/core/Box';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import {
  DataGenerationRequest,
  DataGenerationRequestStatus,
  DataGenerationRequestType,
  PilotProject,
} from './types';
import { mockGenerationRequests, mockPilotProjects } from './mockPilotProjects';
import { useAuthz } from '../authz';

const NOTICE_TEXT =
  '포털은 합성데이터·시뮬레이터 데이터 생성을 직접 수행하지 않으며, 생성 요청과 결과·계보·품질 조회를 지원합니다. 실제 생성은 데이터 플랫폼·AI 플랫폼이 수행합니다.';

const FLOW_STEPS = [
  '실증 프로젝트 개설',
  '데이터 수요/보유 비교',
  '부족량 식별',
  '연동/합성·시뮬레이터 생성 요청',
  '생성/수집 상태 조회',
  '품질·계보 검증',
  '데이터셋 확정',
  'DT/OT 수행',
  '결과·성과 등록/반출',
];

const STATUS_TO_STEP: Record<PilotProject['status'], number> = {
  preparing: 1,
  data_collection: 4,
  data_generation: 4,
  quality_check: 5,
  ready: 6,
  dt_running: 7,
  ot_running: 7,
  completed: FLOW_STEPS.length,
};

const PILOT_STATUS_LABEL: Record<PilotProject['status'], string> = {
  preparing: '준비중',
  data_collection: '데이터 수집중',
  data_generation: '데이터 생성중',
  quality_check: '품질 검증중',
  ready: '데이터셋 확정',
  dt_running: 'DT 수행중',
  ot_running: 'OT 수행중',
  completed: '완료',
};

const ACQUISITION_LABEL: Record<
  PilotProject['acquisitionMethods'][number],
  string
> = {
  interop: '타 체계 연동',
  'file-import': '파일 반입',
  synthetic: '합성데이터',
  simulator: '시뮬레이터',
};

const GENERATION_TYPE_LABEL: Record<DataGenerationRequestType, string> = {
  synthetic: '합성데이터',
  simulator: '시뮬레이터',
};

const GENERATION_STATUS_LABEL: Record<DataGenerationRequestStatus, string> = {
  requested: '요청됨',
  generating: '생성중',
  completed: '완료',
  failed: '실패',
};

const QUALITY_LABEL = {
  pending: '검증 대기',
  passed: '검증 통과',
  failed: '검증 실패',
} as const;

const generationStatusColor = (status: DataGenerationRequestStatus) => {
  if (status === 'completed') return 'primary';
  if (status === 'failed') return 'secondary';
  return 'default';
};

const qualityStatusColor = (status: keyof typeof QUALITY_LABEL) => {
  if (status === 'passed') return 'primary';
  if (status === 'failed') return 'secondary';
  return 'default';
};

const DataGapBar = ({
  type,
  targetCount,
  currentCount,
}: {
  type: string;
  targetCount: number;
  currentCount: number;
}) => {
  const percent =
    targetCount > 0 ? Math.min(100, (currentCount / targetCount) * 100) : 100;
  const shortage = Math.max(0, targetCount - currentCount);
  return (
    <Box marginBottom={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2">{type}</Typography>
        <Box display="flex" alignItems="center" gridGap={8}>
          <Typography variant="body2" color="textSecondary">
            보유 {currentCount.toLocaleString()} / 목표{' '}
            {targetCount.toLocaleString()}
          </Typography>
          {shortage > 0 ? (
            <Chip
              size="small"
              color="secondary"
              label={`부족 ${shortage.toLocaleString()}건`}
            />
          ) : (
            <Chip size="small" color="primary" label="충족" />
          )}
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={shortage > 0 ? 'secondary' : 'primary'}
      />
    </Box>
  );
};

export const PilotDataPreparationPanel = () => {
  const { hasPermission } = useAuthz();
  const canRequestGeneration = hasPermission('project.request');

  const [selectedId, setSelectedId] = useState(mockPilotProjects[0].id);
  const [requests, setRequests] = useState<DataGenerationRequest[]>(
    mockGenerationRequests,
  );

  const selected =
    mockPilotProjects.find(pilot => pilot.id === selectedId) ??
    mockPilotProjects[0];

  const pilotRequests = useMemo(
    () => requests.filter(req => req.pilotProjectId === selected.id),
    [requests, selected.id],
  );

  const [pendingType, setPendingType] =
    useState<DataGenerationRequestType | null>(null);

  const handleGenerationRequest = (type: DataGenerationRequestType) => {
    setPendingType(type);
  };

  const confirmGenerationRequest = () => {
    if (!pendingType) return;
    const shortage = selected.requiredDataTypes.reduce(
      (sum, item) => sum + Math.max(0, item.targetCount - item.currentCount),
      0,
    );
    const newRequest: DataGenerationRequest = {
      id: `DGR-2026-${String(requests.length + 19).padStart(3, '0')}`,
      pilotProjectId: selected.id,
      type: pendingType,
      status: 'requested',
      requestedAt: new Date().toISOString(),
      targetCount: shortage,
    };
    setRequests(prev => [newRequest, ...prev]);
    setPendingType(null);
  };

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h5" gutterBottom>
        실증·데이터 준비
      </Typography>
      <Typography color="textSecondary" paragraph>
        {NOTICE_TEXT}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            실증 과제 목록
          </Typography>
          <List>
            {mockPilotProjects.map(pilot => (
              <ListItem
                key={pilot.id}
                button
                selected={pilot.id === selected.id}
                onClick={() => setSelectedId(pilot.id)}
              >
                <ListItemText
                  primary={pilot.name}
                  secondary={`${pilot.unit} · ${pilot.dtOt}`}
                />
                <Chip
                  size="small"
                  label={PILOT_STATUS_LABEL[pilot.status]}
                  color={pilot.status === 'completed' ? 'primary' : 'default'}
                />
              </ListItem>
            ))}
          </List>
        </Grid>

        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>
            {selected.name}
          </Typography>

          <Grid container spacing={2} style={{ marginBottom: 16 }}>
            <Grid item xs={6} sm={3}>
              <Typography color="textSecondary">과제 ID</Typography>
              <Typography>{selected.id}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography color="textSecondary">소요부대</Typography>
              <Typography>{selected.unit}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography color="textSecondary">DT/OT 구분</Typography>
              <Typography>{selected.dtOt}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography color="textSecondary">진행 상태</Typography>
              <Chip
                size="small"
                label={PILOT_STATUS_LABEL[selected.status]}
                color={selected.status === 'completed' ? 'primary' : 'default'}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" gutterBottom>
            시험 시나리오
          </Typography>
          <Typography paragraph>{selected.scenario}</Typography>
          <Typography variant="subtitle2" gutterBottom>
            합격 기준
          </Typography>
          <Typography paragraph>{selected.acceptanceCriteria}</Typography>

          <Typography variant="subtitle2" gutterBottom>
            핵심성과지표(KPI)
          </Typography>
          <Table size="small" style={{ marginBottom: 16 }}>
            <TableHead>
              <TableRow>
                <TableCell>KPI</TableCell>
                <TableCell>목표</TableCell>
                <TableCell>측정값</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selected.kpis.map(kpi => (
                <TableRow key={kpi.name}>
                  <TableCell>{kpi.name}</TableCell>
                  <TableCell>{kpi.target}</TableCell>
                  <TableCell>{kpi.measured ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider style={{ margin: '16px 0' }} />

          <Typography variant="subtitle2" gutterBottom>
            데이터 수요/보유 비교
          </Typography>
          {selected.requiredDataTypes.map(item => (
            <DataGapBar
              key={item.type}
              type={item.type}
              targetCount={item.targetCount}
              currentCount={item.currentCount}
            />
          ))}

          <Box marginTop={2} marginBottom={2}>
            <Typography variant="subtitle2" gutterBottom>
              데이터 확볼 방식
            </Typography>
            <Box display="flex" gridGap={8} flexWrap="wrap" marginBottom={1}>
              {selected.acquisitionMethods.map(method => (
                <Chip
                  key={method}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={ACQUISITION_LABEL[method]}
                />
              ))}
            </Box>
            <Typography variant="body2" color="textSecondary">
              연동 대상 체계: {selected.linkedSystems.join(', ') || '-'}
            </Typography>
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            실증 데이터 준비 흐름
          </Typography>
          <Stepper
            activeStep={STATUS_TO_STEP[selected.status]}
            alternativeLabel
            style={{ marginBottom: 16 }}
          >
            {FLOW_STEPS.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Divider style={{ margin: '16px 0' }} />

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            marginBottom={1}
          >
            <Typography variant="subtitle2">데이터 생성 요청 목록</Typography>
            {canRequestGeneration && (
              <Box display="flex" gridGap={8}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => handleGenerationRequest('synthetic')}
                >
                  합성데이터 생성 요청
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => handleGenerationRequest('simulator')}
                >
                  시뮬레이터 데이터 생성 요청
                </Button>
              </Box>
            )}
          </Box>
          {pilotRequests.length === 0 ? (
            <Typography color="textSecondary" paragraph>
              접수된 생성 요청이 없습니다.
            </Typography>
          ) : (
            <Table size="small" style={{ marginBottom: 16 }}>
              <TableHead>
                <TableRow>
                  <TableCell>요청 ID</TableCell>
                  <TableCell>유형</TableCell>
                  <TableCell>목표 건수</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>요청일</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pilotRequests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell>{req.id}</TableCell>
                    <TableCell>{GENERATION_TYPE_LABEL[req.type]}</TableCell>
                    <TableCell>{req.targetCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={GENERATION_STATUS_LABEL[req.status]}
                        color={generationStatusColor(req.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(req.requestedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Typography variant="subtitle2" gutterBottom>
            데이터 계보
          </Typography>
          {selected.dataLineage.length === 0 ? (
            <Typography color="textSecondary" paragraph>
              등록된 데이터 계보가 없습니다.
            </Typography>
          ) : (
            <Table size="small" style={{ marginBottom: 16 }}>
              <TableHead>
                <TableRow>
                  <TableCell>버전</TableCell>
                  <TableCell>원천</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell>비고</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selected.dataLineage.map(lineage => (
                  <TableRow key={lineage.version}>
                    <TableCell>{lineage.version}</TableCell>
                    <TableCell>{lineage.source}</TableCell>
                    <TableCell>
                      {new Date(lineage.generatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{lineage.note ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                품질검증 결과
              </Typography>
              {selected.qualityCheck ? (
                <>
                  <Chip
                    size="small"
                    label={QUALITY_LABEL[selected.qualityCheck.status]}
                    color={qualityStatusColor(selected.qualityCheck.status)}
                  />
                  {selected.qualityCheck.checkedAt && (
                    <Typography variant="body2" color="textSecondary">
                      검증일:{' '}
                      {new Date(
                        selected.qualityCheck.checkedAt,
                      ).toLocaleDateString()}
                    </Typography>
                  )}
                  {selected.qualityCheck.note && (
                    <Typography variant="body2">
                      {selected.qualityCheck.note}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography color="textSecondary">
                  품질검증 정보가 없습니다.
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                학습/검증/시험 데이터 분할
              </Typography>
              {selected.dataSplit ? (
                <Typography variant="body2">
                  학습 {selected.dataSplit.train}% · 검증{' '}
                  {selected.dataSplit.validation}% · 시험{' '}
                  {selected.dataSplit.test}%
                </Typography>
              ) : (
                <Typography color="textSecondary">
                  데이터셋 확정 후 분할 비율이 표시됩니다.
                </Typography>
              )}
            </Grid>
          </Grid>

          {selected.resultSummary && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Typography variant="subtitle2" gutterBottom>
                실증 결과 요약
              </Typography>
              <Typography paragraph>{selected.resultSummary}</Typography>
              {selected.artifacts && selected.artifacts.length > 0 && (
                <Box display="flex" gridGap={8} flexWrap="wrap">
                  {selected.artifacts.map(artifact => (
                    <Chip key={artifact} size="small" label={artifact} />
                  ))}
                </Box>
              )}
            </>
          )}
        </Grid>
      </Grid>

      <Dialog open={pendingType !== null} onClose={() => setPendingType(null)}>
        <DialogTitle>데이터 생성 요청</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingType !== null &&
              `${GENERATION_TYPE_LABEL[pendingType]} 생성을 요청하시겠습니까? 실제 생성은 데이터 플랫폼·AI 플랫폼이 수행합니다.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingType(null)}>취소</Button>
          <Button
            onClick={confirmGenerationRequest}
            color="primary"
            variant="contained"
          >
            요청
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
