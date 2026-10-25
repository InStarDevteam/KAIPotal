import React from 'react';
import { Box, Tooltip, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { colors, typographyTokens } from '../common/designTokens';

export type PortalJourneyStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface PortalJourneyStepDefinition {
  step: PortalJourneyStep;
  label: string;
  requirementIds: string[];
}

export const portalJourneySteps: PortalJourneyStepDefinition[] = [
  {
    step: 1,
    label: '체계접속',
    requirementIds: ['SFR-001', 'SFR-002', 'SFR-006', 'SFR-012'],
  },
  {
    step: 2,
    label: '인증·권한',
    requirementIds: ['SFR-003', 'SFR-004', 'SFR-005', 'SFR-021'],
  },
  { step: 3, label: '자산탐색', requirementIds: ['SFR-014', 'SFR-015'] },
  { step: 4, label: '프로젝트개설', requirementIds: ['SFR-016', 'TER-008'] },
  {
    step: 5,
    label: '작업환경생성',
    requirementIds: ['SFR-007', 'SFR-008', 'SFR-018'],
  },
  { step: 6, label: '자원사용관리', requirementIds: ['SFR-017'] },
  {
    step: 7,
    label: '성과반출',
    requirementIds: ['SFR-009', 'SFR-010', 'SFR-011'],
  },
  {
    step: 8,
    label: '운영·보안감사',
    requirementIds: [
      'SFR-004',
      'SFR-013',
      'SFR-019',
      'SFR-020',
      'SFR-021',
      'SER-002~008',
    ],
  },
];

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
  },
  rootSubdued: {
    backgroundColor: 'transparent',
    borderBottom: `1px solid ${colors.border}`,
    opacity: 0.9,
  },
  caption: {
    ...typographyTokens.caption,
    color: colors.textSecondary,
    flexShrink: 0,
    marginRight: 16,
    whiteSpace: 'nowrap',
  },
  scrollArea: {
    overflowX: 'auto',
    flex: 1,
  },
  track: {
    display: 'flex',
    alignItems: 'flex-start',
    minWidth: 'max-content',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 88,
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    borderRadius: 8,
    padding: '2px 4px',
    '&:hover': {
      backgroundColor: 'rgba(36, 95, 166, 0.06)',
    },
    '&:focus-visible': {
      outline: `2px solid ${colors.primaryBlue}`,
      outlineOffset: 1,
    },
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
    border: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    backgroundColor: colors.neutral.bg,
  },
  circleSubdued: {
    width: 22,
    height: 22,
    fontSize: 11,
  },
  circleActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
    color: colors.surface,
  },
  circleCompleted: {
    backgroundColor: colors.info.bg,
    borderColor: colors.primaryBlue,
    color: colors.primaryBlue,
  },
  label: {
    fontSize: 12,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    color: colors.textSecondary,
  },
  labelSubdued: {
    fontSize: 11,
  },
  labelActive: {
    color: colors.primaryNavy,
    fontWeight: 700,
  },
  labelCompleted: {
    color: colors.primaryBlue,
  },
  connector: {
    flex: 1,
    height: 1,
    minWidth: 16,
    marginTop: 14,
    backgroundColor: colors.border,
  },
  connectorSubdued: {
    marginTop: 13,
  },
});

export interface PortalJourneyBarProps {
  currentStep: PortalJourneyStep;
  /** true면 보조 흐름 표시용으로 전체 대비와 크기를 낮춘다 */
  subdued?: boolean;
}

export const PortalJourneyBar = ({
  currentStep,
  subdued = false,
}: PortalJourneyBarProps) => {
  const classes = useStyles();
  const rootClass = subdued
    ? `${classes.root} ${classes.rootSubdued}`
    : classes.root;
  const circleBase = subdued
    ? `${classes.circle} ${classes.circleSubdued}`
    : classes.circle;
  const labelBase = subdued
    ? `${classes.label} ${classes.labelSubdued}`
    : classes.label;
  const connectorClass = subdued
    ? `${classes.connector} ${classes.connectorSubdued}`
    : classes.connector;
  return (
    <Box className={rootClass} data-testid="portal-journey-bar">
      <Typography className={classes.caption}>플랫폼 이용 단계</Typography>
      <Box className={classes.scrollArea}>
        <Box className={classes.track}>
          {portalJourneySteps.map((definition, index) => {
            const isActive = definition.step === currentStep;
            const isCompleted = definition.step < currentStep;
            let circleClass = circleBase;
            if (isActive) {
              circleClass = `${circleBase} ${classes.circleActive}`;
            } else if (isCompleted) {
              circleClass = `${circleBase} ${classes.circleCompleted}`;
            }
            let labelClass = labelBase;
            if (isActive) {
              labelClass = `${labelBase} ${classes.labelActive}`;
            } else if (isCompleted) {
              labelClass = `${labelBase} ${classes.labelCompleted}`;
            }
            return (
              <React.Fragment key={definition.step}>
                {index > 0 && <Box className={connectorClass} />}
                <Box className={classes.step}>
                  <Tooltip title={definition.label} arrow placement="bottom">
                    <Box
                      className={classes.stepContent}
                      tabIndex={0}
                      aria-label={`${definition.step}단계: ${definition.label}`}
                    >
                      <Box className={circleClass}>{definition.step}</Box>
                      <Typography className={labelClass}>
                        {definition.label}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </React.Fragment>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};
