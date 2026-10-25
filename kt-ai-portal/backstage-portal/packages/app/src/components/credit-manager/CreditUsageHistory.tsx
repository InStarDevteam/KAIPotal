import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { UsageHistory, ResourceType } from './types';

const resourceLabels: Record<ResourceType, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  memory: 'Memory',
  storage: 'Storage',
  network: 'Network',
  notebook: 'Notebook',
  training_job: 'Training Job',
  inference_api: 'Inference API',
};

export const CreditUsageHistory = ({ history }: { history: UsageHistory[] }) => {
  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        크레딧 사용 이력
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>프로젝트</TableCell>
              <TableCell>사용 일시</TableCell>
              <TableCell>자원 유형</TableCell>
              <TableCell>사용량</TableCell>
              <TableCell>차감 크레딧</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>작업명</TableCell>
              <TableCell>비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.projectName}</TableCell>
                <TableCell>{new Date(row.usedAt).toLocaleString()}</TableCell>
                <TableCell>{resourceLabels[row.resourceType]}</TableCell>
                <TableCell>{row.amount}</TableCell>
                <TableCell>{row.deductedCredits.toLocaleString()}</TableCell>
                <TableCell>{row.user}</TableCell>
                <TableCell>{row.jobName}</TableCell>
                <TableCell>{row.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
