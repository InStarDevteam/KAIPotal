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
  PROPOSAL_TYPE_LABELS,
  PROPOSAL_VISIBILITY_LABELS,
  ServerProposalDetailView,
} from './proposalServerData';

export interface ServerProposalFormValues {
  type: string;
  title: string;
  necessity: string;
  utilizationPlan: string;
  visibility: string;
  attachmentUri: string;
}

interface ServerProposalFormProps {
  initial?: ServerProposalDetailView;
  submitting?: boolean;
  onSubmit: (values: ServerProposalFormValues) => void;
  onCancel?: () => void;
}

export const ServerProposalForm = ({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: ServerProposalFormProps) => {
  const [type, setType] = useState(initial?.type ?? 'feature');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [necessity, setNecessity] = useState(initial?.necessity ?? '');
  const [utilizationPlan, setUtilizationPlan] = useState(
    initial?.utilizationPlan ?? '',
  );
  const [visibility, setVisibility] = useState(initial?.visibility ?? 'tenant');
  const [attachmentUri, setAttachmentUri] = useState(
    initial?.attachmentUri ?? '',
  );

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        {initial ? '제안 수정' : '제안 등록'}
      </Typography>
      <Grid container spacing={2} style={{ marginTop: 8 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="server-proposal-type-label">제안 유형</InputLabel>
            <Select
              labelId="server-proposal-type-label"
              value={type}
              onChange={e => setType(e.target.value as string)}
            >
              {Object.entries(PROPOSAL_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="server-proposal-visibility-label">
              공개범위
            </InputLabel>
            <Select
              labelId="server-proposal-visibility-label"
              value={visibility}
              onChange={e => setVisibility(e.target.value as string)}
            >
              {Object.entries(PROPOSAL_VISIBILITY_LABELS).map(
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
            label="첨부 링크(선택)"
            value={attachmentUri}
            onChange={e => setAttachmentUri(e.target.value)}
            placeholder="https://"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            id="server-proposal-title"
            label="제안 제목"
            required
            inputProps={{ maxLength: 200 }}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            size="small"
            id="server-proposal-necessity"
            label="제안 배경/필요성"
            required
            inputProps={{ maxLength: 4000 }}
            value={necessity}
            onChange={e => setNecessity(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            size="small"
            label="활용 계획"
            inputProps={{ maxLength: 4000 }}
            value={utilizationPlan}
            onChange={e => setUtilizationPlan(e.target.value)}
          />
        </Grid>
      </Grid>
      <Box marginTop={2} display="flex" style={{ gap: 8 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          disabled={submitting || !title.trim() || !necessity.trim()}
          onClick={() =>
            onSubmit({
              type,
              title: title.trim(),
              necessity: necessity.trim(),
              utilizationPlan: utilizationPlan.trim(),
              visibility,
              attachmentUri: attachmentUri.trim(),
            })
          }
        >
          {submitting && '저장 중'}
          {!submitting && (initial ? '수정 저장' : '등록')}
        </Button>
        {onCancel && <Button onClick={onCancel}>수정 취소</Button>}
      </Box>
    </Paper>
  );
};
