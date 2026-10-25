import { useEffect, useMemo, useState } from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import Alert from '@material-ui/lab/Alert';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  CreditAccountData,
  CreditFetchFailure,
  CreditOwnerType,
  classifyCreditFetchError,
} from './creditServerData';
import { CreditAccountCards } from './CreditAccountCards';
import { CreditTransactionTable } from './CreditTransactionTable';
import { CreditUsageTrendPanel } from './CreditUsageTrendPanel';
import { CreditRequestPanel } from './CreditRequestPanel';
import { CreditProductTable } from './CreditProductTable';

interface CreditOwnerOption {
  type: CreditOwnerType;
  id: string;
  label: string;
}

type AccountState =
  | { status: 'loading' }
  | { status: 'ready'; data: CreditAccountData }
  | { status: 'not_found' }
  | { status: 'error'; failure: CreditFetchFailure };

export const CreditServerPage = () => {
  const runtime = usePortalRuntime();
  const { tenantId, actorId, permissions, tenants, request } = runtime;
  const tenantName = tenants.find(t => t.id === tenantId)?.name ?? '현재 소속';

  const [owners, setOwners] = useState<CreditOwnerOption[]>([]);
  const [ownerKey, setOwnerKey] = useState('');
  const [ownersFailure, setOwnersFailure] = useState<CreditFetchFailure | null>(
    null,
  );
  const [accountState, setAccountState] = useState<AccountState>({
    status: 'loading',
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const baseOwners: CreditOwnerOption[] = [
      { type: 'user', id: actorId, label: '사용자(본인)' },
      { type: 'tenant', id: tenantId, label: `소속(${tenantName})` },
    ];
    setOwners(baseOwners);
    setOwnerKey(prev => prev || `user:${actorId}`);
    setOwnersFailure(null);
    request<{ myProjects?: Array<{ id: string; name: string }> }>(
      '/v1/work/overview',
      { signal: controller.signal },
    )
      .then(response => {
        if (controller.signal.aborted) return;
        const projects = (response.data.myProjects ?? []).map(project => ({
          type: 'project' as const,
          id: project.id,
          label: project.name,
        }));
        setOwners([...baseOwners, ...projects]);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setOwnersFailure(classifyCreditFetchError(error));
      });
    return () => controller.abort();
  }, [actorId, tenantId, tenantName, request]);

  const owner = useMemo(
    () => owners.find(item => `${item.type}:${item.id}` === ownerKey) ?? null,
    [owners, ownerKey],
  );

  useEffect(() => {
    if (!owner) return undefined;
    const controller = new AbortController();
    setAccountState({ status: 'loading' });
    request<CreditAccountData>(
      `/v1/credits/accounts?owner_type=${
        owner.type
      }&owner_id=${encodeURIComponent(owner.id)}`,
      { signal: controller.signal },
    )
      .then(response => {
        if (controller.signal.aborted) return;
        setAccountState({ status: 'ready', data: response.data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const failure = classifyCreditFetchError(error);
        setAccountState(
          failure.kind === 'not_found'
            ? { status: 'not_found' }
            : { status: 'error', failure },
        );
      });
    return () => controller.abort();
  }, [owner, ownerKey, request, reloadToken]);

  const refresh = () => setReloadToken(token => token + 1);

  return (
    <Box padding={3}>
      <Typography variant="h4" gutterBottom>
        크레딧 관리
      </Typography>
      <Typography color="textSecondary" paragraph>
        크레딧 계정·신청·거래 원장을 서버에서 조회합니다.
      </Typography>

      {ownersFailure?.kind === 'permission' && (
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          {ownersFailure.message}
        </Alert>
      )}

      <Box
        display="flex"
        alignItems="center"
        flexWrap="wrap"
        style={{ gap: 12, marginBottom: 16 }}
      >
        <FormControl
          variant="outlined"
          size="small"
          style={{ width: 280, maxWidth: '100%' }}
        >
          <InputLabel id="credit-owner-label">크레딧 계정 대상</InputLabel>
          <Select
            labelId="credit-owner-label"
            label="크레딧 계정 대상"
            value={ownerKey}
            onChange={event => setOwnerKey(event.target.value as string)}
          >
            {owners.map(item => (
              <MenuItem
                key={`${item.type}:${item.id}`}
                value={`${item.type}:${item.id}`}
              >
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" size="small" onClick={refresh}>
          새로고침
        </Button>
      </Box>

      {accountState.status === 'loading' && (
        <Box display="flex" justifyContent="center" padding={3}>
          <CircularProgress size={28} />
        </Box>
      )}
      {accountState.status === 'not_found' && (
        <Alert severity="info" style={{ marginBottom: 16 }}>
          아직 개설된 크레딧 계정이 없습니다. 아래에서 초기 부여를 신청하고
          승인을 기다리면 잔액이 표시됩니다.
        </Alert>
      )}
      {accountState.status === 'error' && (
        <Alert
          severity={
            accountState.failure.kind === 'permission' ? 'warning' : 'error'
          }
          style={{ marginBottom: 16 }}
          action={
            accountState.failure.kind !== 'permission' ? (
              <Button color="inherit" size="small" onClick={refresh}>
                다시 시도
              </Button>
            ) : undefined
          }
        >
          {accountState.failure.message}
        </Alert>
      )}
      {accountState.status === 'ready' && (
        <CreditAccountCards
          ownerLabel={owner?.label ?? ''}
          data={accountState.data}
        />
      )}

      <Box marginTop={3}>
        <CreditUsageTrendPanel owner={owner} />
      </Box>

      {accountState.status === 'ready' && (
        <Box marginTop={3}>
          <CreditTransactionTable
            accountId={accountState.data.account.id}
            reloadToken={reloadToken}
          />
        </Box>
      )}

      <Box marginTop={3}>
        <CreditRequestPanel
          owner={owner}
          canViewAll={permissions.includes('credit.view')}
          canApprove={permissions.includes('credit.approve')}
          onChanged={refresh}
        />
      </Box>

      <Box marginTop={3}>
        <CreditProductTable />
      </Box>
    </Box>
  );
};
