import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Chip from '@material-ui/core/Chip';
import {
  TransferRequestRow,
  TRANSFER_GRADE_LABELS,
  TRANSFER_KIND_LABELS,
  TRANSFER_STATUS_LABELS,
  TRANSFER_SUBJECT_LABELS,
} from './transferServerData';

export const TransferServerList = ({
  requests,
  selectedId,
  onSelect,
}: {
  requests: TransferRequestRow[];
  selectedId?: string;
  onSelect: (request: TransferRequestRow) => void;
}) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>구분</TableCell>
            <TableCell>대상 유형</TableCell>
            <TableCell>제목</TableCell>
            <TableCell>보안등급</TableCell>
            <TableCell>상태</TableCell>
            <TableCell>신청일</TableCell>
            <TableCell>신청자</TableCell>
            <TableCell>승인 파일 버전</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.map(request => (
            <TableRow
              key={request.id}
              hover
              selected={selectedId === request.id}
              onClick={() => onSelect(request)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell>{TRANSFER_KIND_LABELS[request.kind] ?? request.kind}</TableCell>
              <TableCell>
                {TRANSFER_SUBJECT_LABELS[request.subject_type] ?? request.subject_type}
              </TableCell>
              <TableCell>{request.title}</TableCell>
              <TableCell>
                {TRANSFER_GRADE_LABELS[request.security_grade] ?? request.security_grade}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={TRANSFER_STATUS_LABELS[request.status] ?? request.status}
                />
              </TableCell>
              <TableCell>
                {new Date(request.requested_at).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell>{request.requested_by}</TableCell>
              <TableCell>
                {request.approved_file_version !== null
                  ? `v${request.approved_file_version}`
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
