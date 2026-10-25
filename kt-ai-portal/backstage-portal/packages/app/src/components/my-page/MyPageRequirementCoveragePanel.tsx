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
  { requirementId: '119', requirement: '프로필 조회', screen: 'My Page > 프로필', status: '구현', note: '조회/수정' },
  { requirementId: '120', requirement: '프로필 수정', screen: 'My Page > 프로필', status: '구현', note: '저장' },
  { requirementId: '121', requirement: '이메일 확인', screen: 'My Page > 이메일 확인', status: '구현', note: '확인/변경' },
  { requirementId: '122', requirement: '비밀번호 변경', screen: 'My Page > 비밀번호 변경', status: '구현', note: '변경' },
  { requirementId: '123', requirement: '활성 세션 조회', screen: 'My Page > 활성 세션', status: '구현', note: '조회' },
  { requirementId: '124', requirement: '세션 강제 종료', screen: 'My Page > 활성 세션', status: '구현', note: '종료' },
  { requirementId: '125', requirement: '내 프로젝트 현황', screen: 'My Page > 내 프로젝트/워크스페이스', status: '구현', note: '현황' },
  { requirementId: '126', requirement: '자원 사용 이력', screen: 'My Page > 자원 사용 이력', status: '구현', note: '이력' },
  { requirementId: '127', requirement: '크레딧 사용 내역', screen: 'My Page > 크레딧 사용 내역', status: '구현', note: '내역' },
  { requirementId: '128', requirement: '알림 설정', screen: 'My Page > 알림 설정', status: '구현', note: '설정' },
  { requirementId: '129', requirement: '개인 API 키 관리', screen: 'My Page > 개인 API Key', status: '구현', note: '생성/폐기' },
  { requirementId: '130', requirement: '내 활동 로그', screen: 'My Page > 내 활동 로그', status: '구현', note: '로그' },
];

export const MyPageRequirementCoveragePanel = () => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        내 계정 기능 안내
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
          실제 Keycloak/DB/Notification/API Key Vault 연동은 후속 단계에서 진행합니다.
        </Typography>
      </Box>
    </Paper>
  );
};
