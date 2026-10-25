import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import SaveIcon from '@material-ui/icons/Save';
import {
  PROJECT_VISIBILITY_LABELS,
  ServerProjectSummary,
} from './projectServerData';

export interface ServerProjectFormValues {
  name: string;
  description: string;
  purpose: string;
  visibility: string;
  startAt: string;
  endAt: string;
}

interface ServerProjectFormProps {
  initial?: ServerProjectSummary;
  submitting?: boolean;
  onSubmit: (values: ServerProjectFormValues) => void;
  onCancel?: () => void;
}

export const ServerProjectForm = ({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: ServerProjectFormProps) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [purpose, setPurpose] = useState(initial?.purpose ?? '');
  const [visibility, setVisibility] = useState(initial?.visibility ?? 'public');
  const [startAt, setStartAt] = useState(initial?.startAt ?? '');
  const [endAt, setEndAt] = useState(initial?.endAt ?? '');

  const submitLabel = initial ? '수정 저장' : '생성';
  const invalidPeriod = !!startAt && !!endAt && endAt < startAt;

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        {initial ? '프로젝트 수정' : '새 프로젝트 생성'}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        생성 즉시 진행 중 상태로 등록되며 나는 관리자 권한을 갖습니다.
      </Typography>
      <Grid container spacing={2} style={{ marginTop: 8 }}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            id="server-project-name"
            label="프로젝트명"
            required
            inputProps={{ maxLength: 200 }}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="server-project-visibility-label">
              공개범위
            </InputLabel>
            <Select
              labelId="server-project-visibility-label"
              value={visibility}
              onChange={e => setVisibility(e.target.value as string)}
            >
              {Object.entries(PROJECT_VISIBILITY_LABELS).map(
                ([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            size="small"
            id="server-project-start"
            label="시작일"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={startAt}
            onChange={e => setStartAt(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            size="small"
            id="server-project-end"
            label="종료일"
            error={invalidPeriod}
            helperText={
              invalidPeriod ? '종료일은 시작일 이후로 선택하세요.' : undefined
            }
            type="date"
            InputLabelProps={{ shrink: true }}
            value={endAt}
            onChange={e => setEndAt(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            id="server-project-description"
            label="설명"
            inputProps={{ maxLength: 2000 }}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            id="server-project-purpose"
            label="이용목적"
            inputProps={{ maxLength: 2000 }}
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
          />
        </Grid>
      </Grid>
      <Box marginTop={2} display="flex" style={{ gap: 8 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          disabled={submitting || !name.trim() || invalidPeriod}
          onClick={() =>
            onSubmit({ name, description, purpose, visibility, startAt, endAt })
          }
        >
          {submitting ? '저장 중' : submitLabel}
        </Button>
        {onCancel && <Button onClick={onCancel}>취소</Button>}
      </Box>
    </Paper>
  );
};
