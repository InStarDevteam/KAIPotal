import { useState } from 'react';
import Grid from '@material-ui/core/Grid';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { EmptyState, SectionCard } from '../common';
import { KrmfControl, getKrmfControls } from './krmfApi';
import { applicabilityLabel } from './krmfLabels';
import { KrmfQueryBoundary } from './KrmfQueryView';
import { EvidencePanel } from './EvidencePanel';
import { TraceabilityPanel } from './TraceabilityPanel';
import { TrrPanel } from './TrrPanel';
import { KrmfTabContext } from './KrmfMonitorPage';
import { useKrmfQuery } from './useKrmfQuery';

export const KrmfEvidenceTab = ({ context }: { context: KrmfTabContext }) => {
  const [selectedControlId, setSelectedControlId] = useState('');

  const controlsState = useKrmfQuery<KrmfControl[]>(() => {
    if (!context.baselineId) return Promise.resolve([] as KrmfControl[]);
    return getKrmfControls(context.request, context.baselineId);
  }, [context.tenantId, context.baselineId]);

  const effectiveControlId = controlsState.data?.some(
    control => control.id === selectedControlId,
  )
    ? selectedControlId
    : '';

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <SectionCard title="통제 목록" compact data-testid="krmf-control-list">
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
                      description="담당·소속 프로젝트의 통제만 조회됩니다."
                    />
                  );
                return (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>코드</TableCell>
                          <TableCell>제목</TableCell>
                          <TableCell>적용성</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {controls.map(control => (
                          <TableRow
                            key={control.id}
                            hover
                            selected={control.id === effectiveControlId}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedControlId(control.id)}
                          >
                            <TableCell>{control.control_code}</TableCell>
                            <TableCell>{control.title}</TableCell>
                            <TableCell>
                              {applicabilityLabel(control.applicability)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                );
              }}
            </KrmfQueryBoundary>
          )}
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={7}>
        {effectiveControlId ? (
          <EvidencePanel context={context} controlId={effectiveControlId} />
        ) : (
          <SectionCard title="증적" compact>
            <EmptyState
              message="통제를 선택하세요"
              description="통제를 선택하면 증적 등록·검토·다운로드가 가능합니다."
            />
          </SectionCard>
        )}
      </Grid>
      <Grid item xs={12}>
        <TraceabilityPanel context={context} />
      </Grid>
      <Grid item xs={12}>
        <TrrPanel context={context} />
      </Grid>
    </Grid>
  );
};
