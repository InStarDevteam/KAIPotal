import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import BusinessCenterOutlinedIcon from '@material-ui/icons/BusinessCenterOutlined';
import { MyProjectWorkspace, WorkspaceAccessStatus } from './types';

interface MyProjectWorkspacePanelProps {
  items: MyProjectWorkspace[];
  accessStatuses?: WorkspaceAccessStatus[];
}
export const safeWorkspaceUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !/(^|\.)example\.(com|org|net)$|\.invalid$/.test(parsed.hostname)
      ? parsed.href
      : null;
  } catch {
    return null;
  }
};
export const MyProjectWorkspacePanel = ({
  items,
  accessStatuses = [],
}: MyProjectWorkspacePanelProps) => {
  const [query, setQuery] = useState('');
  const filtered = items.filter(item =>
    `${item.projectName} ${item.workspaceName}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <section className="my-panel" aria-labelledby="my-projects-heading">
      <div className="my-panel-heading">
        <div>
          <span className="my-eyebrow">MY WORKSPACE</span>
          <h2 id="my-projects-heading">내 프로젝트 / 워크스페이스</h2>
          <p>참여 프로젝트와 작업환경 정보를 한눈에 확인하세요.</p>
        </div>
        <span className="my-count">{items.length}개</span>
      </div>
      <TextField
        className="my-project-search"
        fullWidth
        size="small"
        variant="outlined"
        id="my-project-search"
        label="프로젝트 / 워크스페이스 검색"
        InputLabelProps={{ shrink: true }}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="my-project-grid">
        {filtered.map(item => {
          const access = accessStatuses.find(
            row => row.workspaceId === item.workspaceId,
          );
          const href = access && safeWorkspaceUrl(access.accessUrl);
          const expired = access
            ? access.status === '만료' ||
              new Date(`${access.expiresAt}T23:59:59`).getTime() < Date.now()
            : false;
          return (
            <article
              className="my-project-card"
              key={`${item.projectId}:${item.workspaceId}`}
            >
              <div className="my-project-card-title">
                <BusinessCenterOutlinedIcon />
                <span className="my-status">{item.participationStatus}</span>
              </div>
              <h3>{item.projectName}</h3>
              <p className="my-workspace-name">{item.workspaceName}</p>
              <dl className="my-project-meta">
                <div>
                  <dt>내 역할</dt>
                  <dd>{item.myRole}</dd>
                </div>
                <div>
                  <dt>이용 기간</dt>
                  <dd>{item.validUntil}</dd>
                </div>
              </dl>
              <div className="my-resource-grid">
                {[
                  ['CPU', item.cpu],
                  ['GPU', item.gpu],
                  ['메모리', item.memory],
                  ['스토리지', item.storage],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="my-credit-row">
                <span>
                  사용 크레딧{' '}
                  <strong>{item.usedCredit.toLocaleString()}</strong>
                </span>
                <span>
                  잔여 <strong>{item.remainingCredit.toLocaleString()}</strong>
                </span>
              </div>
              <div className="my-service-tags">
                {item.services.map(service => (
                  <span key={service}>{service}</span>
                ))}
              </div>
              <p className="my-recent-activity">
                최근 활동 · {item.recentActivity}
              </p>
              <div className="my-project-actions">
                <Button
                  component={Link}
                  role="link"
                  to={`/project-workspace?project=${encodeURIComponent(
                    item.projectId,
                  )}`}
                  variant="outlined"
                  size="small"
                >
                  프로젝트 보기
                </Button>
                {href && !expired ? (
                  <Button
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    color="primary"
                  >
                    워크스페이스 접속
                  </Button>
                ) : (
                  <span>
                    {expired ? '이용 기간 만료' : '접속 정보 연동 대기'}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="my-empty">
          <BusinessCenterOutlinedIcon />
          <h3>
            {query ? '검색 결과가 없습니다' : '참여 중인 프로젝트가 없습니다'}
          </h3>
          <p>
            {query
              ? '다른 이름으로 검색하세요.'
              : '프로젝트 메뉴에서 프로젝트를 만들거나 참여하세요.'}
          </p>
        </div>
      )}
    </section>
  );
};
