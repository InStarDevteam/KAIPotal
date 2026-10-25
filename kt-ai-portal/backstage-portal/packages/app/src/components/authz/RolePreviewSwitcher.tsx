import { Box, MenuItem, Select, Tooltip, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { colors, typographyTokens } from '../common/designTokens';
import { ROLE_OVERRIDE_STORAGE_KEY, useAuthz } from './AuthzContext';
import { isPortalRole, PORTAL_ROLES, PortalRole, ROLE_LABELS } from './types';

const useStyles = makeStyles({
  root: {
    width: '100%',
    padding: '0 12px 12px',
    boxSizing: 'border-box',
  },
  caption: {
    ...typographyTokens.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  select: {
    backgroundColor: colors.surface,
    fontSize: typographyTokens.body.fontSize,
  },
});

export const RolePreviewSwitcher = () => {
  const classes = useStyles();
  const config = useApi(configApiRef);
  const { primaryRole } = useAuthz();

  const enabled =
    config.getOptionalBoolean('app.proposalCapture.enabled') === true;
  if (!enabled) {
    return null;
  }

  const allowedRolesRaw = config.getOptionalString(
    'app.proposalCapture.allowedRoles',
  );
  const allowedRoles = allowedRolesRaw
    ? allowedRolesRaw
        .split(',')
        .map(s => s.trim())
        .filter(isPortalRole)
    : PORTAL_ROLES;

  const handleChange = (value: string) => {
    if (value === '__default__') {
      sessionStorage.removeItem(ROLE_OVERRIDE_STORAGE_KEY);
    } else {
      sessionStorage.setItem(ROLE_OVERRIDE_STORAGE_KEY, value);
    }
    const next = new URL(window.location.href);
    next.searchParams.delete('captureRole');
    window.location.assign(`${next.pathname}${next.search}${next.hash}`);
  };

  return (
    <Box className={classes.root} data-testid="role-preview-switcher">
      <Typography component="label" className={classes.caption} display="block">
        역할 미리보기 (현재: {ROLE_LABELS[primaryRole]})
      </Typography>
      <Tooltip title="권한에 따라 이용 가능한 메뉴가 표시됩니다" arrow>
        <Select
          fullWidth
          variant="outlined"
          margin="dense"
          className={classes.select}
          value={primaryRole}
          onChange={event => handleChange(event.target.value as string)}
          inputProps={{ 'aria-label': '역할 선택' }}
        >
          <MenuItem value="__default__">기본 역할로 복귀</MenuItem>
          {allowedRoles.map((role: PortalRole) => (
            <MenuItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </MenuItem>
          ))}
        </Select>
      </Tooltip>
    </Box>
  );
};
