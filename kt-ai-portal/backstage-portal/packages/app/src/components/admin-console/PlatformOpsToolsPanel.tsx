import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { QuickLinkCards } from '../portal-dashboard/QuickLinkCards';
import { QuickLink } from '../portal-dashboard/types';

const platformOpsTools: QuickLink[] = [
  {
    id: 'ql-openmetadata',
    title: 'OpenMetadata',
    description: '데이터셋·모델·도구의 메타데이터를 관리합니다.',
    type: 'external',
    target: 'http://localhost:8585',
  },
  {
    id: 'ql-opensearch',
    title: 'OpenSearch 대시보드',
    description: 'OpenSearch 인덱스와 대시보드를 모니터링합니다.',
    type: 'external',
    target: 'http://localhost:5601',
  },
  {
    id: 'ql-keycloak',
    title: 'Keycloak 관리',
    description: 'Keycloak 인증·인가를 관리합니다.',
    type: 'external',
    target: 'http://localhost:8080/admin',
  },
];

export const PlatformOpsToolsPanel = () => {
  return (
    <Box>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        플랫폼 운영도구는 권한이 부여된 관리자만 사용할 수 있습니다.
      </Typography>
      <QuickLinkCards links={platformOpsTools} />
    </Box>
  );
};
