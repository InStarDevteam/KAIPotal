import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Grid,
} from '@material-ui/core';
import { FeatureFilters } from './requirementProgressUtils';
import { RequirementImplementationStatus, RequirementImpact, RequirementPriority } from './types';

const sfrOptions = [
  '',
  'SFR-001',
  'SFR-002',
  'SFR-003',
  'SFR-004',
  'SFR-005',
  'SFR-006',
  'SFR-007',
  'SFR-008',
  'SFR-009',
  'SFR-010',
  'SFR-011',
  'SFR-012',
  'SFR-013',
  'SFR-014',
  'SFR-015',
  'SFR-016',
  'SFR-017',
  'SFR-018',
  'SFR-019',
  'SFR-020',
  'SFR-021',
];

const statusOptions: (RequirementImplementationStatus | '')[] = [
  '',
  '화면구현',
  '부분구현',
  '후속개발',
  '미구현',
  '검토필요',
];

const impactOptions: (RequirementImpact | '')[] = ['', '낮음', '중간', '높음'];
const priorityOptions: (RequirementPriority | '')[] = ['', '하', '중', '상'];

interface RequirementProgressFilterPanelProps {
  filters: FeatureFilters;
  onChange: (filters: FeatureFilters) => void;
}

export const RequirementProgressFilterPanel: React.FC<
  RequirementProgressFilterPanelProps
> = ({ filters, onChange }) => {
  const update = (patch: Partial<FeatureFilters>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <Box mb={2}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="filter-sfr">SFR ID</InputLabel>
            <Select
              labelId="filter-sfr"
              value={filters.sfrId ?? ''}
              onChange={e => update({ sfrId: e.target.value as string })}
              label="SFR ID"
            >
              {sfrOptions.map(o => (
                <MenuItem key={o} value={o}>
                  {o || '전체'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="filter-status">구현상태</InputLabel>
            <Select
              labelId="filter-status"
              value={filters.status ?? ''}
              onChange={e =>
                update({ status: e.target.value as RequirementImplementationStatus })
              }
              label="구현상태"
            >
              {statusOptions.map(o => (
                <MenuItem key={o} value={o}>
                  {o || '전체'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="filter-impact">영향도</InputLabel>
            <Select
              labelId="filter-impact"
              value={filters.impact ?? ''}
              onChange={e => update({ impact: e.target.value as RequirementImpact })}
              label="영향도"
            >
              {impactOptions.map(o => (
                <MenuItem key={o} value={o}>
                  {o || '전체'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="filter-priority">우선순위</InputLabel>
            <Select
              labelId="filter-priority"
              value={filters.priority ?? ''}
              onChange={e =>
                update({ priority: e.target.value as RequirementPriority })
              }
              label="우선순위"
            >
              {priorityOptions.map(o => (
                <MenuItem key={o} value={o}>
                  {o || '전체'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            label="키워드 검색"
            placeholder="기능명, 상세기능, 조치사항 등"
            value={filters.keyword ?? ''}
            onChange={e => update({ keyword: e.target.value })}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
