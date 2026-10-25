import { useSearchParams } from 'react-router-dom';
import Box from '@material-ui/core/Box';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import { ProjectList } from './ProjectList';
import { ProjectDetail } from './ProjectDetail';
import { WorkEnvRequestWizard } from './WorkEnvRequestWizard';
import { ServerProjectWorkspace } from './ServerProjectWorkspace';
import { mockProjects } from './mockProjects';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import './projectWorkspace.css';

const DemoProjectWorkspace = () => {
  const [params, setParams] = useSearchParams();
  const selectedProject =
    mockProjects.find(project => project.id === params.get('project')) ??
    mockProjects[0];
  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };
  return (
    <Box>
      <ProjectList
        projects={mockProjects}
        selectedId={selectedProject.id}
        onSelect={project => updateParam('project', project.id)}
      />
      <Box marginTop={3}>
        <ProjectDetail project={selectedProject} />
      </Box>
    </Box>
  );
};

export const ProjectWorkspacePage = () => {
  const runtime = usePortalRuntime();
  const [params, setParams] = useSearchParams();
  const tabIndex = Math.max(
    0,
    ['projects', 'request'].indexOf(params.get('tab') ?? 'projects'),
  );
  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };

  if (runtime.loading)
    return (
      <Box className="project-workspace-page">
        프로젝트 워크스페이스를 불러오는 중입니다.
      </Box>
    );

  return (
    <Box className="project-workspace-page">
      <Typography variant="h4" gutterBottom>
        프로젝트/워크스페이스
      </Typography>
      <Typography color="textSecondary" paragraph>
        프로젝트를 등록하고 참여자를 관리하세요. AI·데이터 작업환경은
        프로젝트에서 신청합니다.
      </Typography>

      <Tabs
        aria-label="프로젝트 업무 선택"
        variant="scrollable"
        scrollButtons="auto"
        value={tabIndex}
        onChange={(_, value) =>
          updateParam('tab', ['projects', 'request'][value])
        }
        indicatorColor="primary"
        textColor="primary"
        style={{ marginBottom: 16 }}
      >
        <Tab label="프로젝트 목록" />
        <Tab label="작업 환경 생성 요청" />
      </Tabs>

      {tabIndex === 0 &&
        (runtime.isDemo ? (
          <DemoProjectWorkspace />
        ) : (
          <ServerProjectWorkspace
            key={`${runtime.tenantId}:${runtime.actorId}`}
          />
        ))}

      {tabIndex === 1 && <WorkEnvRequestWizard />}
    </Box>
  );
};
