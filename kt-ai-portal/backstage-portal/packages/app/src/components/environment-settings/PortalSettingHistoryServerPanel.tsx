import { useEffect, useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Alert from '@material-ui/lab/Alert';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { formatPortalDateTime } from '../common/portalDate';
import {
  classifySettingsFetchError,
  formatSettingHistoryValue,
  parsePortalSettingHistory,
  PortalSettingHistoryPage,
  SERVER_SETTING_CATEGORIES,
  SETTING_CATEGORY_LABELS,
  SettingsFetchFailure,
} from './portalSettingsServerData';

export const PortalSettingHistoryServerPanel = () => {
  const { request, tenantId, actorId } = usePortalRuntime();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<PortalSettingHistoryPage | null>(null);
  const [failure, setFailure] = useState<SettingsFetchFailure | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    setFailure(null);
    request<unknown>(
      `/v1/portal-settings/history?page=${page}&pageSize=20${
        category ? `&category=${encodeURIComponent(category)}` : ''
      }`,
    )
      .then(response => {
        if (active) setData(parsePortalSettingHistory(response.data));
      })
      .catch(error => {
        if (active)
          setFailure(
            classifySettingsFetchError(
              error,
              '변경 이력을 불러오지 못했습니다.',
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [request, tenantId, actorId, category, page, refresh]);
  return (
    <Paper variant="outlined" style={{ padding: 24 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gridGap={16}
        mb={2}
      >
        <div>
          <Typography variant="h6" style={{ fontWeight: 700 }}>
            설정 변경 이력
          </Typography>
          <Typography variant="body2" color="textSecondary">
            현재 소속에 저장된 변경자·시각·변경 전후 값입니다. 민감한 값은
            공개하지 않습니다.
          </Typography>
        </div>
        <Button
          variant="outlined"
          onClick={() => setRefresh(value => value + 1)}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          새로고침
        </Button>
      </Box>
      <TextField
        id="setting-history-category"
        label="이력 분류"
        select
        variant="outlined"
        size="small"
        value={category}
        onChange={event => {
          setCategory(event.target.value);
          setPage(1);
        }}
        style={{ minWidth: 160, marginBottom: 20 }}
      >
        <MenuItem value="">전체 분류</MenuItem>
        {SERVER_SETTING_CATEGORIES.map(value => (
          <MenuItem key={value} value={value}>
            {SETTING_CATEGORY_LABELS[value]}
          </MenuItem>
        ))}
      </TextField>
      {failure && (
        <Alert
          severity="error"
          action={
            failure.kind === 'network' ? (
              <Button
                color="inherit"
                onClick={() => setRefresh(value => value + 1)}
              >
                다시 시도
              </Button>
            ) : undefined
          }
        >
          {failure.message}
        </Alert>
      )}
      {!failure && !data && (
        <Typography role="status" color="textSecondary">
          변경 이력을 불러오는 중입니다.
        </Typography>
      )}
      {!failure && data && data.items.length === 0 && (
        <Typography color="textSecondary">
          저장된 설정 변경 이력이 없습니다.
        </Typography>
      )}
      {!failure && data && data.items.length > 0 && (
        <>
          <TableContainer>
            <Table
              size="small"
              aria-label="서버 설정 변경 이력"
              style={{ minWidth: 780 }}
            >
              <TableHead>
                <TableRow>
                  {[
                    '변경 시각',
                    '변경자',
                    '분류 · 설정',
                    '이전 값',
                    '변경 값',
                  ].map(label => (
                    <TableCell key={label}>{label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell style={{ whiteSpace: 'nowrap' }}>
                      {formatPortalDateTime(item.changedAt)}
                    </TableCell>
                    <TableCell>{item.changedByName}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="textSecondary">
                        {SETTING_CATEGORY_LABELS[item.category]}
                      </Typography>
                      <Typography variant="body2" style={{ fontWeight: 600 }}>
                        {item.key}
                      </Typography>
                    </TableCell>
                    <TableCell
                      style={{ maxWidth: 300, overflowWrap: 'anywhere' }}
                    >
                      {formatSettingHistoryValue(item.oldValue, item.sensitive)}
                    </TableCell>
                    <TableCell
                      style={{ maxWidth: 300, overflowWrap: 'anywhere' }}
                    >
                      {formatSettingHistoryValue(item.newValue, item.sensitive)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box
            mt={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gridGap={8}
          >
            <Typography variant="body2" color="textSecondary">
              총 {data.total.toLocaleString('ko-KR')}건 · {data.page} /{' '}
              {Math.max(1, Math.ceil(data.total / data.pageSize))}페이지
            </Typography>
            <Box display="flex" gridGap={8}>
              <Button
                disabled={page <= 1}
                onClick={() => setPage(value => value - 1)}
              >
                이전
              </Button>
              <Button
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage(value => value + 1)}
              >
                다음
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
};
