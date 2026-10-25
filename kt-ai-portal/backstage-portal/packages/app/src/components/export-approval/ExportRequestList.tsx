import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Chip from '@material-ui/core/Chip';
import { ExportRequest } from './types';
import { ExportStatusChip } from './ExportStatusChip';
import { ExportTargetTypeChip } from './ExportTargetTypeChip';

const directionLabel: Record<string, string> = {
  export: '반출',
  import: '반입',
};

export const ExportRequestList = ({
  requests,
  selectedId,
  onSelect,
}: {
  requests: ExportRequest[];
  selectedId?: string;
  onSelect: (request: ExportRequest) => void;
}) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>구분</TableCell>
            <TableCell>대상 유형</TableCell>
            <TableCell>대상명</TableCell>
            <TableCell>신청자</TableCell>
            <TableCell>소속</TableCell>
            <TableCell>관련 프로젝트</TableCell>
            <TableCell>보안등급</TableCell>
            <TableCell>상태</TableCell>
            <TableCell>신청일</TableCell>
            <TableCell>승인자</TableCell>
            <TableCell>다운로드</TableCell>
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
              <TableCell>{request.id}</TableCell>
              <TableCell>{directionLabel[request.direction]}</TableCell>
              <TableCell>
                <ExportTargetTypeChip targetType={request.targetType} />
              </TableCell>
              <TableCell>{request.targetName}</TableCell>
              <TableCell>{request.requester}</TableCell>
              <TableCell>{request.requesterOrg}</TableCell>
              <TableCell>{request.projectName}</TableCell>
              <TableCell>{request.securityLevel}</TableCell>
              <TableCell>
                <ExportStatusChip
                  status={request.status}
                  demoPending={request.demoPending}
                />
              </TableCell>
              <TableCell>{new Date(request.requestedAt).toLocaleDateString()}</TableCell>
              <TableCell>{request.approver || '-'}</TableCell>
              <TableCell>
                <Chip size="small" label={request.downloadable ? '가능' : '불가'} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
