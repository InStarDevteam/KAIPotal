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
import { AdminRole, PermissionLevel } from './types';

interface RolePermissionMatrixProps {
  roles: AdminRole[];
}

const resources = [
  'Portal Dashboard',
  'Integrated Search',
  'Project Workspace',
  'Export Approval',
  'Credit Manager',
  // 'K-RMF Evidence', // 기능 보류
  'Admin Console',
  'OpenMetadata',
  'OpenSearch Dashboards',
  'Keycloak Admin',
  'Project Approval',
  'Credit Approval',
  'User Approval',
  'Policy Management',
];

const matrix: Record<string, PermissionLevel> = {
  'portal-admin': '관리',
  'project-manager': '수정',
  developer: '수정',
  analyst: '조회',
  'external-user': '접근불가',
  'security-auditor': '조회',
  'data-steward': '수정',
  'cloud-operator': '관리',
};

const levelColor: Record<PermissionLevel, 'default' | 'primary' | 'secondary'> =
  {
    접근불가: 'default',
    조회: 'primary',
    신청: 'primary',
    수정: 'secondary',
    승인: 'secondary',
    관리: 'secondary',
  };

const getLevel = (roleName: string, resource: string): PermissionLevel => {
  if (roleName === 'portal-admin') return '관리';
  if (resource === 'Portal Dashboard' || resource === 'Integrated Search') {
    return matrix[roleName] === '접근불가' ? '접근불가' : '조회';
  }
  if (resource === 'Project Workspace') {
    if (['project-manager', 'developer', 'analyst'].includes(roleName))
      return '수정';
    if (roleName === 'external-user') return '조회';
    if (roleName === 'security-auditor') return '조회';
    return '접근불가';
  }
  if (resource === 'Export Approval' || resource === 'Credit Approval') {
    if (['portal-admin', 'project-manager'].includes(roleName)) return '승인';
    if (roleName === 'developer') return '신청';
    return '접근불가';
  }
  if (resource === 'Credit Manager') {
    if (['portal-admin', 'project-manager', 'developer'].includes(roleName))
      return '수정';
    return '접근불가';
  }
  if (
    resource === 'Admin Console' ||
    resource === 'OpenSearch Dashboards' ||
    resource === 'Keycloak Admin'
  ) {
    if (roleName === 'portal-admin') return '관리';
    if (roleName === 'security-auditor') return '조회';
    return '접근불가';
  }
  if (resource === 'OpenMetadata') {
    if (['portal-admin', 'data-steward', 'project-manager'].includes(roleName))
      return '수정';
    return '접근불가';
  }
  if (resource === 'Project Approval') {
    if (roleName === 'portal-admin') return '승인';
    if (roleName === 'project-manager') return '신청';
    return '접근불가';
  }
  if (resource === 'User Approval') {
    if (roleName === 'portal-admin') return '승인';
    if (roleName === 'security-auditor') return '조회';
    return '접근불가';
  }
  if (resource === 'Policy Management') {
    if (roleName === 'portal-admin') return '관리';
    if (roleName === 'security-auditor') return '조회';
    return '접근불가';
  }
  return matrix[roleName] || '접근불가';
};

export const RolePermissionMatrix = ({ roles }: RolePermissionMatrixProps) => {
  const targetRoles = roles.filter(r =>
    [
      'portal-admin',
      'project-manager',
      'developer',
      'analyst',
      'external-user',
      'security-auditor',
      'data-steward',
      'cloud-operator',
    ].includes(r.name),
  );

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        역할별 권한 매트릭스
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>자원 / 역할</TableCell>
              {targetRoles.map(r => (
                <TableCell key={r.id} align="center" style={{ minWidth: 90 }}>
                  {r.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {resources.map(resource => (
              <TableRow key={resource}>
                <TableCell style={{ fontWeight: 500 }}>{resource}</TableCell>
                {targetRoles.map(r => {
                  const level = getLevel(r.name, resource);
                  return (
                    <TableCell key={r.id} align="center">
                      <Chip
                        label={level}
                        size="small"
                        color={levelColor[level]}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
