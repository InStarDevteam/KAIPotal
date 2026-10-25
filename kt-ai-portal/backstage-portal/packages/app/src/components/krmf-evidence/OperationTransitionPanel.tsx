import { useState, useMemo } from 'react';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Chip from '@material-ui/core/Chip';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import {
  KrmfOperationalTransition,
  KrmfChangeImpact,
  ChangeImpactStatus,
  HANDOVER_STATUS_LABELS,
  CHANGE_TYPE_LABELS,
  CHANGE_IMPACT_STATUS_LABELS,
  RISK_LEVEL_LABELS,
} from './types';
import { RiskSeverityChip } from './RiskSeverityChip';

const changeStatusChipColor = (
  status: ChangeImpactStatus,
): 'primary' | 'secondary' | 'default' => {
  if (status === 'verified') return 'primary';
  if (status === 'rejected') return 'secondary';
  return 'default';
};

// 재평가 필요 여부 표현: 사유가 소요기관 판단 영역이면 '소요기관 판단 필요',
// 그 외 재평가가 필요한 변경은 '검토 필요'로만 표시하고 최종 판정은 확정하지 않는다.
const reassessmentBadge = (impact: KrmfChangeImpact): string | null => {
  if (!impact.reassessmentRequired) return null;
  if (impact.reassessmentReason?.includes('소요기관')) {
    return '소요기관 판단 필요';
  }
  return '검토 필요';
};

export const OperationTransitionPanel = ({
  transitions,
  changeImpacts,
}: {
  transitions: KrmfOperationalTransition[];
  changeImpacts: KrmfChangeImpact[];
}) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return changeImpacts.filter(
      impact => typeFilter === 'all' || impact.changeType === typeFilter,
    );
  }, [changeImpacts, typeFilter]);

  return (
    <div>
      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        {transitions.map(transition => (
          <Grid item xs={12} md={4} key={transition.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {transition.projectId} 운영전환 준비
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  인수인계
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {HANDOVER_STATUS_LABELS[transition.handoverStatus]}
                  {transition.authorizationRef
                    ? ` (인가근거: ${transition.authorizationRef})`
                    : ''}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  지속점검 계획
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {transition.monitoringPlanStatus}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  백업·복구
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {transition.backupRecoveryStatus}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  연락체계 이관
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {transition.contactTransferStatus}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  정기점검일: {transition.periodicReviewDate}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper style={{ padding: 24 }}>
        <Typography variant="h6" gutterBottom>
          변경영향 추적
        </Typography>
        <Grid container spacing={2} style={{ marginBottom: 16 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="변경유형"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              variant="outlined"
              size="small"
            >
              <MenuItem value="all">전체</MenuItem>
              {Object.entries(CHANGE_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>요청일</TableCell>
                <TableCell>요청자</TableCell>
                <TableCell>변경유형</TableCell>
                <TableCell>대상 시스템</TableCell>
                <TableCell>영향 통제항목 수</TableCell>
                <TableCell>위험도</TableCell>
                <TableCell>재평가 필요</TableCell>
                <TableCell>검토자</TableCell>
                <TableCell>상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(impact => {
                const badge = reassessmentBadge(impact);
                return (
                  <TableRow key={impact.id} hover>
                    <TableCell>{impact.id}</TableCell>
                    <TableCell>
                      {new Date(impact.requestedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{impact.requester}</TableCell>
                    <TableCell>{CHANGE_TYPE_LABELS[impact.changeType]}</TableCell>
                    <TableCell>{impact.targetSystems.join(', ')}</TableCell>
                    <TableCell>{impact.affectedControlIds.length}</TableCell>
                    <TableCell>
                      <RiskSeverityChip severity={impact.riskLevel} />
                    </TableCell>
                    <TableCell>
                      {badge ? (
                        <Chip
                          size="small"
                          color={
                            badge === '소요기관 판단 필요'
                              ? 'secondary'
                              : 'primary'
                          }
                          label={badge}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{impact.reviewer}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={changeStatusChipColor(impact.status)}
                        label={CHANGE_IMPACT_STATUS_LABELS[impact.status]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography
          variant="caption"
          color="textSecondary"
          style={{ display: 'block', marginTop: 8 }}
        >
          위험도 기준: {Object.values(RISK_LEVEL_LABELS).join(' / ')}. 재평가
          필요 여부의 최종 판정은 소요기관 권한입니다.
        </Typography>
      </Paper>
    </div>
  );
};
