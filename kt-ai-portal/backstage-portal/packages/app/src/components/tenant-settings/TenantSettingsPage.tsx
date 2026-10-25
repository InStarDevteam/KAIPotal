import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import RestoreIcon from '@material-ui/icons/Restore';
import PaletteOutlinedIcon from '@material-ui/icons/PaletteOutlined';
import ViewListOutlinedIcon from '@material-ui/icons/ViewListOutlined';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import { useAuthz } from '../authz';
import { portalMenuDefinitions, portalMenuGroups } from '../navigation';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { PlatformAccessManagementPanel } from './PlatformAccessManagementPanel';
import {
  HOME_DESIGNS,
  clearHomeDesignSelection,
} from '../portal-home/homeDesign';
import { APPEARANCE_SURFACES } from '../portal-home/appearanceModel';
import { useTenantSettings } from './TenantSettingsContext';
import {
  defaultTenantSettings,
  PROTECTED_MENU_IDS,
  PORTAL_FONT_SCALES,
  PORTAL_FONT_LABELS,
  safeLogoUrl,
  TenantBranding,
  TenantSettings,
  validateTenantSettings,
  whiteContrast,
} from './settingsModel';

const useStyles = makeStyles(theme => ({
  root: { display: 'grid', gap: 20 },
  heading: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  eyebrow: {
    color: theme.palette.primary.main,
    fontSize: 'calc(12px * var(--portal-font-scale, 1))',
    fontWeight: 700,
    marginBottom: 8,
  },
  title: {
    fontSize: 'calc(26px * var(--portal-font-scale, 1))',
    fontWeight: 700,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#667085',
    fontSize: 'calc(14px * var(--portal-font-scale, 1))',
    marginTop: 8,
    lineHeight: 1.7,
  },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)',
    alignItems: 'start',
    gap: 20,
    '@media(max-width:1100px)': { gridTemplateColumns: '1fr' },
  },
  panel: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: 'none',
  },
  section: {
    padding: 24,
    display: 'grid',
    gap: 20,
    '@media(max-width:600px)': { padding: 16 },
  },
  sectionTitle: {
    fontSize: 'calc(16px * var(--portal-font-scale, 1))',
    fontWeight: 700,
  },
  designOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    '@media(max-width:450px)': { gridTemplateColumns: '1fr' },
  },
  designChoice: {
    minHeight: 106,
    padding: 16,
    justifyContent: 'flex-start',
    textAlign: 'left',
    borderRadius: 12,
    '& > span': { display: 'grid', gap: 5, width: '100%' },
  },
  designDescription: {
    fontSize: 'calc(12px * var(--portal-font-scale, 1))',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  fields: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    '@media(max-width:600px)': { gridTemplateColumns: '1fr' },
  },
  colorField: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  swatch: {
    height: 40,
    width: 44,
    border: '1px solid #d0d5dd',
    borderRadius: 8,
    padding: 3,
    cursor: 'pointer',
    background: '#fff',
    flexShrink: 0,
  },
  preview: {
    position: 'sticky',
    top: 84,
    '@media(max-width:1100px)': { position: 'static' },
  },
  previewHeader: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    padding: '18px 20px',
    borderBottom: '1px solid #e2e8f0',
  },
  previewLogo: { width: 36, height: 36, objectFit: 'contain', borderRadius: 8 },
  previewBody: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    minHeight: 244,
  },
  previewNav: {
    padding: '14px 10px',
    borderRight: '1px solid #e2e8f0',
    fontSize: 'calc(11px * var(--portal-font-scale, 1))',
    '& div': {
      borderRadius: 6,
      padding: '8px 6px',
      marginBottom: 5,
      overflowWrap: 'anywhere',
    },
  },
  previewContent: {
    background: '#f8fafc',
    padding: '20px 16px',
    overflowWrap: 'anywhere',
  },
  menuRow: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    gap: 10,
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid #eef2f6',
    '@media(max-width:600px)': { gap: 4 },
  },
  menuOrder: {
    fontSize: 'calc(12px * var(--portal-font-scale, 1))',
    color: '#667085',
    width: 24,
  },
  menuActions: {
    display: 'flex',
    alignItems: 'center',
    '@media(max-width:600px)': { flexWrap: 'wrap', maxWidth: 90 },
  },
  helper: {
    fontSize: 'calc(12px * var(--portal-font-scale, 1))',
    color: '#667085',
    lineHeight: 1.6,
  },
  status: {
    fontSize: 'calc(12px * var(--portal-font-scale, 1))',
    color: '#667085',
  },
}));

export function TenantSettingsPage() {
  const classes = useStyles();
  const { tenantId, tenants, isDemo } = usePortalRuntime();
  const { hasAnyPermission, hasPermission, primaryRole } = useAuthz();
  const {
    settings,
    loading,
    saving,
    error,
    reload,
    saveSettings,
    setHasUnsavedChanges,
  } = useTenantSettings();
  const [draft, setDraft] = useState<TenantSettings>(settings);
  const [tab, setTab] = useState(0);
  const [message, setMessage] = useState<{
    severity: 'success' | 'error';
    text: string;
  }>();
  const [resetOpen, setResetOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const tenant = tenants.find(item => item.id === tenantId);
  const canBrand = hasAnyPermission(['tenant.manage', 'settings.manage']);
  const canMenu = hasPermission('menu.manage');
  const canEdit = canBrand || canMenu;
  const dirty = JSON.stringify(settings) !== JSON.stringify(draft);
  const errors = useMemo(() => validateTenantSettings(draft), [draft]);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);
  useEffect(() => {
    setMessage(undefined);
  }, [tenantId, primaryRole]);
  useEffect(() => {
    setLogoFailed(false);
  }, [draft.branding.logoUrl]);
  useEffect(() => {
    setHasUnsavedChanges(dirty);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      setHasUnsavedChanges(false);
    };
  }, [dirty, setHasUnsavedChanges]);

  const updateBranding = <K extends keyof TenantBranding>(
    key: K,
    value: TenantBranding[K],
  ) => {
    setMessage(undefined);
    setDraft(current => ({
      ...current,
      branding: { ...current.branding, [key]: value },
    }));
  };
  const updateMenu = (
    id: string,
    update: { label?: string; visible?: boolean },
  ) => {
    setMessage(undefined);
    setDraft(current => ({
      ...current,
      menus: current.menus.map(menu =>
        menu.id === id ? { ...menu, ...update } : menu,
      ),
    }));
  };
  const moveMenu = (id: string, offset: number) => {
    const definition = portalMenuDefinitions.find(menu => menu.id === id);
    const groupIds = portalMenuDefinitions
      .filter(menu => menu.group === definition?.group)
      .map(menu => menu.id);
    const grouped = draft.menus
      .filter(menu => groupIds.includes(menu.id))
      .sort((a, b) => a.order - b.order);
    const index = grouped.findIndex(menu => menu.id === id);
    const adjacent = grouped[index + offset];
    if (!adjacent) return;
    const current = grouped[index];
    setDraft(previous => ({
      ...previous,
      menus: previous.menus.map(menu => {
        if (menu.id === current.id) return { ...menu, order: adjacent.order };
        if (menu.id === adjacent.id) return { ...menu, order: current.order };
        return menu;
      }),
    }));
  };
  const save = async () => {
    setMessage(undefined);
    try {
      await saveSettings(draft);
      clearHomeDesignSelection();
      setMessage({
        severity: 'success',
        text: '포털 설정을 저장했습니다. 메뉴와 테마에 바로 반영되었습니다.',
      });
    } catch (cause) {
      setMessage({
        severity: 'error',
        text:
          cause instanceof Error
            ? cause.message
            : '설정을 저장하지 못했습니다.',
      });
    }
  };
  const primary = /^#[0-9a-f]{6}$/i.test(draft.branding.primaryColor)
    ? draft.branding.primaryColor
    : '#39467a';
  const accent = /^#[0-9a-f]{6}$/i.test(draft.branding.accentColor)
    ? draft.branding.accentColor
    : '#8f81c7';
  const branding = draft.branding;
  const previewDesign = branding.design ?? 'aurora';
  const previewPalette = APPEARANCE_SURFACES[previewDesign];

  return (
    <div className={classes.root} data-testid="tenant-settings-page">
      <div className={classes.heading}>
        <div>
          <Typography className={classes.eyebrow}>
            {tenant?.name || '군별 포털'} · 운영 설정
          </Typography>
          <Typography component="h1" className={classes.title}>
            군별 포털 설정
          </Typography>
          <Typography className={classes.subtitle}>
            소속 군의 디자인과 글자 크기, 색상과 메뉴를 한곳에서 관리하세요.
          </Typography>
        </div>
        <div className={classes.actions}>
          <Chip
            size="small"
            variant="outlined"
            label={dirty ? '저장하지 않은 변경' : '저장된 설정'}
          />
          <Button
            startIcon={<RestoreIcon />}
            variant="outlined"
            disabled={!canEdit || loading || saving}
            onClick={() => setResetOpen(true)}
          >
            기본값 복원
          </Button>
          <Button
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveOutlinedIcon />
              )
            }
            color="primary"
            variant="contained"
            disableElevation
            disabled={
              !canEdit ||
              !dirty ||
              loading ||
              saving ||
              errors.length > 0 ||
              !!error
            }
            onClick={save}
          >
            변경사항 저장
          </Button>
        </div>
      </div>
      {isDemo && (
        <Alert severity="info">
          데모 모드입니다. 설정은 현재 브라우저에 군별로 저장되며 실제 운영
          설정에 반영되지 않습니다.
        </Alert>
      )}
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              다시 불러오기
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {message && (
        <Alert
          severity={message.severity}
          onClose={() => setMessage(undefined)}
          action={
            message.severity === 'error' ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => (dirty ? setReloadOpen(true) : reload())}
              >
                다시 불러오기
              </Button>
            ) : undefined
          }
        >
          {message.text}
        </Alert>
      )}
      {!canEdit && (
        <Alert severity="warning">
          포털 설정은 소속 군 관리자 또는 포털 관리자가 변경할 수 있습니다.
        </Alert>
      )}
      {loading ? (
        <div role="status" style={{ padding: 48, textAlign: 'center' }}>
          <CircularProgress size={28} />
          <Typography>포털 설정을 불러오는 중입니다.</Typography>
        </div>
      ) : (
        <div className={classes.layout}>
          <Paper className={classes.panel}>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              indicatorColor="primary"
              textColor="primary"
              aria-label="포털 설정 종류"
            >
              <Tab
                label="테마와 공통 문구"
                icon={<PaletteOutlinedIcon />}
                id="branding-tab"
                aria-controls="branding-panel"
              />
              <Tab
                label="메뉴 구성"
                icon={<ViewListOutlinedIcon />}
                id="menus-tab"
                aria-controls="menus-panel"
              />
            </Tabs>
            <Divider />
            {tab === 0 ? (
              <div
                className={classes.section}
                role="tabpanel"
                id="branding-panel"
                aria-labelledby="branding-tab"
              >
                <Typography className={classes.sectionTitle}>
                  우리 군의 포털 디자인
                </Typography>
                <Typography className={classes.helper}>
                  로그인 후 홈과 모든 업무 화면에 같은 디자인을 적용합니다.
                  사용자가 개인 화면 설정을 저장한 경우에는 해당 설정을
                  우선합니다.
                </Typography>
                <div
                  className={classes.designOptions}
                  role="group"
                  aria-label="군 기본 디자인"
                >
                  {HOME_DESIGNS.map(design => (
                    <Button
                      key={design.id}
                      variant="outlined"
                      color={
                        (branding.design ?? 'aurora') === design.id
                          ? 'primary'
                          : 'default'
                      }
                      className={classes.designChoice}
                      aria-pressed={(branding.design ?? 'aurora') === design.id}
                      aria-label={`군 기본 디자인 ${design.name}`}
                      disabled={!canBrand || saving}
                      onClick={() => updateBranding('design', design.id)}
                    >
                      <strong>
                        {design.number} · {design.name}
                      </strong>
                      <span className={classes.designDescription}>
                        {design.description}
                      </span>
                    </Button>
                  ))}
                </div>
                <TextField
                  id="branding-font-scale"
                  label="군 기본 글자 크기"
                  select
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={branding.fontScale ?? 1}
                  onChange={event =>
                    updateBranding('fontScale', Number(event.target.value))
                  }
                  disabled={!canBrand || saving}
                  helperText="메뉴, 입력 항목, 표와 안내 문구에 적용됩니다. 개인 설정에서 변경할 수 있습니다."
                >
                  {PORTAL_FONT_SCALES.map(scale => (
                    <MenuItem key={scale} value={scale}>
                      {PORTAL_FONT_LABELS[scale]} · {Math.round(scale * 100)}%
                    </MenuItem>
                  ))}
                </TextField>
                <Divider />
                <div className={classes.fields}>
                  {(['primaryColor', 'accentColor'] as const).map(
                    (key, index) => (
                      <div key={key} className={classes.colorField}>
                        <input
                          type="color"
                          className={classes.swatch}
                          aria-label={
                            index === 0 ? '대표 색상 선택' : '강조 색상 선택'
                          }
                          value={index === 0 ? primary : accent}
                          onChange={event =>
                            updateBranding(key, event.target.value)
                          }
                          disabled={!canBrand || saving}
                        />
                        <TextField
                          id={`branding-${key}`}
                          label={index === 0 ? '대표 색상' : '강조 색상'}
                          variant="outlined"
                          size="small"
                          fullWidth
                          value={branding[key]}
                          onChange={event =>
                            updateBranding(key, event.target.value)
                          }
                          disabled={!canBrand || saving}
                          error={
                            !/^#[0-9a-f]{6}$/i.test(branding[key]) ||
                            (index === 0 && whiteContrast(branding[key]) < 4.5)
                          }
                          helperText={
                            index === 0
                              ? `흰 글자 명암비 ${whiteContrast(
                                  branding[key],
                                ).toFixed(1)}:1 · 최소 4.5:1`
                              : '구분선과 강조 영역에 적용됩니다.'
                          }
                          inputProps={{ maxLength: 7 }}
                        />
                      </div>
                    ),
                  )}
                </div>
                <TextField
                  id="branding-logo"
                  label="로고 이미지 주소"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={branding.logoUrl}
                  onChange={event =>
                    updateBranding('logoUrl', event.target.value.trim())
                  }
                  disabled={!canBrand || saving}
                  error={!safeLogoUrl(branding.logoUrl)}
                  helperText="HTTPS 주소 또는 /assets/logo.png와 같은 내부 경로. 비우면 약칭을 표시합니다."
                  inputProps={{ maxLength: 2048 }}
                />
                <Divider />
                <Typography className={classes.sectionTitle}>
                  이름과 안내 문구
                </Typography>
                <div className={classes.fields}>
                  <TextField
                    id="branding-title"
                    label="포털 이름"
                    variant="outlined"
                    size="small"
                    fullWidth
                    required
                    value={branding.portalTitle}
                    onChange={event =>
                      updateBranding('portalTitle', event.target.value)
                    }
                    disabled={!canBrand || saving}
                    error={!branding.portalTitle.trim()}
                    helperText={`${branding.portalTitle.length}/80 · 상단에 표시`}
                    inputProps={{ maxLength: 80 }}
                  />
                  <TextField
                    id="branding-short-name"
                    label="약칭"
                    variant="outlined"
                    size="small"
                    fullWidth
                    required
                    value={branding.shortName}
                    onChange={event =>
                      updateBranding('shortName', event.target.value)
                    }
                    disabled={!canBrand || saving}
                    error={!branding.shortName.trim()}
                    helperText={`${branding.shortName.length}/24 · 로고 대체 텍스트`}
                    inputProps={{ maxLength: 24 }}
                  />
                </div>
                <TextField
                  id="branding-welcome"
                  label="환영 문구"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={branding.welcomeText}
                  onChange={event =>
                    updateBranding('welcomeText', event.target.value)
                  }
                  disabled={!canBrand || saving}
                  helperText={`${branding.welcomeText.length}/160 · 홈 화면 상단에 표시`}
                  inputProps={{ maxLength: 160 }}
                />
                <TextField
                  id="branding-support"
                  label="도움말 문구"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={branding.supportText}
                  onChange={event =>
                    updateBranding('supportText', event.target.value)
                  }
                  disabled={!canBrand || saving}
                  helperText={`${branding.supportText.length}/160 · 공통 도움말에 표시`}
                  inputProps={{ maxLength: 160 }}
                />
              </div>
            ) : (
              <div
                className={classes.section}
                role="tabpanel"
                id="menus-panel"
                aria-labelledby="menus-tab"
              >
                <div>
                  <Typography className={classes.sectionTitle}>
                    메뉴 표시와 순서
                  </Typography>
                  <Typography className={classes.helper}>
                    이름·표시 여부와 그룹 안의 순서를 변경할 수 있습니다. 표시한
                    메뉴도 사용자의 권한에 따라 접근이 제한됩니다.
                  </Typography>
                </div>
                {portalMenuGroups.map(group => {
                  const ids = portalMenuDefinitions
                    .filter(menu => menu.group === group)
                    .map(menu => menu.id);
                  const menus = draft.menus
                    .filter(menu => ids.includes(menu.id))
                    .sort((a, b) => a.order - b.order);
                  if (!menus.length) return null;
                  return (
                    <div key={group}>
                      <Typography
                        className={classes.sectionTitle}
                        style={{ fontSize: 13 }}
                      >
                        {group}
                      </Typography>
                      {menus.map((menu, index) => (
                        <div key={menu.id} className={classes.menuRow}>
                          <span className={classes.menuOrder}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <TextField
                              variant="outlined"
                              size="small"
                              fullWidth
                              label={
                                portalMenuDefinitions.find(
                                  definition => definition.id === menu.id,
                                )?.title
                              }
                              value={menu.label}
                              onChange={event =>
                                updateMenu(menu.id, {
                                  label: event.target.value,
                                })
                              }
                              disabled={!canMenu || saving}
                              error={!menu.label.trim()}
                              inputProps={{
                                maxLength: 40,
                                'aria-label': `${
                                  portalMenuDefinitions.find(
                                    definition => definition.id === menu.id,
                                  )?.title
                                } 표시 이름`,
                              }}
                            />
                          </div>
                          <div className={classes.menuActions}>
                            <Tooltip title="위로 이동">
                              <span>
                                <IconButton
                                  size="small"
                                  aria-label={`${menu.label} 위로 이동`}
                                  disabled={index === 0 || !canMenu || saving}
                                  onClick={() => moveMenu(menu.id, -1)}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="아래로 이동">
                              <span>
                                <IconButton
                                  size="small"
                                  aria-label={`${menu.label} 아래로 이동`}
                                  disabled={
                                    index === menus.length - 1 ||
                                    !canMenu ||
                                    saving
                                  }
                                  onClick={() => moveMenu(menu.id, 1)}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            {PROTECTED_MENU_IDS.includes(menu.id) ? (
                              <Tooltip title="항상 표시하는 필수 메뉴">
                                <span style={{ padding: '8px 12px' }}>
                                  <LockOutlinedIcon
                                    fontSize="small"
                                    color="disabled"
                                    aria-label="필수 메뉴"
                                  />
                                </span>
                              </Tooltip>
                            ) : (
                              <Switch
                                size="small"
                                color="primary"
                                checked={menu.visible}
                                disabled={!canMenu || saving}
                                onChange={(_, visible) =>
                                  updateMenu(menu.id, { visible })
                                }
                                inputProps={{
                                  'aria-label': `${menu.label} 표시`,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
            {errors.length > 0 && (
              <Alert severity="warning" style={{ margin: 16 }}>
                {errors[0]}
              </Alert>
            )}
            <Divider />
            <div
              className={classes.section}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <Typography className={classes.status}>
                {dirty
                  ? '미리보기를 확인한 후 저장하세요.'
                  : '저장된 설정이 포털에 적용되어 있습니다.'}
              </Typography>
              <Button
                disabled={!dirty || saving}
                onClick={() => {
                  setDraft(settings);
                  setMessage(undefined);
                }}
              >
                변경 취소
              </Button>
            </div>
          </Paper>
          <div className={classes.preview}>
            <Typography
              className={classes.sectionTitle}
              style={{ marginBottom: 12 }}
            >
              적용 전 미리보기
            </Typography>
            <Paper
              className={classes.panel}
              data-preview-design={previewDesign}
              style={{
                borderTop: `3px solid ${accent}`,
                background: previewPalette.surface,
                color: previewPalette.text,
              }}
            >
              <div
                className={classes.previewHeader}
                style={{
                  background: previewPalette.header,
                  color: previewPalette.headerText,
                }}
              >
                {branding.logoUrl &&
                safeLogoUrl(branding.logoUrl) &&
                !logoFailed ? (
                  <img
                    src={branding.logoUrl}
                    alt="포털 로고 미리보기"
                    className={classes.previewLogo}
                    onError={() => setLogoFailed(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={classes.previewLogo}
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      background: primary,
                      color: whiteContrast(primary) >= 4.5 ? '#fff' : '#172033',
                      fontSize: 11,
                      fontWeight: 700,
                      overflow: 'hidden',
                    }}
                  >
                    {branding.shortName}
                  </div>
                )}
                <Typography
                  style={{
                    fontSize: 13 * (branding.fontScale ?? 1),
                    fontWeight: 700,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {branding.portalTitle || '포털 이름'}
                </Typography>
              </div>
              <div className={classes.previewBody}>
                <div
                  className={classes.previewContent}
                  style={{
                    background: previewPalette.surface,
                    color: previewPalette.text,
                  }}
                >
                  <Chip
                    size="small"
                    label={tenant?.name || '선택한 군'}
                    style={{
                      background: accent,
                      color: whiteContrast(accent) >= 4.5 ? '#fff' : '#172033',
                      marginBottom: 14,
                    }}
                  />
                  <Typography
                    style={{
                      fontSize: 16 * (branding.fontScale ?? 1),
                      fontWeight: 700,
                      marginBottom: 10,
                    }}
                  >
                    환영합니다
                  </Typography>
                  <Typography
                    style={{
                      fontSize: 12 * (branding.fontScale ?? 1),
                      lineHeight: 1.8,
                    }}
                  >
                    {branding.welcomeText}
                  </Typography>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      marginTop: 20,
                    }}
                  >
                    {[
                      'AI 플랫폼',
                      '데이터 플랫폼',
                      '클라우드 플랫폼',
                      'VDI',
                    ].map(name => (
                      <div
                        key={name}
                        style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '18px 6px',
                          textAlign: 'center',
                          color: primary,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div
                style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}
              >
                <Typography className={classes.helper}>
                  {branding.supportText || '도움말 문구가 설정되지 않았습니다.'}
                </Typography>
              </div>
            </Paper>
            {logoFailed && (
              <Alert severity="warning" style={{ marginTop: 12 }}>
                이미지를 불러올 수 없어 약칭을 표시합니다. 로고 주소와 접근
                권한을 확인하세요.
              </Alert>
            )}
            <Typography className={classes.helper} style={{ marginTop: 12 }}>
              {
                HOME_DESIGNS.find(
                  item => item.id === (branding.design ?? 'aurora'),
                )?.name
              }
              {' · '}글자 크기 {Math.round((branding.fontScale ?? 1) * 100)}%
              <br />
              저장하면 현재 군의 포털 전체에 반영됩니다. 개인 화면 설정은
              유지됩니다.
            </Typography>
          </div>
        </div>
      )}
      <PlatformAccessManagementPanel section="platforms" />
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        aria-labelledby="reset-settings-title"
      >
        <DialogTitle id="reset-settings-title">
          기본 설정으로 되돌릴까요?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            수정 가능한 항목을 소속 군의 기본값으로 채웁니다. 변경사항을
            저장하면 포털에 적용됩니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>취소</Button>
          <Button
            color="primary"
            onClick={() => {
              const defaults = defaultTenantSettings(
                tenant?.branch || tenantId,
                tenant?.name,
              );
              setDraft({
                version: settings.version,
                branding: canBrand ? defaults.branding : draft.branding,
                menus: canMenu ? defaults.menus : draft.menus,
              });
              setMessage(undefined);
              setResetOpen(false);
            }}
          >
            기본값으로 채우기
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={reloadOpen}
        onClose={() => setReloadOpen(false)}
        aria-labelledby="reload-settings-title"
      >
        <DialogTitle id="reload-settings-title">
          최신 설정을 다시 불러올까요?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            저장하지 않은 변경사항을 버리고 현재 저장된 설정을 불러옵니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReloadOpen(false)}>계속 편집</Button>
          <Button
            color="primary"
            onClick={() => {
              setReloadOpen(false);
              reload();
            }}
          >
            다시 불러오기
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
