import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import SaveIcon from '@material-ui/icons/Save';
import { DirectToolRequestInput } from './serviceCatalogRequestStore';

interface DirectToolRequestFormProps {
  projects: string[];
  onSubmit: (values: DirectToolRequestInput) => boolean;
}

export const DirectToolRequestForm = ({
  projects,
  onSubmit,
}: DirectToolRequestFormProps) => {
  const [toolName, setToolName] = useState('');
  const [toolType, setToolType] = useState('');
  const [provisionType, setProvisionType] = useState('');
  const [requiredVersion, setRequiredVersion] = useState('');
  const [purpose, setPurpose] = useState('');
  const [relatedProject, setRelatedProject] = useState(projects[0] || '');
  const [requiredResources, setRequiredResources] = useState('');
  const [closedNetwork, setClosedNetwork] = useState(false);
  const [securityReview, setSecurityReview] = useState(false);

  const handleSubmit = () => {
    const saved = onSubmit({
      toolName,
      toolType,
      provisionType,
      requiredVersion,
      purpose,
      relatedProject,
      requiredResources,
      closedNetworkRequired: closedNetwork,
      securityReviewRequired: securityReview,
    });
    if (saved) {
      setToolName('');
      setToolType('');
      setProvisionType('');
      setRequiredVersion('');
      setPurpose('');
      setRequiredResources('');
      setClosedNetwork(false);
      setSecurityReview(false);
    }
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        직접 입력 요청
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        카탈로그에 없는 도구를 요청합니다.
      </Typography>

      <Grid container spacing={2} style={{ marginTop: 8 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="요청 도구명"
            value={toolName}
            onChange={e => setToolName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="도구 유형"
            value={toolType}
            onChange={e => setToolType(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="공급 방식"
            value={provisionType}
            onChange={e => setProvisionType(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="필요 버전"
            value={requiredVersion}
            onChange={e => setRequiredVersion(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>관련 프로젝트</InputLabel>
            <Select value={relatedProject} onChange={e => setRelatedProject(e.target.value as string)}>
              {projects.map(p => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="필요 리소스"
            value={requiredResources}
            onChange={e => setRequiredResources(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            size="small"
            label="사용 목적"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={closedNetwork}
                onChange={e => setClosedNetwork(e.target.checked)}
              />
            }
            label="폐쇄망 반입 필요"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={securityReview}
                onChange={e => setSecurityReview(e.target.checked)}
              />
            }
            label="보안 검토 필요"
          />
        </Grid>
      </Grid>

      <Box marginTop={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={!toolName}
        >
          요청 저장
        </Button>
      </Box>
    </Paper>
  );
};
