import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { AuditLog } from './types';

interface AuditLogDashboardProps {
  logs: AuditLog[];
}

export const AuditLogDashboard = ({ logs }: AuditLogDashboardProps) => {
  const today = '2026-06-30';
  const todayLogs = logs.filter(l => l.timestamp.startsWith(today));

  const loginSuccess = todayLogs.filter(l => l.eventType === '로그인' && l.result === '성공').length;
  const loginFailure = todayLogs.filter(l => l.eventType === '로그인 실패').length;
  const blocked = todayLogs.filter(l => l.eventType === '계정 차단' || l.result === '차단').length;
  const passwordChanges = todayLogs.filter(l => l.eventType === '비밀번호 변경').length;
  const userInfoChanges = todayLogs.filter(l => l.eventType === '사용자 정보 수정').length;
  const permissionChanges = todayLogs.filter(l => l.eventType === '권한 변경').length;
  const policyChanges = todayLogs.filter(
    l => l.eventType === '로그인 정책 변경' || l.eventType === '비밀번호 정책 변경' || l.eventType === '관리자 정책 변경'
  ).length;
  const exportApprovals = todayLogs.filter(l => l.eventType === '반출 승인').length;
  const highRisk = todayLogs.filter(l => l.riskLevel === '높음' || l.riskLevel === '심각').length;

  const cards = [
    { label: '오늘 로그인 성공', value: loginSuccess },
    { label: '오늘 로그인 실패', value: loginFailure },
    { label: '차단 계정 수', value: blocked },
    { label: '비밀번호 변경', value: passwordChanges },
    { label: '사용자 정보 수정', value: userInfoChanges },
    { label: '권한 변경', value: permissionChanges },
    { label: '정책 변경', value: policyChanges },
    { label: '반출 승인 이벤트', value: exportApprovals },
    { label: '고위험 이벤트', value: highRisk },
  ];

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        감사로그 대시보드
      </Typography>
      <Grid container spacing={2}>
        {cards.map(card => (
          <Grid item xs={6} sm={4} md={3} key={card.label}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="textSecondary">
                  {card.label}
                </Typography>
                <Typography variant="h4" style={{ fontWeight: 700, marginTop: 4 }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
