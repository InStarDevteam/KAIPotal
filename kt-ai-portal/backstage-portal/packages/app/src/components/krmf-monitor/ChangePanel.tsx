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
  KrmfChange,
  createKrmfChange,
  getKrmfChanges,
  updateKrmfChange,
} from './krmfApi';
import { formatDate } from './krmfLabels';
import { KrmfQueryBoundary } from './KrmfQueryView';
import { KrmfTabContext } from './KrmfMonitorPage';
import { useKrmfQuery } from './useKrmfQuery';

export const ChangePanel = ({ context }: { context: KrmfTabContext }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('policy');
  const [newDescription, setNewDescription] = useState('');
  const [newControls, setNewControls] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [requestingId, setRequestingId] = useState('');
  const [requestError, setRequestError] = useState('');

  const changesState = useKrmfQuery<KrmfChange[]>(
    () => getKrmfChanges(context.request),
    [context.tenantId],
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setCreateError('변경 제목을 입력하세요.');
      return;
    }
    if (!newDescription.trim()) {
      setCreateError('변경 설명을 입력하세요.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await createKrmfChange(context.request, {
        title: newTitle.trim(),
        change_type: newType,
        description: newDescription.trim(),
        affected_control_ids: newControls
          .split(',')
          .map(value => value.trim())
          .filter(Boolean),
      });
      setNewTitle('');
      setNewType('policy');
      setNewDescription('');
      setNewControls('');
      changesState.reload();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : '변경 등록에 실패했습니다.',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRequestReassess = async (change: KrmfChange) => {
    setRequestingId(change.id);
    setRequestError('');
    try {
      await updateKrmfChange(context.request, change.id, {
        status: 'under_review',
        reassess_reason: '화면에서 재검토 요청',
      });
      changesState.reload();
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : '재검토 요청에 실패했습니다.',
      );
    } finally {
      setRequestingId('');
    }
  };

  const reassessPending = (change: KrmfChange) =>
    change.reassess_required === true && change.status !== 'reassessed';

  return (
    <SectionCard title="운영변경" compact>
      <KrmfQueryBoundary state={changesState}>
        {changes => {
          if (!changes.length)
            return (
              <EmptyState
                message="등록된 운영변경이 없습니다"
                description="변경이 등록되면 영향 통제와 재검토 상태가 표시됩니다."
              />
            );
          return (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>변경</TableCell>
                    <TableCell>유형</TableCell>
                    <TableCell>영향 통제</TableCell>
                    <TableCell>일시</TableCell>
                    <TableCell>재검토</TableCell>
                    <TableCell>조치</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {changes.map(change => (
                    <TableRow key={change.id}>
                      <TableCell>{change.title}</TableCell>
                      <TableCell>
                        {(
                          { policy: '정책', config: '구성' } as Record<
                            string,
                            string
                          >
                        )[change.change_type ?? ''] ||
                          change.change_type ||
                          '—'}
                      </TableCell>
                      <TableCell>
                        {change.affected_control_ids?.length
                          ? change.affected_control_ids.join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell>{formatDate(change.created_at)}</TableCell>
                      <TableCell>
                        {reassessPending(change) ? (
                          <StatusChip tone="warning" label="재검토 대기" />
                        ) : (
                          <StatusChip
                            tone="success"
                            label={
                              change.status === 'reassessed'
                                ? '재검토 완료'
                                : '정상'
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {change.status === 'recorded' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={requestingId === change.id}
                            onClick={() => void handleRequestReassess(change)}
                          >
                            재검토 요청
                          </Button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </KrmfQueryBoundary>

      {context.canManage ? (
        <Box
          display="flex"
          gridGap={1}
          flexWrap="wrap"
          marginTop={1}
          alignItems="center"
        >
          <TextField
            size="small"
            label="변경 제목"
            value={newTitle}
            onChange={event => setNewTitle(event.target.value)}
            style={{ minWidth: 220 }}
          />
          <TextField
            select
            size="small"
            label="유형"
            value={newType}
            onChange={event => setNewType(event.target.value)}
            style={{ minWidth: 120 }}
          >
            <MenuItem value="policy">정책</MenuItem>
            <MenuItem value="config">구성</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="변경 설명"
            value={newDescription}
            onChange={event => setNewDescription(event.target.value)}
            style={{ minWidth: 260 }}
          />
          <TextField
            size="small"
            label="영향 통제 ID (쉼표 구분)"
            value={newControls}
            onChange={event => setNewControls(event.target.value)}
            style={{ minWidth: 220 }}
          />
          <Button
            size="small"
            variant="contained"
            color="primary"
            disabled={creating}
            onClick={() => void handleCreate()}
          >
            변경 등록
          </Button>
        </Box>
      ) : null}
      {createError ? (
        <Typography variant="body2" color="error">
          {createError}
        </Typography>
      ) : null}
      {requestError ? (
        <Typography variant="body2" color="error">
          {requestError}
        </Typography>
      ) : null}
    </SectionCard>
  );
};
