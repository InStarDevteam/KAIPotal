import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';

interface CoverageItem {
  requirementId: string;
  requirement: string;
  screen: string;
  status: '구현' | '부분 구현' | '미구현';
  note: string;
}

const coverage: CoverageItem[] = [
  {
    requirementId: '143',
    requirement: '제안 등록',
    screen: 'Proposal Board > 제안 등록',
    status: '구현',
    note: '등록 폼',
  },
  {
    requirementId: '144',
    requirement: '기본정보 입력',
    screen: 'Proposal Board > 제안 등록/상세',
    status: '구현',
    note: '입력/표시',
  },
  {
    requirementId: '145',
    requirement: '제안 구분',
    screen: 'Proposal Board > 제안 등록/목록/상세',
    status: '구현',
    note: '카테고리 Chip',
  },
  {
    requirementId: '146',
    requirement: '필요성 입력',
    screen: 'Proposal Board > 제안 등록/상세',
    status: '구현',
    note: '입력/표시',
  },
  {
    requirementId: '147',
    requirement: '활용 가능성 입력',
    screen: 'Proposal Board > 제안 등록/상세',
    status: '구현',
    note: '입력/표시',
  },
  {
    requirementId: '148',
    requirement: '공감 등록',
    screen: 'Proposal Board > 제안 상세',
    status: '구현',
    note: '좋아요/추천/관심',
  },
  {
    requirementId: '149',
    requirement: '제안 승인/공지',
    screen: 'Proposal Board > 관리자 검토',
    status: '구현',
    note: '관리자 버튼',
  },
];

export const ProposalRequirementCoveragePanel = () => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        제안 게시판 기능 안내
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>기능</TableCell>
              <TableCell>화면</TableCell>
              <TableCell>구현 상태</TableCell>
              <TableCell>비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coverage.map(item => (
              <TableRow key={item.requirementId}>
                <TableCell>{item.requirement}</TableCell>
                <TableCell>{item.screen}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box marginTop={2}>
        <Typography variant="body2" color="textSecondary">
          실제 Proposal DB/API, 알림, 첨부파일 저장소 연동은 후속 단계에서 진행합니다.
        </Typography>
      </Box>
    </Paper>
  );
};
