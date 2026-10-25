import Chip from '@material-ui/core/Chip';
import { ExportTargetType } from './types';

const typeConfig: Record<ExportTargetType, string> = {
  server: '서버',
  ai_model: 'AI 모델',
  algorithm: '알고리즘',
  dataset: '데이터셋',
  document: '문서',
  docker_image: 'Docker 이미지',
  pypi_package: 'PyPI 패키지',
};

export const ExportTargetTypeChip = ({ targetType }: { targetType: ExportTargetType }) => {
  return <Chip size="small" label={typeConfig[targetType]} variant="outlined" />;
};
