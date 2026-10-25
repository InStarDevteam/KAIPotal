import { useState, useEffect } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Alert from '@material-ui/lab/Alert';
import { AdminUser, AccessibleService, DataAccessLevel } from './types';
import {
  adminUserAccessStorageKey,
  readAdminUserAccess,
  saveAdminUserAccess,
} from './adminUserAccessStore';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

interface UserAccessServicePanelProps {
  user: AdminUser;
  onSave: (updated: AdminUser) => void;
}

const allServices: AccessibleService[] = [
  'Portal Dashboard',
  'Integrated Search',
  'Project Workspace',
  'Export Approval',
  'Credit Manager',
  // 'K-RMF Evidence', // 기능 보류
  'Admin Console',
  'OpenMetadata',
  'OpenSearch Dashboards',
];

const mergeStoredAccess = (
  user: AdminUser,
  storageKey: string,
  enabled: boolean,
): AdminUser => {
  if (!enabled) return user;
  const stored = readAdminUserAccess(storageKey).items.find(
    record => record.userId === user.id,
  );
  if (!stored) return user;
  const overrides = Object.fromEntries(
    Object.entries(stored).filter(
      ([field, value]) => field !== 'userId' && value !== undefined,
    ),
  );
  return { ...user, ...overrides };
};

export const UserAccessServicePanel = ({
  user,
  onSave,
}: UserAccessServicePanelProps) => {
  const { tenantId, isDemo } = usePortalRuntime();
  const writable = isDemo && !!tenantId;
  const storageKey = adminUserAccessStorageKey(tenantId);
  const [form, setForm] = useState<AdminUser>(() =>
    mergeStoredAccess(user, storageKey, writable),
  );
  const [baseline, setBaseline] = useState(() => JSON.stringify(form));
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    const merged = mergeStoredAccess(user, storageKey, writable);
    setForm(merged);
    setBaseline(JSON.stringify(merged));
    setNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tenantId, isDemo]);

  const dirty = JSON.stringify(form) !== baseline;

  const toggleService = (service: AccessibleService) => {
    const current = form.accessibleServices || [];
    const next = current.includes(service)
      ? current.filter(s => s !== service)
      : [...current, service];
    setForm({ ...form, accessibleServices: next });
  };

  const handleSave = () => {
    if (!writable) {
      setNotice({
        message:
          '실제 설정 변경은 운영 승인 플로우 연결 후 제공됩니다.',
        error: true,
      });
      return;
    }
    try {
      const records = readAdminUserAccess(storageKey).items.filter(
        record => record.userId !== form.id,
      );
      saveAdminUserAccess(storageKey, [
        ...records,
        {
          userId: form.id,
          organization: form.organization,
          department: form.department,
          userGroup: form.userGroup,
          userType: form.userType,
          role: form.role,
          dataAccessLevel: form.dataAccessLevel,
          projectAccess: form.projectAccess,
          canApproveExport: form.canApproveExport,
          canManageCredit: form.canManageCredit,
          accessibleServices: form.accessibleServices,
        },
      ]);
      // Persist before updating UI: a failed local write must never look successful.
      onSave(form);
      setBaseline(JSON.stringify(form));
      setNotice({ message: '사용자 접근 설정을 저장했습니다.', error: false });
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : '저장하지 못했습니다.',
        error: true,
      });
    }
  };

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        사용자 소속/역할/접속 가능 서비스 설정
      </Typography>
      {!writable && (
        <Box marginBottom={2}>
          <Alert severity="info">
            실제 설정 변경은 운영 승인 플로우 연결 후 제공됩니다. 현재는
            조회만 가능합니다.
          </Alert>
        </Box>
      )}
      {notice && (
        <Box marginBottom={2}>
          <Alert
            severity={notice.error ? 'error' : 'success'}
            onClose={() => setNotice(null)}
          >
            {notice.message}
          </Alert>
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            label="소속"
            variant="outlined"
            fullWidth
            size="small"
            value={form.organization || ''}
            onChange={e => setForm({ ...form, organization: e.target.value })}
            style={{ marginBottom: 16 }}
            disabled={!writable}
          />
          <TextField
            label="부서"
            variant="outlined"
            fullWidth
            size="small"
            value={form.department || ''}
            onChange={e => setForm({ ...form, department: e.target.value })}
            style={{ marginBottom: 16 }}
            disabled={!writable}
          />
          <TextField
            label="사용자 그룹"
            variant="outlined"
            fullWidth
            size="small"
            value={form.userGroup || ''}
            onChange={e => setForm({ ...form, userGroup: e.target.value })}
            style={{ marginBottom: 16 }}
            disabled={!writable}
          />
          <FormControl
            variant="outlined"
            fullWidth
            size="small"
            style={{ marginBottom: 16 }}
            disabled={!writable}
          >
            <InputLabel>사용자 유형</InputLabel>
            <Select
              value={form.userType}
              onChange={e =>
                setForm({
                  ...form,
                  userType: e.target.value as AdminUser['userType'],
                })
              }
              label="사용자 유형"
            >
              <MenuItem value="내부">내부</MenuItem>
              <MenuItem value="외부">외부</MenuItem>
              <MenuItem value="수행사">수행사</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="역할"
            variant="outlined"
            fullWidth
            size="small"
            value={form.role || ''}
            onChange={e => setForm({ ...form, role: e.target.value })}
            style={{ marginBottom: 16 }}
            disabled={!writable}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl
            variant="outlined"
            fullWidth
            size="small"
            style={{ marginBottom: 16 }}
            disabled={!writable}
          >
            <InputLabel>접근 가능 데이터 등급</InputLabel>
            <Select
              value={form.dataAccessLevel || '내부'}
              onChange={e =>
                setForm({
                  ...form,
                  dataAccessLevel: e.target.value as DataAccessLevel,
                })
              }
              label="접근 가능 데이터 등급"
            >
              <MenuItem value="공개">공개</MenuItem>
              <MenuItem value="내부">내부</MenuItem>
              <MenuItem value="비밀">비밀</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="프로젝트 접근 권한"
            variant="outlined"
            fullWidth
            size="small"
            value={form.projectAccess || ''}
            onChange={e => setForm({ ...form, projectAccess: e.target.value })}
            style={{ marginBottom: 16 }}
            disabled={!writable}
          />
          <FormGroup row style={{ marginBottom: 16 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.canApproveExport || false}
                  onChange={e =>
                    setForm({ ...form, canApproveExport: e.target.checked })
                  }
                  disabled={!writable}
                />
              }
              label="반출 승인 권한"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.canManageCredit || false}
                  onChange={e =>
                    setForm({ ...form, canManageCredit: e.target.checked })
                  }
                  disabled={!writable}
                />
              }
              label="크레딧 관리 권한"
            />
            {/* K-RMF 전용 감사 권한 설정 보류 */}
          </FormGroup>
        </Grid>

        <Grid item xs={12}>
          <Typography
            variant="subtitle2"
            style={{ fontWeight: 600, marginBottom: 8 }}
          >
            접근 가능 서비스
          </Typography>
          <FormGroup row>
            {allServices.map(service => (
              <FormControlLabel
                key={service}
                control={
                  <Checkbox
                    checked={(form.accessibleServices || []).includes(service)}
                    onChange={() => toggleService(service)}
                    disabled={!writable}
                  />
                }
                label={service}
              />
            ))}
          </FormGroup>
        </Grid>
      </Grid>

      <Box marginTop={2}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={handleSave}
          disabled={!writable || !dirty}
        >
          저장
        </Button>
        {writable && !dirty && (
          <Typography
            component="span"
            color="textSecondary"
            variant="body2"
            style={{ marginLeft: 12 }}
          >
            변경된 내용이 없습니다.
          </Typography>
        )}
      </Box>
    </Box>
  );
};
