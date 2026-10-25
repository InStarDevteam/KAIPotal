import {
  FormControl,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { PortalTenant } from '../portal-runtime/PortalRuntimeContext';

/** Only server-confirmed memberships are selectable. A single membership remains inspectable. */
export function PortalTenantPicker({
  tenants,
  tenantId,
  loading,
  changing,
  className,
  onSelect,
  onManage,
}: {
  tenants: PortalTenant[];
  tenantId: string;
  loading: boolean;
  changing: boolean;
  className?: string;
  onSelect: (id: string) => void;
  onManage?: () => void;
}) {
  const current = tenants.find(tenant => tenant.id === tenantId);
  const single = tenants.length === 1;
  return (
    <Tooltip
      title={
        single
          ? '등록된 소속이 1개입니다. 다른 소속 접근은 관리자에게 요청하세요.'
          : '현재 계정에 등록된 소속을 선택하세요.'
      }
    >
      <FormControl
        variant="outlined"
        size="small"
        className={className}
        data-testid="tenant-picker"
      >
        <Select
          value={current?.id || ''}
          displayEmpty
          disabled={loading || changing || !tenants.length}
          inputProps={{ 'aria-label': '소속 군 선택' }}
          renderValue={() => current?.name || '소속 확인 중'}
          onChange={event => {
            const next = String(event.target.value);
            if (next === '__manage__') {
              onManage?.();
              return;
            }
            if (next !== tenantId && tenants.some(tenant => tenant.id === next))
              onSelect(next);
          }}
          MenuProps={{ PaperProps: { style: { maxWidth: 350 } } }}
        >
          <MenuItem
            disabled
            style={{
              opacity: 1,
              fontSize: 12,
              color: '#667085',
              whiteSpace: 'normal',
              maxWidth: 340,
            }}
          >
            <Typography variant="caption">
              {single
                ? '현재 계정에 등록된 소속은 1개입니다. 다른 소속은 관리자의 등록이 필요합니다.'
                : '소속을 바꾸면 해당 소속의 권한과 업무가 적용됩니다.'}
            </Typography>
          </MenuItem>
          {tenants.map(tenant => (
            <MenuItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </MenuItem>
          ))}
          {onManage && (
            <MenuItem
              value="__manage__"
              style={{
                borderTop: '1px solid #e2e8f0',
                fontSize: 13,
                marginTop: 6,
              }}
            >
              소속 사용자·권한 관리
            </MenuItem>
          )}
        </Select>
      </FormControl>
    </Tooltip>
  );
}
