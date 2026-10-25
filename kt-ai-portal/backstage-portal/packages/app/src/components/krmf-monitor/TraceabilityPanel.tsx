import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import GetAppIcon from '@material-ui/icons/GetApp';
import { EmptyState, SectionCard, StatusChip } from '../common';
import {
  downloadKrmfExportCsv,
  getKrmfTraceability,
  saveBlob,
} from './krmfApi';
import { KrmfErrorPanel, KrmfLoading } from './KrmfQueryView';
import { KrmfTabContext } from './KrmfMonitorPage';
import { useKrmfQuery } from './useKrmfQuery';

export const TraceabilityPanel = ({ context }: { context: KrmfTabContext }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const traceabilityState = useKrmfQuery(() => {
    if (!context.baselineId) return Promise.resolve(null);
    return getKrmfTraceability(context.request, context.baselineId);
  }, [context.tenantId, context.baselineId]);

  const handleExport = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const result = await downloadKrmfExportCsv(
        context.rawDeps,
        context.tenantId,
        'traceability',
        context.baselineId || undefined,
      );
      saveBlob(result.blob, result.filename);
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : '추적표 출력에 실패했습니다.',
      );
    } finally {
      setDownloading(false);
    }
  };

  if (!context.baselineId)
    return (
      <SectionCard title="추적성 (요구 ↔ 통제 ↔ 구현 ↔ 시험)" compact>
        <EmptyState
          message="기준선을 선택하세요"
          description="기준선을 선택하면 요구↔통제↔구현↔시험 연결 상태가 표시됩니다."
        />
      </SectionCard>
    );

  return (
    <SectionCard title="추적성 (요구 ↔ 통제 ↔ 구현 ↔ 시험)" compact>
      <Box display="flex" justifyContent="flex-end" marginBottom={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GetAppIcon />}
          disabled={downloading}
          onClick={() => void handleExport()}
        >
          추적표 출력
        </Button>
      </Box>
      {downloadError ? (
        <Typography variant="body2" color="error" gutterBottom>
          {downloadError}
        </Typography>
      ) : null}
      {traceabilityState.loading && <KrmfLoading />}
      {!traceabilityState.loading && traceabilityState.error && (
        <KrmfErrorPanel
          error={traceabilityState.error}
          onRetry={traceabilityState.reload}
        />
      )}
      {!traceabilityState.loading &&
        !traceabilityState.error &&
        traceabilityState.data && (
          <>
            {traceabilityState.data.missing.length > 0 ? (
              <Typography variant="body2" color="error" gutterBottom>
                미연결 요구 {traceabilityState.data.missing.length}건이
                있습니다.
              </Typography>
            ) : null}
            {traceabilityState.data.controls.length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>통제코드</TableCell>
                      <TableCell>제목</TableCell>
                      <TableCell>연결</TableCell>
                      <TableCell>추적 상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {traceabilityState.data.controls.map(control => (
                      <TableRow key={control.id}>
                        <TableCell>{control.control_code}</TableCell>
                        <TableCell>{control.title}</TableCell>
                        <TableCell>{control.links.length}</TableCell>
                        <TableCell>
                          {control.unresolved ? (
                            <StatusChip tone="error" label="미연결" />
                          ) : (
                            <StatusChip tone="success" label="연결됨" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyState
                message="추적성 데이터가 없습니다"
                description="선택한 기준선의 통제 연결 정보가 아직 등록되지 않았습니다."
              />
            )}
          </>
        )}
    </SectionCard>
  );
};
