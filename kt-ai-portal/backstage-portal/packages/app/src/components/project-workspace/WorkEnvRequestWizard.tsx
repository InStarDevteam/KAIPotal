import { ServerWorkRequests } from './ServerWorkRequests';
import { useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Checkbox from '@material-ui/core/Checkbox';
import Divider from '@material-ui/core/Divider';
import Chip from '@material-ui/core/Chip';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Box from '@material-ui/core/Box';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  WorkEnvSubmission,
  WorkEnvRequestType as RequestType,
  SubmissionStatus,
  readWorkspaceRequests,
  saveWorkspaceRequests,
  validateWorkspaceRequest,
  workspaceStorageKey,
} from './workspaceDemoStore';
import { SecurityLevel } from './types';
import { mockProjects } from './mockProjects';
import { useAuthz } from '../authz';

const submissionStatusColor = (status: SubmissionStatus) => {
  if (status === '승인') return 'primary';
  if (status === '반려') return 'secondary';
  return 'default';
};

const HELP_TEXT =
  '포털은 작업 환경 생성을 요청하고 상태를 조회하는 기능만 제공합니다. 실제 컨테이너 생성은 AI 플랫폼·데이터 플랫폼·클라우드/CMP가 수행합니다.';

const LIFECYCLE_FLOW_TEXT =
  '상태 흐름: 신청 → 승인 → 생성중 → 사용중 → 만료예정 → 종료 (분기: 생성실패 → 자원·크레딧 원복)';

const DATASET_OPTIONS = [
  '육군 장비 정비이력 데이터셋',
  '해군 장비 센서 시계열 데이터셋',
  '공군 부품 수요예측 데이터셋',
];
const AI_MODEL_OPTIONS = ['장비 고장예측 AI 모델', '부품 수요예측 AI 모델'];
const DATA_MODEL_OPTIONS = [
  '정비이력 표준 데이터모델',
  '부품 수요예측 데이터모델',
];
const ML_FRAMEWORK_OPTIONS = [
  'PyTorch',
  'TensorFlow',
  'scikit-learn',
  'Jupyter Notebook',
];
const ANALYTICS_FRAMEWORK_OPTIONS = [
  'Spark',
  'Presto',
  'Pandas',
  'Jupyter Notebook',
];
const LABELING_OPTIONS = ['Label Studio', 'CVAT'];
const VISUALIZATION_OPTIONS = ['TensorBoard', 'BI Dashboard', 'Grafana'];
const TRAINING_DATA_OPTIONS = [
  'AI Factory 데이터 파이프라인',
  'ETL 파이프라인',
];
const SECURITY_LEVELS: SecurityLevel[] = ['공개', '내부', '비밀'];
const PERSISTENCE_LOCATIONS = [
  '데이터 플랫폼 영구저장소',
  '프로젝트 전용 스토리지',
  '반출 후 폐기',
];

const initialForm = {
  projectId: mockProjects[0].id,
  newProjectName: '',
  workspaceName: '',
  datasets: [] as string[],
  models: [] as string[],
  cpuCores: '',
  gpuCount: '',
  memoryGiB: '',
  storageGiB: '',
  frameworks: [] as string[],
  labelingTools: [] as string[],
  visualizationTools: [] as string[],
  trainingDataTools: [] as string[],
  securityLevel: '내부' as SecurityLevel,
  startDate: '',
  endDate: '',
  usesCredit: 'yes',
  deidentificationRequired: 'no',
  persistenceLocation: PERSISTENCE_LOCATIONS[0],
  performanceLinkage: 'no',
};

const CheckboxGroup = ({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
}) => (
  <FormControl component="fieldset" fullWidth style={{ marginBottom: 16 }}>
    <FormLabel component="legend">{label}</FormLabel>
    <FormGroup row>
      {options.map(option => (
        <FormControlLabel
          key={option}
          control={
            <Checkbox
              color="primary"
              checked={values.includes(option)}
              onChange={() => onToggle(option)}
            />
          }
          label={option}
        />
      ))}
    </FormGroup>
  </FormControl>
);

const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter(item => item !== value)
    : [...values, value];

const WorkEnvRequestContent = ({
  tenantId,
  actorId,
  isDemo,
}: {
  tenantId: string;
  actorId: string;
  isDemo: boolean;
}) => {
  const { hasAnyPermission } = useAuthz();
  const writable = isDemo && !!tenantId && !!actorId;
  const canApprove =
    writable && hasAnyPermission(['project.approve', 'workspace.approve']);
  const canRequest =
    writable && hasAnyPermission(['project.request', 'workspace.request']);
  const storageKey = workspaceStorageKey(tenantId, actorId);
  const [loaded] = useState(() =>
    writable
      ? readWorkspaceRequests(storageKey)
      : { items: [] as WorkEnvSubmission[], error: undefined },
  );
  const [storageError, setStorageError] = useState<string | null>(
    loaded.error || null,
  );

  const [requestType, setRequestType] = useState<RequestType>(
    'AI 작업 환경(컨테이너) 생성 요청',
  );
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submissions, setSubmissions] = useState<WorkEnvSubmission[]>(
    loaded.items,
  );

  const isAI = requestType === 'AI 작업 환경(컨테이너) 생성 요청';

  const stepLabels = [
    '프로젝트/워크스페이스 선택',
    isAI ? '데이터셋·AI 모델' : '데이터·데이터모델',
    '자원(CPU/GPU/Memory/Storage)',
    isAI ? '머신러닝 프레임워크' : '분석 프레임워크',
    isAI ? '라벨링 툴' : '시각화·라벨링·학습데이터 도구',
    '보안등급·사용기간·크레딧',
    '신청내용 확인',
  ];

  const setField = <K extends keyof typeof initialForm>(
    field: K,
    value: (typeof initialForm)[K],
  ) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleListField = (
    field:
      | 'datasets'
      | 'models'
      | 'frameworks'
      | 'labelingTools'
      | 'visualizationTools'
      | 'trainingDataTools',
    value: string,
  ) => setForm(prev => ({ ...prev, [field]: toggleValue(prev[field], value) }));

  const selectedProject = mockProjects.find(p => p.id === form.projectId);
  const projectName =
    form.projectId === 'new'
      ? form.newProjectName || '(신규 프로젝트명 미입력)'
      : selectedProject?.name ?? form.projectId;

  const [notice, setNotice] = useState<string | null>(null);

  const persist = (next: WorkEnvSubmission[]): boolean => {
    if (!writable) return false;
    try {
      saveWorkspaceRequests(storageKey, next);
      setSubmissions(next);
      setStorageError(null);
      return true;
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : '저장하지 못했습니다.',
      );
      return false;
    }
  };
  const handleSubmit = () => {
    if (!canRequest) return;
    const invalid = validateWorkspaceRequest(form);
    if (invalid) {
      setStorageError(invalid);
      return;
    }
    const submission: WorkEnvSubmission = {
      id: `WREQ-${
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      }`,
      requestType,
      projectName,
      workspaceName: form.workspaceName.trim(),
      securityLevel: form.securityLevel,
      status: '신청',
      submittedAt: new Date().toISOString(),
      request: { ...form },
    };
    if (!persist([submission, ...submissions])) return;
    setNotice(
      '체험 신청을 저장했습니다. 실제 플랫폼 자원은 생성되지 않습니다.',
    );
    setForm(initialForm);
    setActiveStep(0);
  };
  const updateSubmissionStatus = (id: string, status: SubmissionStatus) => {
    if (
      !canApprove ||
      submissions.find(item => item.id === id)?.status !== '신청'
    )
      return;
    if (
      persist(
        submissions.map(item =>
          item.id === id
            ? { ...item, status, reviewedAt: new Date().toISOString() }
            : item,
        ),
      )
    )
      setNotice(
        `체험 신청을 ${status} 처리했습니다. 실제 자원 생성과는 별개입니다.`,
      );
  };

  const summaryRows: { label: string; value: string }[] = [
    { label: '요청 유형', value: requestType },
    { label: '프로젝트', value: projectName },
    { label: '워크스페이스명', value: form.workspaceName || '(자동 부여)' },
    {
      label: isAI ? '데이터셋 / AI 모델' : '데이터 / 데이터모델',
      value: `${form.datasets.join(', ') || '-'} / ${
        form.models.join(', ') || '-'
      }`,
    },
    {
      label: '자원',
      value: `CPU ${form.cpuCores || 0} Core · GPU ${
        form.gpuCount || 0
      }개 · Memory ${form.memoryGiB || 0} GiB · Storage ${
        form.storageGiB || 0
      } GiB`,
    },
    {
      label: isAI ? '머신러닝 프레임워크' : '분석 프레임워크',
      value: form.frameworks.join(', ') || '-',
    },
    {
      label: isAI ? '라벨링 툴' : '시각화·라벨링·학습데이터 도구',
      value: isAI
        ? form.labelingTools.join(', ') || '-'
        : [
            ...form.visualizationTools,
            ...form.labelingTools,
            ...form.trainingDataTools,
          ].join(', ') || '-',
    },
    { label: '보안등급', value: form.securityLevel },
    {
      label: '사용기간',
      value: `${form.startDate || '-'} ~ ${form.endDate || '-'}`,
    },
    {
      label: '크레딧 사용',
      value: form.usesCredit === 'yes' ? '예' : '아니오',
    },
    ...(!isAI
      ? [
          {
            label: '비식별화 필요 여부',
            value: form.deidentificationRequired === 'yes' ? '필요' : '불필요',
          },
          { label: '결과 영속보관 위치', value: form.persistenceLocation },
          {
            label: '성과등록·반출 연계 여부',
            value: form.performanceLinkage === 'yes' ? '연계' : '미연계',
          },
        ]
      : []),
  ];

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                required
                id="workenv-project"
                label="프로젝트 선택"
                value={form.projectId}
                onChange={e => setField('projectId', e.target.value)}
              >
                {mockProjects.map(project => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.id} · {project.name}
                  </MenuItem>
                ))}
                <MenuItem value="new">신규 프로젝트 생성</MenuItem>
              </TextField>
            </Grid>
            {form.projectId === 'new' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  id="workenv-new-project"
                  label="신규 프로젝트명"
                  value={form.newProjectName}
                  onChange={e => setField('newProjectName', e.target.value)}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                id="workenv-workspace"
                label="워크스페이스명"
                value={form.workspaceName}
                onChange={e => setField('workspaceName', e.target.value)}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <>
            <CheckboxGroup
              label={isAI ? '데이터셋 선택' : '데이터 선택'}
              options={DATASET_OPTIONS}
              values={form.datasets}
              onToggle={value => toggleListField('datasets', value)}
            />
            <CheckboxGroup
              label={isAI ? 'AI 모델 선택' : '데이터모델 선택'}
              options={isAI ? AI_MODEL_OPTIONS : DATA_MODEL_OPTIONS}
              values={form.models}
              onToggle={value => toggleListField('models', value)}
            />
          </>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                id="workenv-cpu"
                label="CPU Core"
                type="number"
                value={form.cpuCores}
                onChange={e => setField('cpuCores', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                id="workenv-gpu"
                label="GPU 수량"
                type="number"
                value={form.gpuCount}
                onChange={e => setField('gpuCount', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                id="workenv-memory"
                label="Memory (GiB)"
                type="number"
                value={form.memoryGiB}
                onChange={e => setField('memoryGiB', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                id="workenv-storage"
                label="Storage (GiB)"
                type="number"
                value={form.storageGiB}
                onChange={e => setField('storageGiB', e.target.value)}
              />
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <CheckboxGroup
            label={
              isAI
                ? '머신러닝 프레임워크/라이브러리'
                : '분석 프레임워크/라이브러리'
            }
            options={isAI ? ML_FRAMEWORK_OPTIONS : ANALYTICS_FRAMEWORK_OPTIONS}
            values={form.frameworks}
            onToggle={value => toggleListField('frameworks', value)}
          />
        );
      case 4:
        return isAI ? (
          <CheckboxGroup
            label="라벨링 툴"
            options={LABELING_OPTIONS}
            values={form.labelingTools}
            onToggle={value => toggleListField('labelingTools', value)}
          />
        ) : (
          <>
            <CheckboxGroup
              label="시각화 도구"
              options={VISUALIZATION_OPTIONS}
              values={form.visualizationTools}
              onToggle={value => toggleListField('visualizationTools', value)}
            />
            <CheckboxGroup
              label="라벨링 도구"
              options={LABELING_OPTIONS}
              values={form.labelingTools}
              onToggle={value => toggleListField('labelingTools', value)}
            />
            <CheckboxGroup
              label="학습데이터 구축 도구"
              options={TRAINING_DATA_OPTIONS}
              values={form.trainingDataTools}
              onToggle={value => toggleListField('trainingDataTools', value)}
            />
          </>
        );
      case 5:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                required
                id="workenv-security"
                label="보안등급"
                value={form.securityLevel}
                onChange={e =>
                  setField('securityLevel', e.target.value as SecurityLevel)
                }
              >
                {SECURITY_LEVELS.map(level => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="workenv-start"
                label="사용 시작일"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.startDate}
                onChange={e => setField('startDate', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="workenv-end"
                label="사용 종료일"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.endDate}
                onChange={e => setField('endDate', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">크레딧 사용 여부</FormLabel>
                <RadioGroup
                  row
                  value={form.usesCredit}
                  onChange={e => setField('usesCredit', e.target.value)}
                >
                  <FormControlLabel
                    value="yes"
                    control={<Radio color="primary" />}
                    label="크레딧 사용"
                  />
                  <FormControlLabel
                    value="no"
                    control={<Radio color="primary" />}
                    label="크레딧 미사용"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
            {!isAI && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">비식별화 필요 여부</FormLabel>
                    <RadioGroup
                      row
                      value={form.deidentificationRequired}
                      onChange={e =>
                        setField('deidentificationRequired', e.target.value)
                      }
                    >
                      <FormControlLabel
                        value="yes"
                        control={<Radio color="primary" />}
                        label="필요"
                      />
                      <FormControlLabel
                        value="no"
                        control={<Radio color="primary" />}
                        label="불필요"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    id="workenv-location"
                    label="결과 영속보관 위치"
                    value={form.persistenceLocation}
                    onChange={e =>
                      setField('persistenceLocation', e.target.value)
                    }
                  >
                    {PERSISTENCE_LOCATIONS.map(location => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">
                      성과등록·반출 연계 여부
                    </FormLabel>
                    <RadioGroup
                      row
                      value={form.performanceLinkage}
                      onChange={e =>
                        setField('performanceLinkage', e.target.value)
                      }
                    >
                      <FormControlLabel
                        value="yes"
                        control={<Radio color="primary" />}
                        label="연계"
                      />
                      <FormControlLabel
                        value="no"
                        control={<Radio color="primary" />}
                        label="미연계"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        );
      case 6:
        return (
          <Table size="small">
            <TableBody>
              {summaryRows.map(row => (
                <TableRow key={row.label}>
                  <TableCell style={{ width: 240 }}>{row.label}</TableCell>
                  <TableCell>{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
      default:
        return null;
    }
  };

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h5" gutterBottom>
        작업 환경(컨테이너) 생성 요청
      </Typography>
      <Typography color="textSecondary" paragraph>
        {HELP_TEXT}
      </Typography>

      <Box mb={2}>
        <Alert severity="info">
          {isDemo
            ? '체험 신청과 승인 상태는 현재 브라우저에 소속·사용자별로 저장됩니다. 실제 플랫폼에는 요청하지 않습니다.'
            : '작업환경 신청 서비스 연결이 필요합니다. 입력 내용을 확인할 수 있으며 실제 제출은 연결 후 사용할 수 있습니다.'}
        </Alert>
      </Box>
      {storageError && (
        <Box mb={2}>
          <Alert severity="error" onClose={() => setStorageError(null)}>
            {storageError}
          </Alert>
        </Box>
      )}
      <FormControl component="fieldset" style={{ marginBottom: 16 }}>
        <FormLabel component="legend">요청 유형</FormLabel>
        <RadioGroup
          row
          value={requestType}
          onChange={e => {
            setRequestType(e.target.value as RequestType);
            setActiveStep(0);
          }}
        >
          <FormControlLabel
            value="AI 작업 환경(컨테이너) 생성 요청"
            control={<Radio color="primary" />}
            label="AI 작업 환경(컨테이너) 생성 요청"
          />
          <FormControlLabel
            value="데이터 작업 환경(컨테이너) 생성 요청"
            control={<Radio color="primary" />}
            label="데이터 작업 환경(컨테이너) 생성 요청"
          />
        </RadioGroup>
      </FormControl>

      <Stepper activeStep={activeStep} alternativeLabel>
        {stepLabels.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box marginTop={3} marginBottom={3}>
        {renderStepContent()}
      </Box>

      <Box display="flex" gridGap={8}>
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(s => s - 1)}
        >
          이전
        </Button>
        {activeStep < stepLabels.length - 1 ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => setActiveStep(s => s + 1)}
          >
            다음
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!canRequest}
          >
            제출
          </Button>
        )}
      </Box>

      <Divider style={{ margin: '24px 0' }} />

      <Typography variant="h6" gutterBottom>
        신청 내역
      </Typography>
      <Typography color="textSecondary" paragraph>
        {LIFECYCLE_FLOW_TEXT}
      </Typography>
      {submissions.length === 0 ? (
        <Typography color="textSecondary">접수된 신청이 없습니다.</Typography>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>신청 ID</TableCell>
                <TableCell>요청 유형</TableCell>
                <TableCell>프로젝트</TableCell>
                <TableCell>워크스페이스</TableCell>
                <TableCell>보안등급</TableCell>
                <TableCell>자원·사용기간</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>신청일시</TableCell>
                {canApprove && <TableCell>승인 처리</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.requestType}</TableCell>
                  <TableCell>{item.projectName}</TableCell>
                  <TableCell>{item.workspaceName}</TableCell>
                  <TableCell>{item.securityLevel}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      CPU {item.request.cpuCores} · GPU{' '}
                      {item.request.gpuCount || '0'} · 메모리{' '}
                      {item.request.memoryGiB} GiB · 저장소{' '}
                      {item.request.storageGiB} GiB
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {item.request.startDate} ~ {item.request.endDate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.status}
                      color={submissionStatusColor(item.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(item.submittedAt).toLocaleString()}
                  </TableCell>
                  {canApprove && (
                    <TableCell>
                      {item.status === '신청' && (
                        <Box display="flex" gridGap={4}>
                          <Button
                            size="small"
                            color="primary"
                            onClick={() =>
                              updateSubmissionStatus(item.id, '승인')
                            }
                          >
                            승인
                          </Button>
                          <Button
                            size="small"
                            color="secondary"
                            onClick={() =>
                              updateSubmissionStatus(item.id, '반려')
                            }
                          >
                            반려
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </Paper>
  );
};

export const WorkEnvRequestWizard = () => {
  const runtime = usePortalRuntime();
  if (runtime.loading)
    return <Typography>신청 내역을 불러오는 중입니다.</Typography>;
  if (!runtime.isDemo)
    return (
      <ServerWorkRequests key={`${runtime.tenantId}:${runtime.actorId}`} />
    );
  return (
    <WorkEnvRequestContent
      key={`${runtime.isDemo}:${runtime.tenantId}:${runtime.actorId}`}
      tenantId={runtime.tenantId}
      actorId={runtime.actorId}
      isDemo={runtime.isDemo}
    />
  );
};
