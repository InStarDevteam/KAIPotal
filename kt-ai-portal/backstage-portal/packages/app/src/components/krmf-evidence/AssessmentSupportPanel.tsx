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
import {
  KrmfAssessment,
  Evidence,
  AssessmentResult,
  AuthorizationStatus,
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_RESULT_LABELS,
  AUTHORIZATION_STATUS_LABELS,
} from './types';

const resultChipColor = (
  result: AssessmentResult,
): 'primary' | 'secondary' | 'default' => {
  if (result === 'conforming') return 'primary';
  if (result === 'nonconforming') return 'secondary';
  return 'default';
};

const authorizationChipColor = (
  status: AuthorizationStatus,
): 'primary' | 'secondary' | 'default' => {
  if (status === 'authorized') return 'primary';
  if (status === 'rejected') return 'secondary';
  return 'default';
};

export const AssessmentSupportPanel = ({
  assessments,
  evidences,
}: {
  assessments: KrmfAssessment[];
  evidences: Evidence[];
}) => {
  const submitted = evidences.filter(e => e.status !== 'not_submitted');
  const approved = submitted.filter(e => e.status === 'approved');
  const readiness = submitted.length
    ? Math.round((approved.length / submitted.length) * 100)
    : 0;
  const latestPackage =
    assessments.length > 0
      ? assessments[assessments.length - 1].packageVersion
      : '-';

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h6" gutterBottom>
        평가·인가 지원
      </Typography>

      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                평가자료 패키지
              </Typography>
              <Typography variant="h5">{latestPackage}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                증적 준비율 (승인/제출)
              </Typography>
              <Typography variant="h5">
                {readiness}% ({approved.length}/{submitted.length})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                미해결 평가 이슈
              </Typography>
              <Typography variant="h5">
                {assessments.reduce((sum, a) => sum + a.unresolvedIssueCount, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography
        variant="body2"
        color="textSecondary"
        style={{ marginBottom: 12 }}
      >
        평가·인가의 최종 판단은 소요기관 권한입니다. 본 화면은 판단 지원을 위한
        현황만 제공합니다.
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>프로젝트</TableCell>
              <TableCell>평가유형</TableCell>
              <TableCell>예정일</TableCell>
              <TableCell>평가결과</TableCell>
              <TableCell>인가상태</TableCell>
              <TableCell>판단권한</TableCell>
              <TableCell>평가의견</TableCell>
              <TableCell>미해결 이슈</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assessments.map(assessment => (
              <TableRow key={assessment.id} hover>
                <TableCell>{assessment.id}</TableCell>
                <TableCell>{assessment.projectId}</TableCell>
                <TableCell>
                  {ASSESSMENT_TYPE_LABELS[assessment.assessmentType]}
                </TableCell>
                <TableCell>
                  {new Date(assessment.scheduledAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={resultChipColor(assessment.result)}
                    label={ASSESSMENT_RESULT_LABELS[assessment.result]}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={authorizationChipColor(
                      assessment.authorizationStatus,
                    )}
                    label={
                      AUTHORIZATION_STATUS_LABELS[
                        assessment.authorizationStatus
                      ]
                    }
                  />
                </TableCell>
                <TableCell>{assessment.decisionAuthority}</TableCell>
                <TableCell>{assessment.opinionCount}</TableCell>
                <TableCell>{assessment.unresolvedIssueCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
