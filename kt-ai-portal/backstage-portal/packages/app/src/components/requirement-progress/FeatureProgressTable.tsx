import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Switch,
  FormControlLabel,
} from '@material-ui/core';
import { Link } from 'react-router-dom';
import { PortalFeatureRequirement } from './types';
import { FeatureFilters, filterFeatures } from './requirementProgressUtils';
import { RequirementStatusChip } from './RequirementStatusChip';
import { RequirementImpactChip } from './RequirementImpactChip';
import { RequirementPriorityChip } from './RequirementPriorityChip';
import { RequirementProgressFilterPanel } from './RequirementProgressFilterPanel';

const NEW_FEATURE_START = 156;

export const FeatureProgressTable: React.FC<{
  features: PortalFeatureRequirement[];
}> = ({ features }) => {
  const [filters, setFilters] = useState<FeatureFilters>({});
  const [onlyNew, setOnlyNew] = useState(false);

  const filtered = useMemo(() => {
    let result = filterFeatures(features, filters);
    if (onlyNew) {
      result = result.filter(f => f.no >= NEW_FEATURE_START);
    }
    return result;
  }, [features, filters, onlyNew]);

  return (
    <Box>
      <RequirementProgressFilterPanel filters={filters} onChange={setFilters} />
      <Box mb={2}>
        <FormControlLabel
          control={
            <Switch
              checked={onlyNew}
              onChange={e => setOnlyNew(e.target.checked)}
              color="primary"
            />
          }
          label="신규 기능 156~163만 보기"
        />
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>No</TableCell>
              <TableCell>기능구분</TableCell>
              <TableCell>대기능</TableCell>
              <TableCell>중기능</TableCell>
              <TableCell>상세기능</TableCell>
              <TableCell>RFP ID</TableCell>
              <TableCell>구현상태</TableCell>
              <TableCell>영향도</TableCell>
              <TableCell>우선순위</TableCell>
              <TableCell>관련 화면</TableCell>
              <TableCell>조치사항</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(feature => {
              const isNew = feature.no >= NEW_FEATURE_START;
              return (
                <TableRow
                  key={feature.no}
                  style={{
                    backgroundColor: isNew ? '#fffde7' : undefined,
                  }}
                >
                  <TableCell>
                    {feature.no}
                    {isNew && (
                      <Box
                        component="span"
                        ml={0.5}
                        style={{ color: '#d32f2f', fontWeight: 700 }}
                      >
                        신규
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{feature.category}</TableCell>
                  <TableCell>{feature.largeFunction}</TableCell>
                  <TableCell>{feature.middleFunction}</TableCell>
                  <TableCell>{feature.detailFunction}</TableCell>
                  <TableCell>{feature.rfpId}</TableCell>
                  <TableCell>
                    <RequirementStatusChip status={feature.implementationStatus} />
                  </TableCell>
                  <TableCell>
                    <RequirementImpactChip impact={feature.impact} />
                  </TableCell>
                  <TableCell>
                    <RequirementPriorityChip priority={feature.priority} />
                  </TableCell>
                  <TableCell>
                    {feature.relatedScreenRoute ? (
                      <Link to={feature.relatedScreenRoute}>이동</Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{feature.actionItem}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
