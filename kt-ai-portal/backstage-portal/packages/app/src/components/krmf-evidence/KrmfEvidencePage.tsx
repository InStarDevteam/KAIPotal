import { useState, useMemo } from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import { makeStyles } from '@material-ui/core/styles';
import {
  colors,
  layoutTokens,
  shadows,
  PageHeader,
  RoleBadge,
} from '../common';
import { useAuthz } from '../authz';
import {
  mockControlItems,
  mockEvidenceList,
  mockRiskIssues,
  mockExternalSubmissions,
  mockImplementationPlans,
  mockAssessments,
  mockOperationalTransitions,
  mockChangeImpacts,
} from './mockKrmfEvidence';
import { KrmfDashboard } from './KrmfDashboard';
import { KrmfLifecycleStepper } from './KrmfLifecycleStepper';
import { ControlItemList } from './ControlItemList';
import { ControlItemDetail } from './ControlItemDetail';
import { ImplementationPlanPanel } from './ImplementationPlanPanel';
import { EvidenceList } from './EvidenceList';
import { RiskIssueList } from './RiskIssueList';
import { ExternalSubmissionList } from './ExternalSubmissionList';
import { AssessmentSupportPanel } from './AssessmentSupportPanel';
import { OperationTransitionPanel } from './OperationTransitionPanel';
import { ControlItem, ControlArea } from './types';

const areaLabels: Record<ControlArea, string> = {
  access_control: '접근통제',
  account_management: '계정관리',
  log_management: '로그관리',
  encryption: '암호화',
  network_security: '네트워크 보안',
  vulnerability_management: '취약점 관리',
  data_protection: '데이터 보호',
  backup_recovery: '백업/복구',
  change_management: '변경관리',
  security_audit: '보안감사',
  security_requirement_plan: '보안요구사항 이행계획',
  krmf_standard: 'K-RMF 적용기준 관리',
  control_implementation: '보안통제항목 이행관리',
  security_plan: '보안계획서',
  evidence_submission: '구현증적 제출',
  security_evaluation: '보안평가·후속조치·인가',
  operational_transition: '운영전환·모니터링 준비',
};

const useStyles = makeStyles(theme => ({
  tabBar: {
    marginBottom: theme.spacing(3),
    position: 'sticky',
    top: 0,
    zIndex: theme.zIndex.appBar - 1,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: layoutTokens.cardRadius,
    boxShadow: shadows.card,
  },
  tabRoot: {
    minHeight: 48,
    height: 48,
  },
  tabSelected: {
    color: colors.primaryBlue,
    fontWeight: 600,
  },
  tabIndicator: {
    height: 3,
    backgroundColor: colors.primaryBlue,
  },
}));

export const KrmfEvidencePage = () => {
  const classes = useStyles();
  const { primaryRole } = useAuthz();
  const [tab, setTab] = useState(0);
  const [selectedControl, setSelectedControl] = useState<ControlItem | undefined>(
    mockControlItems[0],
  );
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredControls = useMemo(() => {
    return mockControlItems.filter(control => {
      const matchesArea = areaFilter === 'all' || control.area === areaFilter;
      const matchesStatus =
        statusFilter === 'all' || control.checkStatus === statusFilter;
      const matchesSearch =
        search.trim() === '' ||
        control.name.includes(search) ||
        control.id.includes(search) ||
        control.owner.includes(search);
      return matchesArea && matchesStatus && matchesSearch;
    });
  }, [areaFilter, statusFilter, search]);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="K-RMF 이행·증적관리"
        description={
          '본 기능은 K-RMF 통제 구현, 증적 축적, 평가 준비, 보완조치 및 운영 중 ' +
          '변경영향 추적을 지원합니다. 통제항목 선정·제외·대체 승인과 평가·인가의 ' +
          '최종 판단은 소요기관 권한입니다.'
        }
        actions={<RoleBadge role={primaryRole} />}
      />

      <KrmfLifecycleStepper activeStage={4} />

      <Paper className={classes.tabBar}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          classes={{ indicator: classes.tabIndicator }}
        >
          <Tab classes={{ root: classes.tabRoot, selected: classes.tabSelected }} label="대시보드" />
          <Tab classes={{ root: classes.tabRoot, selected: classes.tabSelected }} label="통제항목" />
          <Tab classes={{ root: classes.tabRoot, selected: classes.tabSelected }} label="이행계획" />
          <Tab classes={{ root: classes.tabRoot, selected: classes.tabSelected }} label="증빙자료" />
          <Tab classes={{ root: classes.tabRoot, selected: classes.tabSelected }} label="미흡·보완조치" />
          <Tab classes={{ root: classes.tabRoot, selected: classes.tabSelected }} label="타 수행사 자료" />
          <Tab classes={{ root: classes.tabRoot, selected: classes.tabSelected }} label="평가·인가 지원" />
          <Tab classes={{ root: classes.tabRoot, selected: classes.tabSelected }} label="운영전환·변경관리" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <KrmfDashboard
          controls={mockControlItems}
          evidences={mockEvidenceList}
          issues={mockRiskIssues}
        />
      )}

      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper style={{ padding: 16, marginBottom: 16 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="검색"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="통제영역"
                    value={areaFilter}
                    onChange={e => setAreaFilter(e.target.value)}
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="all">전체</MenuItem>
                    {Object.entries(areaLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="점검 상태"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="not_checked">미점검</MenuItem>
                    <MenuItem value="preparing">준비중</MenuItem>
                    <MenuItem value="checking">점검중</MenuItem>
                    <MenuItem value="compliant">적합</MenuItem>
                    <MenuItem value="non_compliant">미흡</MenuItem>
                    <MenuItem value="remediating">보완중</MenuItem>
                    <MenuItem value="completed">완료</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid item xs={12} md={7}>
            <ControlItemList
              controls={filteredControls}
              selectedId={selectedControl?.id}
              onSelect={setSelectedControl}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            {selectedControl ? (
              <ControlItemDetail control={selectedControl} />
            ) : (
              <Paper style={{ padding: 24 }}>
                <Typography color="textSecondary">
                  통제항목을 선택하면 상세 정보가 표시됩니다.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <ImplementationPlanPanel
          plans={mockImplementationPlans}
          controls={mockControlItems}
        />
      )}

      {tab === 3 && (
        <EvidenceList evidences={mockEvidenceList} controls={mockControlItems} />
      )}

      {tab === 4 && (
        <RiskIssueList issues={mockRiskIssues} controls={mockControlItems} />
      )}

      {tab === 5 && (
        <ExternalSubmissionList
          submissions={mockExternalSubmissions}
          controls={mockControlItems}
        />
      )}

      {tab === 6 && (
        <AssessmentSupportPanel
          assessments={mockAssessments}
          evidences={mockEvidenceList}
        />
      )}

      {tab === 7 && (
        <OperationTransitionPanel
          transitions={mockOperationalTransitions}
          changeImpacts={mockChangeImpacts}
        />
      )}
    </div>
  );
};
