import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import { RoleDetailPanel } from './RoleDetailPanel';
import { RolePermissionMatrix } from './RolePermissionMatrix';
import { GroupManagementPanel } from './GroupManagementPanel';
import { UserGroupMappingPanel } from './UserGroupMappingPanel';
import { ProjectRoleMappingPanel } from './ProjectRoleMappingPanel';
import { ServicePermissionPanel } from './ServicePermissionPanel';
import { DataAccessLevelPanel } from './DataAccessLevelPanel';
import { ApprovalPermissionPanel } from './ApprovalPermissionPanel';
import { OrganizationTransferPanel } from './OrganizationTransferPanel';
import { PermissionChangeHistoryPanel } from './PermissionChangeHistoryPanel';
import {
  AdminRole,
  AdminGroup,
  AdminUser,
  ServicePermission,
  DataAccessPermission,
  ApprovalPermission,
  ProjectRoleMapping,
  OrganizationTransfer,
  PermissionChangeHistory,
} from './types';

interface RolePermissionPanelProps {
  roles: AdminRole[];
  groups?: AdminGroup[];
  users?: AdminUser[];
  servicePermissions?: ServicePermission[];
  dataAccessPermissions?: DataAccessPermission[];
  approvalPermissions?: ApprovalPermission[];
  projectRoleMappings?: ProjectRoleMapping[];
  organizationTransfers?: OrganizationTransfer[];
  permissionChangeHistories?: PermissionChangeHistory[];
}

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  if (value !== index) return null;
  return <Box marginTop={3}>{children}</Box>;
};

export const RolePermissionPanel = ({
  roles,
  groups = [],
  users = [],
  servicePermissions = [],
  dataAccessPermissions = [],
  approvalPermissions = [],
  projectRoleMappings = [],
  organizationTransfers = [],
  permissionChangeHistories = [],
}: RolePermissionPanelProps) => {
  const [tab, setTab] = useState(0);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id || null);

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 8, fontWeight: 600 }}>
        권한 / RBAC 관리
      </Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
        역할, 그룹, 서비스/데이터/승인 권한, 조직 변경 권한 인계, 권한 변경 이력을 조회합니다.
      </Typography>

      <Paper variant="outlined">
        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="역할 목록" />
          <Tab label="권한 매트릭스" />
          <Tab label="그룹 관리" />
          <Tab label="사용자/그룹 매핑" />
          <Tab label="프로젝트별 역할" />
          <Tab label="서비스별 권한" />
          <Tab label="데이터 등급" />
          <Tab label="승인 권한" />
          <Tab label="조직 변경 인계" />
          <Tab label="권한 변경 이력" />
        </Tabs>
      </Paper>

      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>역할명</TableCell>
                    <TableCell>설명</TableCell>
                    <TableCell>적용 대상</TableCell>
                    <TableCell>사용자 수</TableCell>
                    <TableCell>그룹 수</TableCell>
                    <TableCell>사용 여부</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map(row => (
                    <TableRow
                      key={row.id}
                      selected={row.id === selectedRoleId}
                      onClick={() => setSelectedRoleId(row.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell style={{ fontWeight: 600 }}>{row.name}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{row.target}</TableCell>
                      <TableCell>{row.userCount}</TableCell>
                      <TableCell>{row.groupCount ?? 0}</TableCell>
                      <TableCell>{row.enabled ? '사용' : '미사용'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            {selectedRole ? <RoleDetailPanel role={selectedRole} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <RolePermissionMatrix roles={roles} />
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <GroupManagementPanel groups={groups} />
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <UserGroupMappingPanel users={users} groups={groups} />
      </TabPanel>

      <TabPanel value={tab} index={4}>
        <ProjectRoleMappingPanel mappings={projectRoleMappings} />
      </TabPanel>

      <TabPanel value={tab} index={5}>
        <ServicePermissionPanel permissions={servicePermissions} />
      </TabPanel>

      <TabPanel value={tab} index={6}>
        <DataAccessLevelPanel permissions={dataAccessPermissions} />
      </TabPanel>

      <TabPanel value={tab} index={7}>
        <ApprovalPermissionPanel permissions={approvalPermissions} />
      </TabPanel>

      <TabPanel value={tab} index={8}>
        <OrganizationTransferPanel transfers={organizationTransfers} />
      </TabPanel>

      <TabPanel value={tab} index={9}>
        <PermissionChangeHistoryPanel histories={permissionChangeHistories} />
      </TabPanel>
    </Box>
  );
};
