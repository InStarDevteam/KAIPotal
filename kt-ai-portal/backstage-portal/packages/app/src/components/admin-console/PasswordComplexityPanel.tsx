import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { PasswordPolicy } from './types';

interface PasswordComplexityPanelProps {
  policies: PasswordPolicy[];
}

export const PasswordComplexityPanel = ({ policies }: PasswordComplexityPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        비밀번호 복잡도 정책
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>정책명</TableCell>
              <TableCell align="right">최소 길이</TableCell>
              <TableCell align="center">대문자</TableCell>
              <TableCell align="center">소문자</TableCell>
              <TableCell align="center">숫자</TableCell>
              <TableCell align="center">특수문자</TableCell>
              <TableCell align="center">사용자 ID 금지</TableCell>
              <TableCell align="right">재사용 제한</TableCell>
              <TableCell>적용 대상</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.minLength}자</TableCell>
                <TableCell align="center">
                  <Switch checked={row.requireUppercase} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.requireLowercase} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.requireNumber} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.requireSpecialChar} size="small" disabled />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={row.forbidUserId} size="small" disabled />
                </TableCell>
                <TableCell align="right">{row.reuseLimit}개</TableCell>
                <TableCell>{row.target}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
