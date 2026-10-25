import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { RequirementCoverage } from './types';

interface AdminRequirementCoveragePanelProps {
  coverage: RequirementCoverage[];
}

export const AdminRequirementCoveragePanel = ({ coverage }: AdminRequirementCoveragePanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        관리 기능 안내
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>기능 영역</TableCell>
              <TableCell>화면 구현</TableCell>
              <TableCell>내부 로직</TableCell>
              <TableCell>후속 개발 필요사항</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coverage.map(row => (
              <TableRow key={row.area}>
                <TableCell style={{ fontWeight: 600 }}>{row.area}</TableCell>
                <TableCell>{row.screenImplemented}</TableCell>
                <TableCell>{row.logicImplemented}</TableCell>
                <TableCell>{row.followUp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
