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
import {
  Proposal,
  ProposalDraft,
  ProposalCategory,
  DataAccessLevel,
} from './types';

interface ProposalFormProps {
  onSubmit: (draft: ProposalDraft) => boolean;
  initialProposal?: Proposal;
  disabled?: boolean;
  onCancel?: () => void;
}

const categories: ProposalCategory[] = [
  'AI 모델 개발',
  '빅데이터 분석 모델 개발',
  '데이터셋 구축',
  'LLM/RAG 서비스',
  'MLOps 자동화',
  '데이터 시각화',
  '기타',
];

const securityLevels: DataAccessLevel[] = ['공개', '내부', '비밀'];

export const ProposalForm = ({
  onSubmit,
  initialProposal,
  disabled = false,
  onCancel,
}: ProposalFormProps) => {
  const [title, setTitle] = useState(initialProposal?.title || '');
  const [category, setCategory] = useState<ProposalCategory>(
    initialProposal?.category || 'AI 모델 개발',
  );
  const [proposer, setProposer] = useState(initialProposal?.proposer || '');
  const [organization, setOrganization] = useState(
    initialProposal?.organization || '',
  );
  const [contact, setContact] = useState(initialProposal?.contact || '');
  const [email, setEmail] = useState(initialProposal?.email || '');
  const [necessity, setNecessity] = useState(initialProposal?.necessity || '');
  const [applicability, setApplicability] = useState(
    initialProposal?.applicability || '',
  );
  const [expectedEffect, setExpectedEffect] = useState(
    initialProposal?.expectedEffect || '',
  );
  const [requiredData, setRequiredData] = useState(
    initialProposal?.requiredData || '',
  );
  const [expectedUsers, setExpectedUsers] = useState(
    initialProposal?.expectedUsers || '',
  );
  const [securityLevel, setSecurityLevel] = useState<DataAccessLevel>(
    initialProposal?.securityLevel || '내부',
  );
  const [isPublic, setIsPublic] = useState(initialProposal?.isPublic ?? true);
  const [privacyAgreed, setPrivacyAgreed] = useState(
    initialProposal?.privacyAgreed ?? false,
  );

  const handleSubmit = () => {
    if (disabled) return;
    if (
      onSubmit({
        title,
        category,
        proposer,
        organization,
        contact,
        email,
        necessity,
        applicability,
        expectedEffect,
        requiredData,
        expectedUsers,
        securityLevel,
        isPublic,
        privacyAgreed,
      })
    ) {
      setTitle('');
      setNecessity('');
      setApplicability('');
      setExpectedEffect('');
      setRequiredData('');
      setExpectedUsers('');
      setPrivacyAgreed(false);
    }
  };

  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        {initialProposal ? '내 제안 수정' : '제안 등록'}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        새로운 AI/데이터 아이디어를 등록합니다.
      </Typography>

      <Grid container spacing={2} style={{ marginTop: 8 }}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            id="proposal-title"
            label="제안 제목"
            required
            inputProps={{ maxLength: 160 }}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="proposal-category-label">제안 구분</InputLabel>
            <Select
              labelId="proposal-category-label"
              value={category}
              onChange={e => setCategory(e.target.value as ProposalCategory)}
            >
              {categories.map(c => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="proposal-security-label">보안등급</InputLabel>
            <Select
              labelId="proposal-security-label"
              value={securityLevel}
              onChange={e =>
                setSecurityLevel(e.target.value as DataAccessLevel)
              }
            >
              {securityLevels.map(s => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            id="proposal-proposer"
            label="제안자"
            required
            value={proposer}
            onChange={e => setProposer(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            id="proposal-organization"
            label="소속"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            id="proposal-contact"
            label="연락처"
            value={contact}
            onChange={e => setContact(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            id="proposal-email"
            label="이메일"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            size="small"
            id="proposal-necessity"
            label="필요성"
            required
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
            id="proposal-applicability"
            label="활용 가능성"
            value={applicability}
            onChange={e => setApplicability(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            id="proposal-effect"
            label="기대효과"
            value={expectedEffect}
            onChange={e => setExpectedEffect(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            id="proposal-data"
            label="필요 데이터"
            value={requiredData}
            onChange={e => setRequiredData(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            id="proposal-users"
            label="예상 활용 부대/기관"
            value={expectedUsers}
            onChange={e => setExpectedUsers(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
              />
            }
            label="공개 여부"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={privacyAgreed}
                onChange={e => setPrivacyAgreed(e.target.checked)}
              />
            }
            label="개인정보 동의"
          />
        </Grid>
      </Grid>

      <Box marginTop={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={
            disabled ||
            !title.trim() ||
            !proposer.trim() ||
            !necessity.trim() ||
            !privacyAgreed
          }
        >
          {initialProposal ? '수정 저장' : '등록'}
        </Button>
        {onCancel && <Button onClick={onCancel}>수정 취소</Button>}
      </Box>
    </Paper>
  );
};
