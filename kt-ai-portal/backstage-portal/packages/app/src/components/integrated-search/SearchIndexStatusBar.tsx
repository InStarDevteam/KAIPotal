import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Chip from '@material-ui/core/Chip';
import { SearchSourceMeta, SearchSourcesState } from './types';

interface SearchIndexStatusBarProps {
  state: 'checking' | 'connected' | 'unavailable';
  tookMs?: number;
  sources: SearchSourcesState;
}

export const SearchIndexStatusBar = ({
  state,
  tookMs,
  sources,
}: SearchIndexStatusBarProps) => {
  const portalSources: SearchSourceMeta[] =
    sources.status === 'success'
      ? sources.sources.filter(source => source.kind === 'portal')
      : [];
  const externalSources: SearchSourceMeta[] =
    sources.status === 'success'
      ? sources.sources.filter(source => source.kind === 'external')
      : [];

  return (
    <Paper
      variant="outlined"
      style={{
        padding: '8px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {state === 'checking' && (
          <Typography variant="body2" color="textSecondary">
            검색 서비스 연결 상태를 확인하고 있습니다.
          </Typography>
        )}
        {state === 'connected' && (
          <>
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label="검색 서비스 연결됨"
            />
            <Typography variant="body2" color="textSecondary">
              검색 가능 원천:
              {portalSources.map(source => (
                <Chip
                  key={source.key}
                  size="small"
                  style={{ marginLeft: 4 }}
                  variant="outlined"
                  color="primary"
                  label={source.label}
                />
              ))}
              {tookMs !== undefined && ` · ${tookMs}ms`}
            </Typography>
          </>
        )}
        {state === 'unavailable' && (
          <Typography variant="body2" color="textSecondary">
            검색 서비스에 연결할 수 없습니다. 아래 안내를 참고하거나 잠시 후
            다시 시도해 주세요.
          </Typography>
        )}
      </div>
      {externalSources.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Typography variant="body2" color="textSecondary">
            외부 원천 연동 대기:
          </Typography>
          {externalSources.map(source => (
            <Chip
              key={source.key}
              size="small"
              variant="outlined"
              label={source.label}
              title={source.note}
            />
          ))}
        </div>
      )}
      <Typography variant="caption" color="textSecondary">
        의미 기반 검색은 아직 제공되지 않습니다. 현재는 유사 명칭(부분 일치)
        검색만 가능합니다.
      </Typography>
    </Paper>
  );
};
