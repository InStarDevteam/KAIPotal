import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { Proposal } from './types';
import { ProposalCategoryChip } from './ProposalCategoryChip';
import { ProposalStatusChip } from './ProposalStatusChip';

interface ProposalAdminReviewPanelProps {
  proposals: Proposal[];
  onActionMock?: (action: string, proposalId: string) => void;
}

export const ProposalAdminReviewPanel = ({
  proposals,
  onActionMock,
}: ProposalAdminReviewPanelProps) => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        관리자 검토
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>제목</TableCell>
              <TableCell>구분</TableCell>
              <TableCell>제안자</TableCell>
              <TableCell>공감</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>공지</TableCell>
              <TableCell>다음 조치</TableCell>
              <TableCell>조치</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {proposals.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.title}</TableCell>
                <TableCell>
                  <ProposalCategoryChip category={p.category} />
                </TableCell>
                <TableCell>{p.proposer}</TableCell>
                <TableCell>{p.likes}</TableCell>
                <TableCell>
                  <ProposalStatusChip status={p.status} />
                </TableCell>
                <TableCell>{p.isNoticed ? '예' : '아니오'}</TableCell>
                <TableCell>{p.nextAction || '-'}</TableCell>
                <TableCell>
                  <Box display="flex" style={{ gap: 4 }} flexWrap="wrap">
                    <Button size="small" variant="outlined" onClick={() => onActionMock?.('검토 시작', p.id)}>
                      검토 시작
                    </Button>
                    <Button size="small" variant="outlined" color="primary" onClick={() => onActionMock?.('공지 승인', p.id)}>
                      공지 승인
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => onActionMock?.('보완 요청', p.id)}>
                      보완 요청
                    </Button>
                    <Button size="small" variant="outlined" color="secondary" onClick={() => onActionMock?.('반려', p.id)}>
                      반려
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => onActionMock?.('진행 검토', p.id)}>
                      진행 검토
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
