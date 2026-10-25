import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import StarBorderIcon from '@material-ui/icons/StarBorder';
import DescriptionIcon from '@material-ui/icons/Description';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import { Tool } from './types';
import { ToolCategoryChip } from './ToolCategoryChip';
import { ToolStatusChip } from './ToolStatusChip';

interface ToolCatalogDetailProps {
  tool: Tool | null;
}

export const ToolCatalogDetail = ({ tool }: ToolCatalogDetailProps) => {
  if (!tool) {
    return (
      <Paper variant="outlined" style={{ padding: 24, height: '100%' }}>
        <Typography color="textSecondary" align="center">
          목록에서 도구를 선택하세요.
        </Typography>
      </Paper>
    );
  }

  const sections: { label: string; value: React.ReactNode }[] = [
    { label: '도구명', value: tool.name },
    { label: '카테고리', value: <ToolCategoryChip category={tool.category} /> },
    { label: '설명', value: tool.description },
    { label: '주요 기능', value: tool.features.join(', ') },
    { label: '제공 방식', value: tool.provisionType },
    { label: '설치/실행 방식', value: tool.installMethod },
    { label: '지원 버전', value: tool.version },
    { label: '필요 리소스', value: tool.requiredResources },
    { label: '접근 가능 역할', value: tool.allowedRoles.join(', ') },
    { label: '접근 가능 데이터 등급', value: tool.securityLevel },
    {
      label: '보안 검토 필요 여부',
      value: tool.requiresSecurityReview ? '예' : '아니오',
    },
    {
      label: '워크스페이스 적용 가능 여부',
      value: tool.workspaceApplicable ? '예' : '아니오',
    },
    { label: '관련 프로젝트', value: tool.relatedProjects.join(', ') },
    { label: '관련 문서', value: tool.relatedDocs.join(', ') },
    { label: '담당자', value: tool.owner },
    { label: '등록일', value: tool.registeredAt },
    {
      label: '변경 이력',
      value: (
        <Box>
          {tool.changeHistory.map((h, idx) => (
            <Typography key={idx} variant="body2">
              {h}
            </Typography>
          ))}
        </Box>
      ),
    },
  ];

  return (
    <Paper variant="outlined" style={{ padding: 24, height: '100%' }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={2}
      >
        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
          <Typography variant="h6" style={{ fontWeight: 600 }}>
            {tool.name}
          </Typography>
          <ToolStatusChip status={tool.status} />
        </Box>
        <Box display="flex" style={{ gap: 8 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            disabled={tool.status !== '사용가능'}
          >
            워크스페이스에 추가
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<StarBorderIcon />}
            disabled
          >
            즐겨찾기
          </Button>
          <Button size="small" variant="outlined" startIcon={<DescriptionIcon />} disabled>
            상세 문서 보기
          </Button>
        </Box>
      </Box>

      <Divider style={{ marginBottom: 16 }} />

      <Grid container spacing={2}>
        {sections.map(section => (
          <Grid item xs={12} sm={6} key={section.label}>
            <Typography variant="caption" color="textSecondary">
              {section.label}
            </Typography>
            <Box marginTop={0.5}>
              {typeof section.value === 'string' ? (
                <Typography variant="body2">{section.value}</Typography>
              ) : (
                section.value
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box marginTop={2}>
        <Button
          size="small"
          variant="contained"
          color="primary"
          disabled={tool.status !== '사용가능'}
        >
          사용 신청
        </Button>
      </Box>
    </Paper>
  );
};
