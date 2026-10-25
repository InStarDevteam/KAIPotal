import Alert from '@material-ui/lab/Alert';
import { useState, FormEvent, ChangeEvent } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import Divider from '@material-ui/core/Divider';
import {
  ExportDirection,
  ExportTargetType,
  SecurityLevel,
  Visibility,
  AccessScope,
} from './types';
import { DemoExportRequestInput } from './exportRequestStore';

const directions: { value: ExportDirection; label: string }[] = [
  { value: 'export', label: '반출' },
  { value: 'import', label: '반입' },
];

const targetTypes: { value: ExportTargetType; label: string }[] = [
  { value: 'server', label: '서버' },
  { value: 'ai_model', label: 'AI 모델' },
  { value: 'algorithm', label: '알고리즘' },
  { value: 'dataset', label: '데이터셋' },
  { value: 'document', label: '문서' },
  { value: 'docker_image', label: 'Docker 이미지' },
  { value: 'pypi_package', label: 'PyPI 패키지' },
];

const securityLevels: { value: SecurityLevel; label: string }[] = [
  { value: 'public', label: '공개' },
  { value: 'internal', label: '내부' },
  { value: 'secret', label: '비밀' },
];

const visibilities: { value: Visibility; label: string }[] = [
  { value: 'public', label: '공개' },
  { value: 'private', label: '비공개' },
  { value: 'restricted', label: '제한공개' },
];

const accessScopes: { value: AccessScope; label: string }[] = [
  { value: 'all_users', label: '전체 사용자' },
  { value: 'project_members', label: '프로젝트 참여자' },
  { value: 'approved_users', label: '승인 사용자' },
  { value: 'admins_only', label: '관리자 전용' },
];

const projectOptions = [
  'DIMS 정비이력 분석 프로젝트',
  '장비 고장예측 모델 개발',
  '부품 수요예측 데이터셋 구축',
  '해군 센서 시계열 분석',
  // 'K-RMF 증빙 자동화', // 기능 보류
];

const initialForm = {
  direction: 'export' as ExportDirection,
  targetType: 'dataset' as ExportTargetType,
  targetName: '',
  targetDescription: '',
  projectName: projectOptions[0],
  reason: '',
  requester: '',
  requesterOrg: '',
  securityLevel: 'internal' as SecurityLevel,
  visibility: 'restricted' as Visibility,
  accessScope: 'approved_users' as AccessScope,
  attachments: '',
  downloadable: 'no',
  approver: '',
};

interface ExportRequestFormProps {
  demoMode?: boolean;
  onDemoSubmit?: (input: DemoExportRequestInput) => string | null;
}

export const ExportRequestForm = ({
  demoMode = false,
  onDemoSubmit,
}: ExportRequestFormProps) => {
  const [submitError, setSubmitError] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSaved, setDemoSaved] = useState(false);
  const [form, setForm] = useState(initialForm);

  const handleChange =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!demoMode || !onDemoSubmit) {
      // 원천 신청 API 연결 전에는 개인정보를 로그에 남기거나 접수 성공으로 표시하지 않는다.
      setSubmitError(true);
      return;
    }
    const error = onDemoSubmit({
      direction: form.direction,
      targetType: form.targetType,
      targetName: form.targetName,
      targetDescription: form.targetDescription,
      projectName: form.projectName,
      reason: form.reason,
      requester: form.requester,
      requesterOrg: form.requesterOrg,
      securityLevel: form.securityLevel,
      visibility: form.visibility,
      accessScope: form.accessScope,
      downloadable: form.downloadable === 'yes',
      attachments: form.attachments.split(','),
    });
    if (error) {
      setDemoError(error);
      setDemoSaved(false);
      return;
    }
    setDemoError(null);
    setDemoSaved(true);
    setForm(initialForm);
  };

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h5" gutterBottom>
        반출/반입 신청 등록
      </Typography>
      <Typography color="textSecondary" paragraph>
        신청 내용은 보안 검토와 승인 절차를 거쳐 처리되며, 진행 상태는 신청
        내역에서 확인할 수 있습니다.
      </Typography>

      {submitError && (
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          반출·반입 신청 서비스가 아직 연결되지 않았습니다. 신청은 접수되지
          않았으며 입력 내용은 이 화면에 유지됩니다.
        </Alert>
      )}
      {demoError && (
        <Alert severity="error" style={{ marginBottom: 16 }}>
          {demoError}
        </Alert>
      )}
      {demoSaved && (
        <Alert severity="info" style={{ marginBottom: 16 }}>
          신청을 데모 모드로 로컬 접수했습니다. 상태는 '접수 대기(데모)'이며
          신청 목록에서 확인할 수 있습니다. 실제 승인 절차는 서비스 연결 후
          진행됩니다.
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              label="반출/반입 구분"
              value={form.direction}
              onChange={handleChange('direction')}
            >
              {directions.map(item => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              label="대상 유형"
              value={form.targetType}
              onChange={handleChange('targetType')}
            >
              {targetTypes.map(item => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="대상명"
              value={form.targetName}
              onChange={handleChange('targetName')}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              multiline
              rows={3}
              label="대상 설명"
              value={form.targetDescription}
              onChange={handleChange('targetDescription')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              label="관련 프로젝트"
              value={form.projectName}
              onChange={handleChange('projectName')}
            >
              {projectOptions.map(name => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="승인 요청 대상자"
              value={form.approver}
              onChange={handleChange('approver')}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              multiline
              rows={2}
              label="신청 사유"
              value={form.reason}
              onChange={handleChange('reason')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="신청자"
              value={form.requester}
              onChange={handleChange('requester')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="소속"
              value={form.requesterOrg}
              onChange={handleChange('requesterOrg')}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              required
              label="보안등급"
              value={form.securityLevel}
              onChange={handleChange('securityLevel')}
            >
              {securityLevels.map(item => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              required
              label="공개 여부"
              value={form.visibility}
              onChange={handleChange('visibility')}
            >
              {visibilities.map(item => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              required
              label="사용권한"
              value={form.accessScope}
              onChange={handleChange('accessScope')}
            >
              {accessScopes.map(item => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="첨부자료명 (쉼표 구분)"
              value={form.attachments}
              onChange={handleChange('attachments')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              label="다운로드 필요 여부"
              value={form.downloadable}
              onChange={handleChange('downloadable')}
            >
              <MenuItem value="yes">예</MenuItem>
              <MenuItem value="no">아니오</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        <Divider style={{ margin: '24px 0' }} />

        <Button variant="contained" color="primary" type="submit" size="large">
          신청 등록
        </Button>
      </form>
    </Paper>
  );
};
