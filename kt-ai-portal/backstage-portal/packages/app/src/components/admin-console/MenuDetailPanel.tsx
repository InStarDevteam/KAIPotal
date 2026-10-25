import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { MenuItem as MenuItemType } from './types';

interface MenuDetailPanelProps {
  item: MenuItemType;
  menuItems: MenuItemType[];
}

export const MenuDetailPanel = ({ item, menuItems }: MenuDetailPanelProps) => {
  const parentOptions = menuItems.filter(m => m.menuType === '메뉴' && m.id !== item.id);

  return (
    <Paper variant="outlined" style={{ padding: 16, height: '100%' }}>
      <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 12 }}>
        메뉴 상세 / 수정
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="메뉴 ID" value={item.id} fullWidth margin="dense" disabled />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="메뉴 명" defaultValue={item.name} fullWidth margin="dense" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth margin="dense">
            <InputLabel>상위 메뉴</InputLabel>
            <Select defaultValue={item.parent}>
              <MenuItem value="-">루트</MenuItem>
              {parentOptions.map(m => (
                <MenuItem key={m.id} value={m.name}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="경로" defaultValue={item.path} fullWidth margin="dense" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="연결 기능/컴포넌트" defaultValue={item.connectedFeature} fullWidth margin="dense" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="표시 순서" type="number" defaultValue={item.displayOrder} fullWidth margin="dense" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth margin="dense">
            <InputLabel>메뉴 유형</InputLabel>
            <Select defaultValue={item.menuType}>
              <MenuItem value="메뉴">메뉴</MenuItem>
              <MenuItem value="기능">기능</MenuItem>
              <MenuItem value="외부링크">외부링크</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="아이콘" defaultValue={item.icon || ''} fullWidth margin="dense" />
        </Grid>
        <Grid item xs={12}>
          <TextField label="설명" defaultValue={item.description || ''} fullWidth margin="dense" multiline rows={2} />
        </Grid>
      </Grid>
      <Box marginTop={2}>
        <FormControlLabel control={<Switch checked={item.enabled} disabled />} label="사용 여부" />
        <FormControlLabel control={<Switch checked={item.hidden || false} disabled />} label="숨김 여부" />
        <FormControlLabel control={<Switch checked={item.external || false} disabled />} label="외부 링크" />
      </Box>
      <Divider style={{ margin: '16px 0' }} />
      <Box>
        <Typography variant="caption" color="textSecondary">
          접근 역할
        </Typography>
        <Box display="flex" flexWrap="wrap" marginTop={0.5}>
          {item.accessRoles.map(r => (
            <Box key={r} marginRight={0.5} marginBottom={0.5}>
              <Chip label={r} size="small" />
            </Box>
          ))}
        </Box>
      </Box>
      <Box display="flex" marginTop={2}>
        <Box marginRight={1}>
          <Button variant="outlined" size="small" disabled>
            저장
          </Button>
        </Box>
        <Button variant="outlined" size="small" disabled>
          메뉴 이동
        </Button>
      </Box>
    </Paper>
  );
};
