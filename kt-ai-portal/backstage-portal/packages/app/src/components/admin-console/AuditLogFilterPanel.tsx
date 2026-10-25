import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

export const AuditLogFilterPanel = () => {
  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600 }}>
        감사로그 필터
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField label="시작일" type="date" fullWidth InputLabelProps={{ shrink: true }} disabled />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField label="종료일" type="date" fullWidth InputLabelProps={{ shrink: true }} disabled />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField label="사용자" fullWidth disabled />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField label="이벤트 유형" fullWidth disabled />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField label="결과" fullWidth disabled />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField label="위험도" fullWidth disabled />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField label="서비스" fullWidth disabled />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField label="IP" fullWidth disabled />
        </Grid>
      </Grid>
      <Box display="flex" marginTop={2}>
        <Box marginRight={1}>
          <Button variant="outlined" size="small" disabled>
            검색
          </Button>
        </Box>
        <Button variant="outlined" size="small" disabled>
          초기화
        </Button>
      </Box>
    </Box>
  );
};
