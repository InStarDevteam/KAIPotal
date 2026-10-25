import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { EmptyState, SectionCard, StatusChip } from '../common';
import {
  KrmfEvalRecord,
  answerKrmfEvalRecord,
  createKrmfEvalRecord,
  getKrmfEvalRecords,
  updateKrmfEvalRecordStatus,
} from './krmfApi';
import { evalKindLabel, evalStatusLabel } from './krmfLabels';
import { KrmfQueryBoundary } from './KrmfQueryView';
import { KrmfTabContext } from './KrmfMonitorPage';
import { useKrmfQuery } from './useKrmfQuery';

const evalTone = (status: string) => {
  if (status === 'closed') return 'neutral' as const;
  if (status === 'answered') return 'success' as const;
  return 'info' as const;
};

const EVAL_KINDS = [
  'submission',
  'query',
  'answer',
  'supplement',
  'risk_acceptance',
  'authority_confirmation',
];

export const EvalSupportPanel = ({ context }: { context: KrmfTabContext }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState('');
  const [saveError, setSaveError] = useState('');
  const [kind, setKind] = useState('query');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [source, setSource] = useState('');
  const [residualRisk, setResidualRisk] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const recordsState = useKrmfQuery<KrmfEvalRecord[]>(
    () => getKrmfEvalRecords(context.request),
    [context.tenantId],
  );

  const handleAnswer = async (record: KrmfEvalRecord) => {
    const answer = (answers[record.id] ?? '').trim();
    if (!answer) {
      setSaveError('답변을 입력하세요.');
      return;
    }
    setSavingId(record.id);
    setSaveError('');
    try {
      await answerKrmfEvalRecord(context.request, record.id, { answer });
      setAnswers(previous => {
        const next = { ...previous };
        delete next[record.id];
        return next;
      });
      recordsState.reload();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : '답변 저장에 실패했습니다.',
      );
    } finally {
      setSavingId('');
    }
  };

  const handleClose = async (record: KrmfEvalRecord) => {
    setSavingId(record.id);
    setSaveError('');
    try {
      await updateKrmfEvalRecordStatus(context.request, record.id, 'closed');
      recordsState.reload();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : '상태 변경에 실패했습니다.',
      );
    } finally {
      setSavingId('');
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !body.trim() || !source.trim()) {
      setCreateError('유형·제목·내용·출처를 모두 입력하세요.');
      return;
    }
    if (kind === 'risk_acceptance' && !residualRisk.trim()) {
      setCreateError('잔여위험 수용 기록은 잔여 위험 수준이 필요합니다.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await createKrmfEvalRecord(context.request, {
        kind,
        title: title.trim(),
        body: body.trim(),
        source: source.trim(),
        residual_risk: residualRisk.trim() || undefined,
      });
      setTitle('');
      setBody('');
      setSource('');
      setResidualRisk('');
      recordsState.reload();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : '기록 등록에 실패했습니다.',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <SectionCard
      title="평가·인가 지원 (제출목록·질의/답변·보완·잔여위험·관계기관 확인)"
      compact
    >
      <KrmfQueryBoundary state={recordsState}>
        {records => {
          if (!records.length)
            return (
              <EmptyState
                message="등록된 평가 기록이 없습니다"
                description="제출·질의·관계기관 확인 기록이 등록되면 답변과 상태를 관리할 수 있습니다."
              />
            );
          return (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>유형</TableCell>
                    <TableCell>제목·내용</TableCell>
                    <TableCell>출처</TableCell>
                    <TableCell>잔여위험</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>답변</TableCell>
                    <TableCell>조치</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <StatusChip
                          tone={
                            record.kind === 'authority_confirmation'
                              ? 'info'
                              : 'neutral'
                          }
                          label={evalKindLabel(record.kind)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{record.title}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {record.body}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.source}</TableCell>
                      <TableCell>{record.residual_risk || '—'}</TableCell>
                      <TableCell>
                        <StatusChip
                          tone={evalTone(record.status)}
                          label={evalStatusLabel(record.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {record.status === 'open' ? (
                          <TextField
                            size="small"
                            multiline
                            rows={1}
                            placeholder="답변 입력"
                            value={answers[record.id] ?? ''}
                            onChange={event =>
                              setAnswers(previous => ({
                                ...previous,
                                [record.id]: event.target.value,
                              }))
                            }
                            fullWidth
                          />
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            {record.answered_at
                              ? `답변 완료 ${record.answered_at.slice(0, 10)}`
                              : '—'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gridGap={0.5}>
                          {record.status === 'open' ? (
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={savingId === record.id}
                              onClick={() => void handleAnswer(record)}
                            >
                              답변 저장
                            </Button>
                          ) : null}
                          {record.status !== 'closed' ? (
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={savingId === record.id}
                              onClick={() => void handleClose(record)}
                            >
                              종결
                            </Button>
                          ) : null}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </KrmfQueryBoundary>

      <Box
        display="flex"
        gridGap={1}
        flexWrap="wrap"
        marginTop={1}
        alignItems="flex-end"
      >
        <TextField
          select
          size="small"
          label="유형"
          value={kind}
          onChange={event => setKind(event.target.value)}
          style={{ minWidth: 150 }}
        >
          {EVAL_KINDS.map(value => (
            <MenuItem key={value} value={value}>
              {evalKindLabel(value)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="제목"
          value={title}
          onChange={event => setTitle(event.target.value)}
          style={{ minWidth: 200 }}
        />
        <TextField
          size="small"
          label="내용"
          value={body}
          onChange={event => setBody(event.target.value)}
          style={{ minWidth: 240 }}
        />
        <TextField
          size="small"
          label="출처"
          value={source}
          onChange={event => setSource(event.target.value)}
          style={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          label="잔여위험"
          value={residualRisk}
          onChange={event => setResidualRisk(event.target.value)}
          style={{ minWidth: 140 }}
        />
        <Button
          size="small"
          variant="contained"
          color="primary"
          disabled={creating}
          onClick={() => void handleCreate()}
        >
          기록 등록
        </Button>
      </Box>
      {saveError ? (
        <Typography variant="body2" color="error">
          {saveError}
        </Typography>
      ) : null}
      {createError ? (
        <Typography variant="body2" color="error">
          {createError}
        </Typography>
      ) : null}
    </SectionCard>
  );
};
