import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  PERMISSION_LABELS,
  PORTAL_ROLES,
  PortalPermission,
  PortalRole,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from '../authz';
import {
  PortalMenuDefinition,
  portalMenuDefinitions,
  portalMenuGroups,
} from '../navigation/portalMenuDefinitions';

const accessLevelFor = (permissions: PortalPermission[]): string => {
  if (
    permissions.some(
      p =>
        p.includes('approve') || p.includes('manage') || p.includes('review'),
    )
  ) {
    return '승인·관리';
  }
  if (permissions.some(p => p.includes('request') || p.includes('submit'))) {
    return '조회·신청';
  }
  return '조회';
};

const menusForRole = (role: PortalRole): PortalMenuDefinition[] => {
  const permissions = new Set(ROLE_PERMISSIONS[role]);
  return portalMenuDefinitions.filter(menu =>
    menu.requiredAnyPermissions.some(permission => permissions.has(permission)),
  );
};

const useStyles = makeStyles(theme => ({
  groupHeader: {
    backgroundColor: theme.palette.background.default,
  },
  highlightedRow: {
    backgroundColor: theme.palette.action.selected,
  },
}));

const MenuTable = ({ menus }: { menus: PortalMenuDefinition[] }) => {
  const classes = useStyles();
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>메뉴</TableCell>
            <TableCell>라우트</TableCell>
            <TableCell>여정 단계</TableCell>
            <TableCell>요구 권한</TableCell>
            <TableCell>접근 수준</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {portalMenuGroups.map(group => {
            const groupMenus = menus.filter(menu => menu.group === group);
            if (groupMenus.length === 0) return null;
            return (
              <React.Fragment key={group}>
                <TableRow className={classes.groupHeader}>
                  <TableCell colSpan={5}>
                    <Typography variant="subtitle2">{group}</Typography>
                  </TableCell>
                </TableRow>
                {groupMenus.map(menu => (
                  <TableRow key={menu.id}>
                    <TableCell>{menu.title}</TableCell>
                    <TableCell>
                      <code>{menu.route}</code>
                    </TableCell>
                    <TableCell>{menu.journeyStep}단계</TableCell>
                    <TableCell>
                      {menu.requiredAnyPermissions
                        .map(permission => PERMISSION_LABELS[permission])
                        .join(', ')}
                    </TableCell>
                    <TableCell>
                      {accessLevelFor(menu.requiredAnyPermissions)}
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const SimpleMenuList = ({
  title,
  menus,
  highlightIds,
}: {
  title: string;
  menus: PortalMenuDefinition[];
  highlightIds?: Set<string>;
}) => {
  const classes = useStyles();
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell colSpan={2}>
              <Typography variant="subtitle2">{title}</Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {portalMenuGroups.map(group => {
            const groupMenus = menus.filter(menu => menu.group === group);
            if (groupMenus.length === 0) return null;
            return (
              <React.Fragment key={group}>
                <TableRow className={classes.groupHeader}>
                  <TableCell colSpan={2}>
                    <Typography variant="caption">{group}</Typography>
                  </TableCell>
                </TableRow>
                {groupMenus.map(menu => (
                  <TableRow
                    key={menu.id}
                    className={
                      highlightIds?.has(menu.id)
                        ? classes.highlightedRow
                        : undefined
                    }
                  >
                    <TableCell>{menu.title}</TableCell>
                    <TableCell>
                      <code>{menu.route}</code>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export const RoleMenuPreviewPage = () => {
  const [selectedRole, setSelectedRole] = useState<PortalRole>('general-user');
  const [compareMode, setCompareMode] = useState(false);

  const selectedMenus = useMemo(
    () => menusForRole(selectedRole),
    [selectedRole],
  );
  const generalMenus = useMemo(() => menusForRole('general-user'), []);
  const adminOnlyCount = portalMenuDefinitions.length - generalMenus.length;
  const extraMenuIds = useMemo(
    () =>
      new Set(
        selectedMenus
          .filter(menu => !generalMenus.some(m => m.id === menu.id))
          .map(menu => menu.id),
      ),
    [selectedMenus, generalMenus],
  );

  return (
    <Box padding={3} data-capture-id="role-menu-preview">
      <Typography variant="h4" gutterBottom style={{ fontWeight: 600 }}>
        권한별 메뉴 미리보기
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        역할별로 접근 가능한 메뉴와 요구 권한을 확인하고, 일반 사용자와 비교할
        수 있습니다.
      </Typography>

      <Box display="flex" alignItems="center" gridGap={16} mt={2} mb={2}>
        <FormControl variant="outlined" size="small" style={{ minWidth: 220 }}>
          <InputLabel id="role-menu-preview-role-label">역할</InputLabel>
          <Select
            labelId="role-menu-preview-role-label"
            label="역할"
            value={selectedRole}
            onChange={event =>
              setSelectedRole(event.target.value as PortalRole)
            }
          >
            {PORTAL_ROLES.map(role => (
              <MenuItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              color="primary"
              checked={compareMode}
              onChange={event => setCompareMode(event.target.checked)}
            />
          }
          label="일반 사용자와 비교"
        />
      </Box>

      {!compareMode && <MenuTable menus={selectedMenus} />}

      {compareMode && (
        <Grid container spacing={2} data-testid="role-menu-comparison">
          <Grid item xs={12} md={6}>
            <SimpleMenuList
              title={ROLE_LABELS['general-user']}
              menus={generalMenus}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SimpleMenuList
              title={ROLE_LABELS[selectedRole]}
              menus={selectedMenus}
              highlightIds={extraMenuIds}
            />
          </Grid>
        </Grid>
      )}

      <Box mt={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              요약
            </Typography>
            <Box display="flex" gridGap={8} flexWrap="wrap">
              <Chip
                label={`선택 역할 메뉴 ${selectedMenus.length}개`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`전체 메뉴 ${portalMenuDefinitions.length}개`}
                variant="outlined"
              />
              <Chip
                label={`관리자 전용 메뉴 ${adminOnlyCount}개`}
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
