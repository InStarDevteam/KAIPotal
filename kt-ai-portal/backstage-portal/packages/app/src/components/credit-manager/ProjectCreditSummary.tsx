import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { ProjectCredit } from './types';
import { CreditStatusChip } from './CreditStatusChip';

export const ProjectCreditSummary = ({
  credits,
  selectedId,
  onSelect,
}: {
  credits: ProjectCredit[];
  selectedId?: string;
  onSelect: (credit: ProjectCredit) => void;
}) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>프로젝트 ID</TableCell>
            <TableCell>프로젝트명</TableCell>
            <TableCell>소유 조직</TableCell>
            <TableCell>PM</TableCell>
            <TableCell>총 부여</TableCell>
            <TableCell>사용</TableCell>
            <TableCell>잔여</TableCell>
            <TableCell>사용률</TableCell>
            <TableCell>예상 사용 기간</TableCell>
            <TableCell>상태</TableCell>
            <TableCell>최근 사용일</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {credits.map(c => (
            <TableRow
              key={c.projectId}
              hover
              selected={selectedId === c.projectId}
              onClick={() => onSelect(c)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell>{c.projectId}</TableCell>
              <TableCell>{c.projectName}</TableCell>
              <TableCell>{c.ownerOrganization}</TableCell>
              <TableCell>{c.pm}</TableCell>
              <TableCell>{c.totalCredits.toLocaleString()}</TableCell>
              <TableCell>{c.usedCredits.toLocaleString()}</TableCell>
              <TableCell>{c.remainingCredits.toLocaleString()}</TableCell>
              <TableCell>{c.usageRate}%</TableCell>
              <TableCell>{c.estimatedDays}일</TableCell>
              <TableCell>
                <CreditStatusChip status={c.status} />
              </TableCell>
              <TableCell>{new Date(c.lastUsedAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
