import { useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import DesktopWindowsOutlinedIcon from '@material-ui/icons/DesktopWindowsOutlined';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import { useOptionalPortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  myPageSessionsKey,
  readMyPageSessions,
  saveMyPageSessions,
} from './myPageProfileStore';
import { ActiveSession } from './types';

export const ActiveSessionPanel = ({
  sessions,
}: {
  sessions: ActiveSession[];
}) => {
  const runtime = useOptionalPortalRuntime();
  const writable = !!runtime?.isDemo && !!runtime.tenantId && !!runtime.actorId;
  const storageKey = runtime
    ? myPageSessionsKey(runtime.tenantId, runtime.actorId)
    : '';
  const [items, setItems] = useState(sessions);
  const [pending, setPending] = useState<ActiveSession[] | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (writable) {
      const loaded = readMyPageSessions(storageKey, sessions);
      setItems(loaded.items);
      if (loaded.error) setNotice({ message: loaded.error, error: true });
    }
  }, [writable, storageKey, sessions]);
  const terminable = (session: ActiveSession) =>
    !session.isCurrent && ['활성', '만료예정'].includes(session.status);
  const terminate = (id?: string) => {
    if (!writable) return;
    const targets = items.filter(s => terminable(s) && (!id || s.id === id));
    if (!targets.length) return;
    setPending(targets);
  };
  const confirmTerminate = () => {
    if (!writable || !pending?.length) return;
    const targets = pending;
    const next = items.map(s =>
      targets.some(t => t.id === s.id)
        ? { ...s, status: '강제종료' as const }
        : s,
    );
    try {
      saveMyPageSessions(storageKey, next);
      setItems(next);
      setPending(null);
      setNotice({
        message: `시연용 세션 ${targets.length}개를 종료 상태로 변경했습니다.`,
        error: false,
      });
    } catch (e) {
      setNotice({
        message: e instanceof Error ? e.message : '저장하지 못했습니다.',
        error: true,
      });
    }
  };
  return (
    <section className="my-panel" aria-labelledby="sessions-heading">
      <div className="my-panel-heading">
        <div>
          <span className="my-eyebrow">ACCOUNT SECURITY</span>
          <h2 id="sessions-heading">활성 세션</h2>
          <p>내 계정의 접속 기기와 로그인 상태를 확인하는 공간입니다.</p>
        </div>
      </div>
      {!writable ? (
        <div className="my-empty my-connection">
          <LockOutlinedIcon />
          <span className="my-status pending">인증 시스템 연동 대기</span>
          <h3>활성 세션 조회·종료는 아직 연결되지 않았습니다</h3>
          <p>
            포털 로그인은 정상 이용할 수 있습니다. 다른 기기의 접속 기록 조회와
            원격 로그아웃은 기관 인증 시스템의 세션 관리 연결 후 제공됩니다.
          </p>
          <p>
            현재 화면에서는 실제 세션 수·접속 IP를 표시하거나 세션을 강제로
            종료하지 않습니다.
          </p>
        </div>
      ) : (
        <>
          <Alert severity="info">
            아래는 세션 관리 화면을 검토하기 위한 예시입니다. 종료 동작은 이
            브라우저의 예시 데이터만 변경합니다.
          </Alert>
          {notice && (
            <Alert severity={notice.error ? 'error' : 'success'}>
              {notice.message}
            </Alert>
          )}
          <div className="session-toolbar">
            <Button
              variant="outlined"
              disabled={!items.some(terminable)}
              onClick={() => terminate()}
            >
              다른 예시 세션 종료
            </Button>
          </div>
          <div className="session-card-list">
            {items.map(session => (
              <article className="session-card" key={session.id}>
                <DesktopWindowsOutlinedIcon />
                <div>
                  <h3>
                    {session.browser} · {session.os}
                  </h3>
                  <p>
                    {session.location} · {session.ip}
                  </p>
                  <p>
                    로그인 {session.loginAt} · 마지막 활동{' '}
                    {session.lastActiveAt}
                  </p>
                  <span className="my-status">
                    {session.isCurrent ? '현재 기기 (예시)' : session.status}
                  </span>
                </div>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!terminable(session)}
                  onClick={() => terminate(session.id)}
                >
                  예시 세션 종료
                </Button>
              </article>
            ))}
          </div>
        </>
      )}
      <Dialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        aria-labelledby="session-confirm-title"
      >
        <DialogTitle id="session-confirm-title">예시 세션 종료</DialogTitle>
        <DialogContent>
          시연용 세션 {pending?.length ?? 0}개를 종료 상태로 변경합니다. 실제
          인증 세션에는 영향을 주지 않습니다.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>취소</Button>
          <Button color="primary" onClick={confirmTerminate}>
            예시 세션 종료 확인
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
};
