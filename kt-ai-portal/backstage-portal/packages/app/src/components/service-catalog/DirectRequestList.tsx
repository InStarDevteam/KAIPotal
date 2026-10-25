import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { DirectToolRequest, DirectRequestStatus } from './types';

interface DirectRequestListProps {
  requests: DirectToolRequest[];
}

const statusColor = (
  status: DirectRequestStatus,
): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case '승인':
    case '카탈로그 등록완료':
      return 'primary';
    case '반려':
      return 'secondary';
    default:
      return 'default';
  }
};

export const DirectRequestList = ({ requests }: DirectRequestListProps) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>도구명</TableCell>
            <TableCell>유형</TableCell>
            <TableCell>필요 버전</TableCell>
            <TableCell>관련 프로젝트</TableCell>
            <TableCell>요청자</TableCell>
            <TableCell>요청일</TableCell>
            <TableCell>상태</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Box padding={2}>
                  <Typography color="textSecondary">요청이 없습니다.</Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
          {requests.map(req => (
            <TableRow key={req.id}>
              <TableCell>{req.id}</TableCell>
              <TableCell>{req.toolName}</TableCell>
              <TableCell>{req.toolType}</TableCell>
              <TableCell>{req.requiredVersion}</TableCell>
              <TableCell>{req.relatedProject}</TableCell>
              <TableCell>{req.requester}</TableCell>
              <TableCell>{req.requestedAt}</TableCell>
              <TableCell>
                <Chip size="small" label={req.status} color={statusColor(req.status)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
