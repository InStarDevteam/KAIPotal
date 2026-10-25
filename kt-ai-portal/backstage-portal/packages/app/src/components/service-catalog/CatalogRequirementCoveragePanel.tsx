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
    requirementId: '73',
    requirement: '분석 프레임워크 선택',
    screen: 'Service Catalog > 분석 프레임워크',
    status: '구현',
    note: '목록/상세/선택 UI',
  },
  {
    requirementId: '74',
    requirement: '개발도구 선택',
    screen: 'Service Catalog > 개발도구',
    status: '구현',
    note: '목록/상세/선택 UI',
  },
  {
    requirementId: '75',
    requirement: '데이터 도구 선택',
    screen: 'Service Catalog > 데이터 도구',
    status: '구현',
    note: '목록/상세/선택 UI',
  },
  {
    requirementId: '76',
    requirement: '시각화 도구 선택',
    screen: 'Service Catalog > 시각화 도구',
    status: '구현',
    note: '목록/상세/선택 UI',
  },
  {
    requirementId: '77',
    requirement: '라벨링 도구 선택',
    screen: 'Service Catalog > 라벨링 도구',
    status: '구현',
    note: '목록/상세/선택 UI',
  },
  {
    requirementId: '78',
    requirement: '직접 입력',
    screen: 'Service Catalog > 직접 입력 요청',
    status: '구현',
    note: '입력 폼',
  },
  {
    requirementId: '79',
    requirement: '카탈로그 선택',
    screen: 'Service Catalog > 도구 선택 패널',
    status: '구현',
    note: '선택/신청서',
  },
];

export const CatalogRequirementCoveragePanel = () => {
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Typography variant="h6" style={{ fontWeight: 600 }} gutterBottom>
        카탈로그 기능 안내
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
          실제 OpenMetadata/Docker Registry/PyPI Mirror 연동은 후속 단계에서 진행합니다.
        </Typography>
      </Box>
    </Paper>
  );
};
