import { formatPortalDateTime } from '../common/portalDate';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';

export const ServerMyCreditsPanel = () => {
  const { actorId, request, permissions } = usePortalRuntime();
  const canManage = permissions.some(permission =>
    ['credit.view', 'credit.approve'].includes(permission),
  );
  const [data, setData] = useState<{
    account: Record<string, unknown>;
    recentTransactions: Record<string, unknown>[];
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    request<{
      account: Record<string, unknown>;
      recentTransactions: Record<string, unknown>[];
    }>(
      `/v1/credits/accounts?owner_type=user&owner_id=${encodeURIComponent(
        actorId,
      )}`,
    )
      .then(response => {
        if (active) setData(response.data);
      })
      .catch(e => {
        if (active && (e as { status?: number }).status !== 404)
          setError(
            e instanceof Error ? e.message : '크레딧을 불러오지 못했습니다.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request, actorId, reload]);
  const labels: Record<string, string> = {
    grant: '부여',
    charge: '충전',
    deduct: '사용',
    refund: '환불',
    adjust: '조정',
    expire: '만료',
    revoke: '회수',
  };
  return (
    <section className="my-panel">
      <div className="my-panel-heading">
        <div>
          <span className="my-eyebrow">MY CREDITS</span>
          <h2>크레딧 사용 내역</h2>
          <p>개인 크레딧 계정의 최근 10개 거래입니다.</p>
        </div>
        {canManage && (
          <Button
            component={Link}
            role="link"
            to="/credit-manager"
            variant="outlined"
          >
            크레딧 관리
          </Button>
        )}
      </div>
      {error && (
        <Alert
          severity="error"
          action={
            <Button onClick={() => setReload(v => v + 1)}>다시 시도</Button>
          }
        >
          {error}
        </Alert>
      )}
      {loading ? (
        <p role="status">크레딧을 불러오는 중입니다.</p>
      ) : (
        !error &&
        (data ? (
          <>
            <div className="my-credit-balance">
              <span>현재 잔액</span>
              <strong>
                {Number(data.account.balance ?? 0).toLocaleString()}
                <small> 크레딧</small>
              </strong>
            </div>
            <div className="my-ledger-list">
              {data.recentTransactions.map(row => (
                <article key={String(row.id)}>
                  <div>
                    <strong>
                      {labels[String(row.type)] || String(row.type)}
                    </strong>
                    <p>{String(row.reason || '사유 없음')}</p>
                  </div>
                  <div>
                    <strong>{Number(row.amount ?? 0).toLocaleString()}</strong>
                    <p>{formatPortalDateTime(String(row.created_at))}</p>
                  </div>
                </article>
              ))}
            </div>
            {!data.recentTransactions.length && (
              <div className="my-empty">
                <h3>사용 내역이 없습니다</h3>
                <p>크레딧이 부여되거나 사용되면 거래 이력이 표시됩니다.</p>
              </div>
            )}
          </>
        ) : (
          <div className="my-empty">
            <h3>아직 개인 크레딧 계정이 없습니다</h3>
            <p>
              크레딧이 배정되면 잔액과 사용 이력이 표시됩니다. 프로젝트 크레딧은
              크레딧 관리에서 확인하세요.
            </p>
          </div>
        ))
      )}
    </section>
  );
};
