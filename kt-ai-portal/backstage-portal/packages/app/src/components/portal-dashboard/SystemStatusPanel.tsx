import { useEffect, useState } from 'react';
import { Box, Typography } from '@material-ui/core';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { SectionCard, StatusChip } from '../common';
import { SystemStatusItem } from './types';

/** 고정 '정상' 배지 대신 배포된 BFF의 DB 준비 상태를 확인한다. */
export const SystemStatusPanel = (_props: { systems: SystemStatusItem[] }) => {
  const config = useApi(configApiRef);
  const baseUrl = config.getString('backend.baseUrl');
  const [state, setState] = useState<'checking' | 'connected' | 'unavailable'>(
    'checking',
  );
  const [checkedAt, setCheckedAt] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${baseUrl}/api/portal/v1/health`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async response => {
        if (
          !response.ok ||
          !response.headers.get('content-type')?.includes('application/json')
        )
          throw new Error('unavailable');
        const body = await response.json();
        if (body.data?.status !== 'ok') throw new Error('unavailable');
        setState('connected');
        setCheckedAt(new Date().toLocaleTimeString('ko-KR'));
      })
      .catch(() => setState('unavailable'))
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [baseUrl]);
  return (
    <SectionCard title="서비스 연결 상태">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={2}
      >
        <Typography variant="body2">포털 업무 서비스</Typography>
        <StatusChip
          tone={state === 'connected' ? 'success' : 'neutral'}
          label={
            {
              checking: '확인 중',
              connected: '연결됨',
              unavailable: '연결 확인 필요',
            }[state]
          }
        />
      </Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2">자산 검색·원천 연계</Typography>
        <StatusChip tone="neutral" label="연동 준비 중" />
      </Box>
      {checkedAt && (
        <Typography variant="caption" color="textSecondary">
          {checkedAt} 확인 · 업무 서비스와 데이터베이스
        </Typography>
      )}
    </SectionCard>
  );
};
