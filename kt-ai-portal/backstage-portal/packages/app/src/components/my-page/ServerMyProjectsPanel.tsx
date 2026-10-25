import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import BusinessCenterOutlinedIcon from '@material-ui/icons/BusinessCenterOutlined';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import {
  mapServerProjectSummary,
  PROJECT_MEMBER_ROLE_LABELS,
  ServerProjectSummary,
} from '../project-workspace/projectServerData';

export const ServerMyProjectsPanel = () => {
  const { request, permissions } = usePortalRuntime();
  const canOpenProjects = permissions.some(permission =>
    ['project.request', 'project.approve'].includes(permission),
  );
  const [items, setItems] = useState<ServerProjectSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    request<{
      items: Record<string, unknown>[];
      pagination: { total: number };
    }>(`/v1/projects?mine=true&page=${page}&pageSize=20`)
      .then(response => {
        if (!Array.isArray(response.data.items))
          throw new Error('프로젝트 응답 형식을 확인할 수 없습니다.');
        if (active) {
          setItems(response.data.items.map(mapServerProjectSummary));
          setTotal(response.data.pagination.total);
        }
      })
      .catch(e => {
        if (active)
          setError(
            e instanceof Error ? e.message : '프로젝트를 불러오지 못했습니다.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request, page, reload]);
  const filtered = items.filter(item =>
    `${item.name} ${item.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <section className="my-panel" aria-labelledby="my-projects-heading">
      <div className="my-panel-heading">
        <div>
          <span className="my-eyebrow">MY PROJECTS</span>
          <h2 id="my-projects-heading">내 프로젝트 / 워크스페이스</h2>
          <p>현재 소속에서 내가 참여하는 프로젝트입니다.</p>
        </div>
        {canOpenProjects && (
          <Button
            component={Link}
            role="link"
            to="/project-workspace"
            variant="outlined"
            color="primary"
          >
            프로젝트 관리
          </Button>
        )}
      </div>
      <div className="my-project-toolbar">
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          id="my-server-project-search"
          label="현재 목록에서 프로젝트 검색"
          InputLabelProps={{ shrink: true }}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Button onClick={() => setReload(v => v + 1)} disabled={loading}>
          새로고침
        </Button>
      </div>
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => setReload(v => v + 1)}>
              다시 시도
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {loading ? (
        <p role="status">내 프로젝트를 불러오는 중입니다.</p>
      ) : (
        !error && (
          <>
            <div className="my-project-grid">
              {filtered.map(project => (
                <article className="my-project-card" key={project.id}>
                  <div className="my-project-card-title">
                    <BusinessCenterOutlinedIcon />
                    <span className="my-status">{project.statusLabel}</span>
                  </div>
                  <h3>{project.name}</h3>
                  <p>
                    {project.description || '등록된 프로젝트 설명이 없습니다.'}
                  </p>
                  <dl className="my-project-meta">
                    <div>
                      <dt>내 역할</dt>
                      <dd>
                        {project.myRole
                          ? PROJECT_MEMBER_ROLE_LABELS[project.myRole] ||
                            project.myRole
                          : '참여자'}
                      </dd>
                    </div>
                    <div>
                      <dt>이용 기간</dt>
                      <dd>
                        {project.startAt || '시작일 미지정'} ~{' '}
                        {project.endAt || '종료일 미지정'}
                      </dd>
                    </div>
                  </dl>
                  <div className="my-resource-pending">
                    <strong>워크스페이스 · 자원</strong>
                    <span>
                      플랫폼 연동 후 배정 자원과 접속 정보를 확인할 수 있습니다.
                    </span>
                  </div>
                  {canOpenProjects && (
                    <div className="my-project-actions">
                      <Button
                        component={Link}
                        role="link"
                        to={`/project-workspace?project=${encodeURIComponent(
                          project.id,
                        )}`}
                        variant="contained"
                        color="primary"
                        disableElevation
                      >
                        프로젝트 보기
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {!filtered.length && (
              <div className="my-empty">
                <BusinessCenterOutlinedIcon />
                <h3>
                  {query
                    ? '검색 결과가 없습니다'
                    : '참여 중인 프로젝트가 없습니다'}
                </h3>
                <p>
                  {query
                    ? '검색어를 바꾸거나 다음 페이지를 확인하세요.'
                    : '프로젝트를 생성하거나 프로젝트 관리자의 초대를 받아 시작하세요.'}
                </p>
                {!query && canOpenProjects && (
                  <Button
                    component={Link}
                    role="link"
                    to="/project-workspace"
                    variant="contained"
                    color="primary"
                    disableElevation
                  >
                    프로젝트로 이동
                  </Button>
                )}
              </div>
            )}
            <div className="my-pagination">
              <span>
                전체 {total.toLocaleString()}개 · {page}페이지
              </span>
              <Button disabled={page === 1} onClick={() => setPage(v => v - 1)}>
                이전
              </Button>
              <Button
                disabled={page * 20 >= total}
                onClick={() => setPage(v => v + 1)}
              >
                다음
              </Button>
            </div>
          </>
        )
      )}
    </section>
  );
};
