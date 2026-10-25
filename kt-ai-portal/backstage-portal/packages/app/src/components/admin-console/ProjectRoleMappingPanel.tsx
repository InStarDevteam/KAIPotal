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
import { ProjectRoleMapping } from './types';

interface ProjectRoleMappingPanelProps {
  mappings: ProjectRoleMapping[];
}

export const ProjectRoleMappingPanel = ({ mappings }: ProjectRoleMappingPanelProps) => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        프로젝트별 역할 매핑
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>프로젝트명</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>프로젝트 역할</TableCell>
              <TableCell>워크스페이스 접근</TableCell>
              <TableCell>데이터 등급</TableCell>
              <TableCell>승인 권한</TableCell>
              <TableCell>리소스 관리</TableCell>
              <TableCell>유효기간</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mappings.map(row => (
              <TableRow key={row.id}>
                <TableCell style={{ fontWeight: 500 }}>{row.projectName}</TableCell>
                <TableCell>
                  {row.userName}
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {row.accountId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={row.projectRole} size="small" color="primary" />
                </TableCell>
                <TableCell>{row.workspaceAccess}</TableCell>
                <TableCell>{row.dataAccessLevel}</TableCell>
                <TableCell>
                  <Chip label={row.canApprove ? '있음' : '없음'} size="small" color={row.canApprove ? 'secondary' : 'default'} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.canManageResources ? '있음' : '없음'}
                    size="small"
                    color={row.canManageResources ? 'secondary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {row.validFrom} ~ {row.validUntil}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
