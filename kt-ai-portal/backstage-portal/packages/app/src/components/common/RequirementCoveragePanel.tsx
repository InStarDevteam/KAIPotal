import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';

export interface RequirementCoverageItem {
  id: string;
  category: string;
  requirement: string;
  priority: '필수' | '권장' | '선택';
  status: '완료' | '진행중' | '대기' | '해당없음';
  note?: string;
}

interface RequirementCoveragePanelProps {
  title: string;
  items: RequirementCoverageItem[];
}

const statusColor: Record<RequirementCoverageItem['status'], string> = {
  완료: '#2e7d32',
  진행중: '#ed6c02',
  대기: '#757575',
  해당없음: '#9e9e9e',
};

const priorityColor: Record<RequirementCoverageItem['priority'], string> = {
  필수: '#d32f2f',
  권장: '#ed6c02',
  선택: '#757575',
};

export const RequirementCoveragePanel = ({ title, items }: RequirementCoveragePanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        {title}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>분류</TableCell>
              <TableCell>기능</TableCell>
              <TableCell>우선순위</TableCell>
              <TableCell>준비 상태</TableCell>
              <TableCell>비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.requirement}</TableCell>
                <TableCell>
                  <Typography
                    component="span"
                    style={{
                      color: priorityColor[item.priority],
                      fontWeight: 600,
                    }}
                  >
                    {item.priority}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    component="span"
                    style={{
                      color: statusColor[item.status],
                      fontWeight: 600,
                    }}
                  >
                    {item.status}
                  </Typography>
                </TableCell>
                <TableCell>{item.note ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
