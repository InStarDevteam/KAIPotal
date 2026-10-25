import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import SearchIcon from '@material-ui/icons/Search';
import { makeStyles } from '@material-ui/core/styles';
import { colors, layoutTokens, shadows } from '../common';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    alignItems: 'stretch',
    border: `1px solid ${colors.border}`,
    borderRadius: layoutTokens.cardRadius,
    boxShadow: shadows.card,
    overflow: 'hidden',
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 16,
    color: colors.textSecondary,
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '12px',
    fontSize: '1rem',
  },
  submit: {
    borderRadius: 0,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: colors.primaryBlue,
    color: '#FFFFFF',
    boxShadow: 'none',
    '&:hover': {
      backgroundColor: colors.primaryNavy,
      boxShadow: 'none',
    },
  },
});

export const DashboardSearchBox = () => {
  const classes = useStyles();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/integrated-search?q=${encodeURIComponent(query)}`);
  };

  return (
    <Paper
      component="form"
      elevation={0}
      onSubmit={handleSubmit}
      className={classes.form}
    >
      <Box className={classes.iconWrap}>
        <SearchIcon />
      </Box>
      <InputBase
        fullWidth
        inputProps={{ 'aria-label': '자산 검색어' }}
        placeholder="데이터셋, AI 모델, Docker 이미지, PyPI 패키지, 문서를 검색하세요"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className={classes.input}
      />
      <Button
        type="submit"
        variant="contained"
        disableElevation
        aria-label="search"
        className={classes.submit}
        startIcon={<SearchIcon />}
      >
        검색
      </Button>
    </Paper>
  );
};
