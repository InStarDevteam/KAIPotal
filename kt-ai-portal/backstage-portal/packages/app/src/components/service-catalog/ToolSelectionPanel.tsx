import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import DeleteIcon from '@material-ui/icons/Delete';
import AddIcon from '@material-ui/icons/Add';
import { Tool, SelectedTool } from './types';

interface ToolSelectionPanelProps {
  tools: Tool[];
  projects: string[];
  workspaces: string[];
  onCreateRequest: (
    selections: SelectedTool[],
    project: string,
    workspace: string,
  ) => boolean;
}

export const ToolSelectionPanel = ({
  tools,
  projects,
  workspaces,
  onCreateRequest,
}: ToolSelectionPanelProps) => {
  const [selections, setSelections] = useState<SelectedTool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState('');
  const [project, setProject] = useState(projects[0] || '');
  const [workspace, setWorkspace] = useState(workspaces[0] || '');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const availableTools = tools.filter(t => t.status === '사용가능');

  const handleAdd = () => {
    const tool = availableTools.find(t => t.id === selectedToolId);
    if (!tool) return;
    setSelections(prev => [
      ...prev,
      { tool, version: tool.version, project, workspace, reason },
    ]);
    setSelectedToolId('');
    setReason('');
  };

  const handleRemove = (index: number) => {
    setSelections(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateRequest = () => {
    if (selections.length === 0) {
      setValidationError('신청서에 담을 도구를 먼저 추가하세요.');
      return;
    }
    const created = onCreateRequest(selections, project, workspace);
    if (!created) return;
    setSelections([]);
    setValidationError(null);
  };

  const estimatedCredit = selections.length * 1200;

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        도구 선택 패널
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        워크스페이스에 적용할 도구를 선택하고 신청서를 구성합니다.
      </Typography>

      <Grid container spacing={2} alignItems="flex-end" style={{ marginTop: 8 }}>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>프로젝트</InputLabel>
            <Select value={project} onChange={e => setProject(e.target.value as string)}>
              {projects.map(p => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>워크스페이스</InputLabel>
            <Select value={workspace} onChange={e => setWorkspace(e.target.value as string)}>
              {workspaces.map(w => (
                <MenuItem key={w} value={w}>
                  {w}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>도구</InputLabel>
            <Select value={selectedToolId} onChange={e => setSelectedToolId(e.target.value as string)}>
              <MenuItem value="">선택</MenuItem>
              {availableTools.map(t => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={!selectedToolId}
            fullWidth
          >
            추가
          </Button>
        </Grid>
      </Grid>

      <Box marginTop={2}>
        <TextField
          fullWidth
          size="small"
          label="신청 사유"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="도구 사용 목적을 입력하세요"
        />
      </Box>

      <Divider style={{ margin: '16px 0' }} />

      <Typography variant="subtitle2" gutterBottom>
        선택된 도구
      </Typography>
      {selections.length === 0 && (
        <Typography color="textSecondary" variant="body2">
          선택된 도구가 없습니다.
        </Typography>
      )}
      <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
        {selections.map((s, idx) => (
          <Chip
            key={`${s.tool.id}-${idx}`}
            label={`${s.tool.name} / ${s.workspace}`}
            onDelete={() => handleRemove(idx)}
            deleteIcon={<DeleteIcon />}
          />
        ))}
      </Box>

      <Box marginTop={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2">
          예상 크레딧: <strong>{estimatedCredit.toLocaleString()}</strong>
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateRequest}
        >
          신청서 생성
        </Button>
      </Box>
      {validationError && (
        <Typography variant="body2" color="error" style={{ marginTop: 8 }}>
          {validationError}
        </Typography>
      )}
    </Paper>
  );
};
