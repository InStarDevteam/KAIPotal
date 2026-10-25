import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MenuItem from '@material-ui/core/MenuItem';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import GetAppIcon from '@material-ui/icons/GetApp';
import { EmptyState, SectionCard, StatusChip } from '../common';
import {
  KrmfControl,
  downloadKrmfExportCsv,
  getKrmfControlDetail,
  getKrmfControls,
  saveBlob,
} from './krmfApi';
import {
  APPLICABILITY_LABELS,
  CONTROL_STATUS_LABELS,
  applicabilityLabel,
  controlStatusLabel,
  formatDate,
} from './krmfLabels';
import { KrmfQueryBoundary, KrmfErrorPanel } from './KrmfQueryView';
import { KrmfTabContext } from './KrmfMonitorPage';
import { useKrmfQuery } from './useKrmfQuery';

const PAGE_SIZE = 10;

const applicabilityTone = (value: string) => {
  if (value === 'applied') return 'success' as const;
  if (value === 'alternative') return 'warning' as const;
  return 'neutral' as const;
};

export const KrmfStatusTab = ({ context }: { context: KrmfTabContext }) => {
  const [applicability, setApplicability] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const controlsState = useKrmfQuery<KrmfControl[]>(() => {
    if (!context.baselineId) return Promise.resolve([] as KrmfControl[]);
    return getKrmfControls(context.request, context.baselineId, {
      applicability: applicability || undefined,
      status: status || undefined,
    });
  }, [context.tenantId, context.baselineId, applicability, status]);

  const detailState = useKrmfQuery(() => {
    if (!selectedId) return Promise.resolve(null);
    return getKrmfControlDetail(context.request, selectedId);
  }, [context.tenantId, selectedId]);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const result = await downloadKrmfExportCsv(
        context.rawDeps,
        context.tenantId,
        'implementation',
        context.baselineId || undefined,
      );
      saveBlob(result.blob, result.filename);
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : '다운로드에 실패했습니다.',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SectionCard title="통제 이행 현황" compact data-testid="krmf-status-tab">
      <Box
        display="flex"
        justifyContent="space-between"
        flexWrap="wrap"
        gridGap={1}
        marginBottom={1}
      >
        <Box display="flex" gridGap={1} flexWrap="wrap">
          <TextField
            select
            size="small"
            label="적용성"
            value={applicability}
            onChange={event => {
              setApplicability(event.target.value);
              setPage(0);
            }}
            style={{ minWidth: 140 }}
          >
            <MenuItem value="">전체</MenuItem>
            {Object.entries(APPLICABILITY_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="상태"
            value={status}
            onChange={event => {
              setStatus(event.target.value);
              setPage(0);
            }}
            style={{ minWidth: 160 }}
          >
            <MenuItem value="">전체</MenuItem>
            {Object.entries(CONTROL_STATUS_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GetAppIcon />}
          disabled={downloading}
          onClick={() => void handleDownload()}
        >
          현황 다운로드
        </Button>
      </Box>
      {downloadError ? (
        <Typography variant="body2" color="error" gutterBottom>
          {downloadError}
        </Typography>
      ) : null}
      {!context.baselineId ? (
        <EmptyState
          message="기준선을 선택하세요"
          description="상단 필터에서 기준선을 선택하면 통제 목록이 표시됩니다."
        />
      ) : (
        <KrmfQueryBoundary state={controlsState}>
          {controls => {
            if (!controls.length)
              return (
                <EmptyState
                  message="표시할 통제가 없습니다"
                  description="담당·소속 프로젝트의 통제만 조회됩니다. 필터 조건을 확인하세요."
                />
              );
            const paged = controls.slice(
              page * PAGE_SIZE,
              page * PAGE_SIZE + PAGE_SIZE,
            );
            return (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>통제코드</TableCell>
                        <TableCell>제목</TableCell>
                        <TableCell>적용성</TableCell>
                        <TableCell>담당</TableCell>
                        <TableCell>기한</TableCell>
                        <TableCell>상태</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paged.map(control => (
                        <TableRow
                          key={control.id}
                          hover
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedId(control.id)}
                        >
                          <TableCell>{control.control_code}</TableCell>
                          <TableCell>{control.title}</TableCell>
                          <TableCell>
                            <StatusChip
                              tone={applicabilityTone(control.applicability)}
                              label={applicabilityLabel(control.applicability)}
                            />
                          </TableCell>
                          <TableCell>
                            {control.owner_name || control.owner_id || '—'}
                          </TableCell>
                          <TableCell>{formatDate(control.due_date)}</TableCell>
                          <TableCell>
                            <StatusChip
                              tone="info"
                              label={controlStatusLabel(control.status)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={controls.length}
                  page={page}
                  onPageChange={(_, next) => setPage(next)}
                  rowsPerPage={PAGE_SIZE}
                  rowsPerPageOptions={[PAGE_SIZE]}
                  labelRowsPerPage="페이지당 행"
                />
              </>
            );
          }}
        </KrmfQueryBoundary>
      )}

      <Dialog
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>통제 상세</DialogTitle>
        <DialogContent>
          {selectedId && !detailState.loading && detailState.error && (
            <KrmfErrorPanel
              error={detailState.error}
              onRetry={detailState.reload}
            />
          )}
          {selectedId &&
            !detailState.loading &&
            !detailState.error &&
            detailState.data && (
              <Box display="flex" flexDirection="column" gridGap={2}>
                <Box>
                  <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                    {detailState.data.control_code} {detailState.data.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    적용성 {applicabilityLabel(detailState.data.applicability)}{' '}
                    · 상태 {controlStatusLabel(detailState.data.status)} · 담당{' '}
                    {detailState.data.owner_name ||
                      detailState.data.owner_id ||
                      '—'}{' '}
                    · 기한 {formatDate(detailState.data.due_date)}
                  </Typography>
                  {detailState.data.description ? (
                    <Typography variant="body2">
                      {detailState.data.description}
                    </Typography>
                  ) : null}
                </Box>
                <Box>
                  <Typography variant="subtitle2">최신 증적</Typography>
                  {detailState.data.evidences.length ? (
                    detailState.data.evidences
                      .slice()
                      .sort((a, b) => b.version - a.version)
                      .slice(0, 3)
                      .map(evidence => (
                        <Typography key={evidence.id} variant="body2">
                          v{evidence.version} {evidence.title} (
                          {evidence.review_status})
                        </Typography>
                      ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      등록된 증적이 없습니다.
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2">조치</Typography>
                  {detailState.data.actions.length ? (
                    detailState.data.actions.map(action => (
                      <Typography key={action.id} variant="body2">
                        {action.title} ({action.status})
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      등록된 조치가 없습니다.
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2">연결 변경</Typography>
                  {detailState.data.changes.length ? (
                    detailState.data.changes.map(change => (
                      <Typography key={change.id} variant="body2">
                        {change.title}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      연결된 변경이 없습니다.
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
};
