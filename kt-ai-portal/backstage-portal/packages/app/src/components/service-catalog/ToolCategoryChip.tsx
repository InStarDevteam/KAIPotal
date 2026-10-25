import Chip from '@material-ui/core/Chip';
import { ToolCategory } from './types';

interface ToolCategoryChipProps {
  category: ToolCategory;
}

const colorMap: Record<ToolCategory, 'default' | 'primary' | 'secondary'> = {
  '분석 프레임워크': 'primary',
  '개발도구': 'secondary',
  '데이터 도구': 'primary',
  '시각화 도구': 'secondary',
  '라벨링 도구': 'primary',
  '학습데이터 구축 도구': 'primary',
  '라이브러리': 'default',
  '패키지': 'default',
  '컨테이너 이미지': 'default',
  'Docker 이미지': 'default',
  'PyPI 패키지': 'default',
  '컨테이너 라이브러리': 'default',
  '분석 도구': 'primary',
  '서비스 카탈로그': 'secondary',
};

export const ToolCategoryChip = ({ category }: ToolCategoryChipProps) => {
  return <Chip size="small" label={category} color={colorMap[category]} />;
};
