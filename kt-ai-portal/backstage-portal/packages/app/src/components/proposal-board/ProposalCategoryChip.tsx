import Chip from '@material-ui/core/Chip';
import { ProposalCategory } from './types';

interface ProposalCategoryChipProps {
  category: ProposalCategory;
}

const colorMap: Record<ProposalCategory, 'default' | 'primary' | 'secondary'> = {
  'AI 모델 개발': 'primary',
  '빅데이터 분석 모델 개발': 'secondary',
  '데이터셋 구축': 'primary',
  'LLM/RAG 서비스': 'secondary',
  'MLOps 자동화': 'primary',
  '데이터 시각화': 'secondary',
  '기타': 'default',
};

export const ProposalCategoryChip = ({ category }: ProposalCategoryChipProps) => {
  return <Chip size="small" label={category} color={colorMap[category]} />;
};
