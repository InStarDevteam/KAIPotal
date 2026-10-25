import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

export const PortalPagination = ({
  label, page, pageSize, total, onPage,
}: {
  label: string;
  page: number;
  pageSize: number;
  total: number;
  onPage: (value: number) => void;
}) => (
  <Box mt={2} display="flex" alignItems="center" justifyContent="space-between"
    flexWrap="wrap" style={{ gap: 8 }} aria-label={`${label} 페이지 이동`}>
    <Typography variant="body2" color="textSecondary" role="status">
      전체 {total.toLocaleString()}개 · {page} / {Math.max(1, Math.ceil(total / pageSize))}페이지
    </Typography>
    <Box display="flex" style={{ gap: 8 }}>
      <Button aria-label={`이전 ${label} 페이지`} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        이전
      </Button>
      <Button aria-label={`다음 ${label} 페이지`} disabled={page * pageSize >= total} onClick={() => onPage(page + 1)}>
        다음
      </Button>
    </Box>
  </Box>
);
