import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import ThumbUpAltIcon from '@material-ui/icons/ThumbUpAlt';
import CommentIcon from '@material-ui/icons/Comment';
import { Proposal } from './types';
import { ProposalCategoryChip } from './ProposalCategoryChip';
import { ProposalStatusChip } from './ProposalStatusChip';

interface ProposalListProps {
  proposals: Proposal[];
  selectedProposal: Proposal | null;
  onSelect: (proposal: Proposal) => void;
}

export const ProposalList = ({
  proposals,
  selectedProposal,
  onSelect,
}: ProposalListProps) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>제목</TableCell>
            <TableCell>구분</TableCell>
            <TableCell>제안자</TableCell>
            <TableCell>소속</TableCell>
            <TableCell>공감</TableCell>
            <TableCell>댓글</TableCell>
            <TableCell>상태</TableCell>
            <TableCell>공지</TableCell>
            <TableCell>등록일</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {proposals.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} align="center">
                <Box padding={2}>
                  <Typography color="textSecondary">제안이 없습니다.</Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
          {proposals.map(p => (
            <TableRow
              key={p.id}
              selected={selectedProposal?.id === p.id}
              onClick={() => onSelect(p)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell>{p.id}</TableCell>
              <TableCell>{p.title}</TableCell>
              <TableCell>
                <ProposalCategoryChip category={p.category} />
              </TableCell>
              <TableCell>{p.proposer}</TableCell>
              <TableCell>{p.organization}</TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                  <ThumbUpAltIcon fontSize="small" color="action" />
                  {p.likes}
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                  <CommentIcon fontSize="small" color="action" />
                  {p.comments.length}
                </Box>
              </TableCell>
              <TableCell>
                <ProposalStatusChip status={p.status} />
              </TableCell>
              <TableCell>{p.isNoticed ? '예' : '아니오'}</TableCell>
              <TableCell>{p.registeredAt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
