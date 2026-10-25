import Chip from '@material-ui/core/Chip';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { SectionCard, StatusChip } from '../common';
import { RecentAsset, AssetType } from './types';

interface RecentAssetsPanelProps {
  assets: RecentAsset[];
}

const typeLabel = (type: AssetType): string => (type === 'dataset' ? '데이터셋' : 'AI 모델');

export const RecentAssetsPanel = ({ assets }: RecentAssetsPanelProps) => {
  return (
    <SectionCard title="최신 등록 자산">
      {assets.map(asset => (
        <Box
          key={asset.id}
          paddingY={1.5}
          borderBottom="1px solid #f3f4f6"
        >
          <Box display="flex" alignItems="center" marginBottom={0.5}>
            <Box marginRight={1}>
              <StatusChip tone="info" label={typeLabel(asset.type)} />
            </Box>
            <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
              {asset.name}
            </Typography>
          </Box>
          <Typography variant="body2" color="textSecondary" paragraph>
            {asset.description}
          </Typography>
          <Box display="flex" alignItems="center" flexWrap="wrap">
            {asset.tags.map(tag => (
              <Chip key={tag} size="small" label={tag} variant="outlined" style={{ marginRight: 6, marginBottom: 4 }} />
            ))}
          </Box>
          <Box display="flex" justifyContent="space-between" marginTop={1}>
            <Typography variant="caption" color="textSecondary">
              소유: {asset.owner}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {asset.registeredAt}
            </Typography>
          </Box>
        </Box>
      ))}
    </SectionCard>
  );
};
