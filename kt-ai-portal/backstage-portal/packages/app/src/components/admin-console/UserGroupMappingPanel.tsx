import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { AdminGroup, AdminUser } from './types';

interface UserGroupMappingPanelProps {
  users: AdminUser[];
  groups: AdminGroup[];
}

export const UserGroupMappingPanel = ({ users, groups }: UserGroupMappingPanelProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [previewGroups, setPreviewGroups] = useState<string[]>([]);

  const user = users.find(u => u.id === selectedUserId);
  const allGroupNames = groups.map(g => g.name);

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        사용자 / 그룹 권한 매핑
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" style={{ padding: 16 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>대상 사용자</InputLabel>
              <Select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value as string)}>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name} ({u.accountId}) - {u.organization}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {user && (
              <Box marginTop={2}>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  <strong>현재 그룹:</strong> {user.userGroup || '-'}
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  <strong>현재 역할:</strong> {user.role}
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  <strong>소속:</strong> {user.organization} {user.department}
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  <strong>마지막 변경일:</strong> {user.lastLoginAt}
                </Typography>
                <Typography variant="body2">
                  <strong>변경자:</strong> 관리자
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" style={{ padding: 16 }}>
            <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 12 }}>
              추가 가능 그룹
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>그룹 추가 (미리보기)</InputLabel>
              <Select
                multiple
                value={previewGroups}
                onChange={e => setPreviewGroups(e.target.value as string[])}
                renderValue={selected => (
                  <Box display="flex" flexWrap="wrap">
                    {(selected as string[]).map(v => (
                      <Box key={v} marginRight={0.5}>
                        <Chip label={v} size="small" />
                      </Box>
                    ))}
                  </Box>
                )}
              >
                {allGroupNames.map(g => (
                  <MenuItem key={g} value={g}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box marginTop={2}>
              <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 8 }}>
                적용 예정 권한 미리보기
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>항목</TableCell>
                      <TableCell>값</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>추가 그룹</TableCell>
                      <TableCell>
                        {previewGroups.length === 0 && '-'}
                        {previewGroups.map(g => (
                          <Box key={g} component="span" marginRight={0.5}>
                            <Chip label={g} size="small" color="primary" />
                          </Box>
                        ))}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>예상 역할</TableCell>
                      <TableCell>{user?.role || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>예상 데이터 등급</TableCell>
                      <TableCell>{user?.dataAccessLevel || '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            <Box display="flex" marginTop={2}>
              <Box marginRight={1}>
                <Button variant="outlined" size="small" disabled>
                  그룹 추가
                </Button>
              </Box>
              <Box marginRight={1}>
                <Button variant="outlined" size="small" disabled>
                  그룹 제거
                </Button>
              </Box>
              <Button variant="outlined" size="small" disabled>
                역할 변경
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
