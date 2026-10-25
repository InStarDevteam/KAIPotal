import { Box, Typography, Chip } from '@material-ui/core';
import { useAuthz, ROLE_LABELS } from '../authz';
import { colors } from '../common';
import { CurrentUser } from './types';

/** 환영 영역에 fixture의 이름·날짜·계정 상태를 실제 신원처럼 표시하지 않는다. */
export const DashboardHero = (_props: { fallbackUser: CurrentUser }) => {
  const { primaryRole } = useAuthz();
  return (
    <Box style={{ padding: '12px 0 4px' }}>
      <Typography
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: colors.primaryBlue,
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        YOUR INTELLIGENCE WORKSPACE
      </Typography>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        style={{ gap: 12 }}
      >
        <Typography
          component="h1"
          style={{
            fontSize: 'clamp(24px, 3vw, 34px)',
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.3,
          }}
        >
          오늘의 업무를 시작하세요
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          label={ROLE_LABELS[primaryRole]}
        />
      </Box>
      <Typography
        style={{
          marginTop: 12,
          fontSize: 14,
          lineHeight: 1.7,
          color: colors.textSecondary,
        }}
      >
        필요한 데이터와 AI 도구를 찾고, 프로젝트부터 작업환경까지 한곳에서
        관리하세요.
      </Typography>
    </Box>
  );
};
