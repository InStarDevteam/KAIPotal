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
import GetAppIcon from '@material-ui/icons/GetApp';
import { EmptyState, SectionCard } from '../common';
import { downloadCsv } from '../common/csvDownload';
import {
  KrmfTrrItem,
  getKrmfTrrItems,
  updateKrmfTrrItem,
} from './krmfApi';
import { trrEvidenceReadyLabel } from './krmfLabels';
import { KrmfQueryBoundary } from './KrmfQueryView';
import { KrmfTabContext } from './KrmfMonitorPage';
import { useKrmfQuery } from './useKrmfQuery';

type TrrDraft = Record<
  string,
  { test_criteria: string; test_data: string; evidence_ready: boolean }
>;

export const TrrPanel = ({ context }: { context: KrmfTabContext }) => {
  const [drafts, setDrafts] = useState<TrrDraft>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  const trrState = useKrmfQuery<KrmfTrrItem[]>(
    () => getKrmfTrrItems(context.request, context.projectId || undefined),
    [context.tenantId, context.projectId],
  );

  const draftFor = (item: KrmfTrrItem) =>
    drafts[item.id] ?? {
      test_criteria: item.test_criteria ?? '',
      test_data: item.test_data ?? '',
      evidence_ready: item.evidence_ready === true,
    };

  const setDraft = (item: KrmfTrrItem, patch: Partial<TrrDraft[string]>) => {
    setDrafts(previous => ({
      ...previous,
      [item.id]: { ...draftFor(item), ...patch },
    }));
  };

  const handleSave = async (items: KrmfTrrItem[]) => {
    const changed = items
      .filter(item => drafts[item.id])
      .map(item => ({ item, draft: draftFor(item) }));
    if (!changed.length) return;
    setSaving(true);
    setSaveError('');
    setSaveNotice('');
    try {
      for (const { item, draft } of changed) {
        await updateKrmfTrrItem(context.request, item.id, {
          test_criteria: draft.test_criteria,
          test_data: draft.test_data,
          evidence_ready: draft.evidence_ready,
          status: draft.evidence_ready ? 'ready' : 'not_ready',
        });
      }
      setDrafts({});
      setSaveNotice('저장되었습니다.');
      trrState.reload();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : '저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (items: KrmfTrrItem[]) => {
    downloadCsv(`krmf-trr-${context.projectId || 'all'}`, [
      { key: 'item_code', label: '항목코드' },
      { key: 'title', label: '항목' },
      { key: 'test_criteria', label: '시험기준' },
      { key: 'test_data', label: '시험데이터' },
      { key: 'evidence_ready', label: '증적준비상태' },
    ], items.map(item => ({
      item_code: item.item_code ?? '',
      title: item.title,
      test_criteria: item.test_criteria ?? '',
      test_data: item.test_data ?? '',
      evidence_ready: trrEvidenceReadyLabel(item.evidence_ready),
    })));
  };

  return (
    <SectionCard title="TRR 시험준비 체크리스트" compact>
      <KrmfQueryBoundary state={trrState}>
        {items => {
          if (!items.length)
            return (
              <EmptyState
                message="등록된 TRR 항목이 없습니다"
                description="시험준비 항목은 백엔드 등록 후 표시됩니다."
              />
            );
          return (
            <>
              <Box display="flex" justifyContent="space-between" marginBottom={1}>
                <Typography variant="body2" color="textSecondary">
                  변경된 행만 저장됩니다.
                </Typography>
                <Box display="flex" gridGap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GetAppIcon />}
                    onClick={() => handleExport(items)}
                  >
                    출력
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    disabled={saving || !Object.keys(drafts).length}
                    onClick={() => void handleSave(items)}
                  >
                    저장
                  </Button>
                </Box>
              </Box>
              {saveError ? (
                <Typography variant="body2" color="error" gutterBottom>
                  {saveError}
                </Typography>
              ) : null}
              {saveNotice ? (
                <Typography variant="body2" color="primary" gutterBottom>
                  {saveNotice}
                </Typography>
              ) : null}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>항목</TableCell>
                      <TableCell>시험기준</TableCell>
                      <TableCell>시험데이터</TableCell>
                      <TableCell>증적 준비 상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map(item => {
                      const draft = draftFor(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.item_code ? `${item.item_code} ` : ''}
                            {item.title}
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              multiline
                              rows={1}
                              value={draft.test_criteria}
                              onChange={event =>
                                setDraft(item, {
                                  test_criteria: event.target.value,
                                })
                              }
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              multiline
                              rows={1}
                              value={draft.test_data}
                              onChange={event =>
                                setDraft(item, {
                                  test_data: event.target.value,
                                })
                              }
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              select
                              size="small"
                              value={draft.evidence_ready ? 'ready' : 'not_ready'}
                              onChange={event =>
                                setDraft(item, {
                                  evidence_ready: event.target.value === 'ready',
                                })
                              }
                              style={{ minWidth: 120 }}
                            >
                              <MenuItem value="not_ready">미준비</MenuItem>
                              <MenuItem value="ready">준비 완료</MenuItem>
                            </TextField>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          );
        }}
      </KrmfQueryBoundary>
    </SectionCard>
  );
};
