import { PortalTenantPicker } from './PortalTenantPicker';
import { useState, useEffect, useRef } from 'react';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { clearPreviewAuthenticated } from '../preview-auth/previewAuth';
import { PortalAppLauncher } from '../portal-home/PortalAppLauncher';
import { PlatformLaunchProvider } from '../portal-home/PlatformLaunch';
import { useHomeDesign } from '../portal-home/homeDesign';
import '../portal-home/portalExperience.css';
import '../common/portalUsability.css';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  IconButton,
  InputBase,
  Popover,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import CloseIcon from '@material-ui/icons/Close';
import { useAuthz, ROLE_LABELS, RolePreviewSwitcher } from '../authz';
import {
  portalMenuGroups,
  portalMenuDefinitions,
  getMenuByGroup,
} from '../navigation';
import { colors } from '../common/designTokens';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { useTenantSettings } from '../tenant-settings';
import {
  PROTECTED_MENU_IDS,
  safeLogoUrl,
} from '../tenant-settings/settingsModel';

type SidebarMode = 'expanded' | 'compact' | 'hidden';
const groupLabels: Record<string, string> = {
  '포털 공통': '시작하기',
  '플랫폼 연계': '자산 찾기',
  '프로젝트 운영': '프로젝트와 신청',
  '사용자/조직': '내 업무',
  '사용자 지원': '지원',
  '관리/보안': '관리와 보안',
};
const useStyles = makeStyles(theme => ({
  root: {
    minHeight: '100vh',
    color: colors.textPrimary,
    background: colors.background,
    fontFamily: theme.typography.fontFamily,
    // Leave native form controls to MUI; its production classes are generated.
    // Input heights describe content, so border-box would clip padding/text.
    '& :not(input):not(textarea)': { boxSizing: 'border-box' },
    '& a:focus-visible, & button:focus-visible': {
      outline: `3px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  },
  skip: {
    position: 'fixed',
    top: -80,
    left: 12,
    zIndex: 1500,
    background: 'var(--portal-surface, #fff)',
    padding: 12,
    '&:focus': { top: 8 },
  },
  header: {
    height: 64,
    position: 'sticky',
    top: 0,
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 20px',
    borderBottom: `1px solid ${colors.border}`,
    borderTop: '3px solid var(--portal-accent, #8f81c7)',
    background: 'var(--portal-header, #fff)',
    color: 'var(--portal-header-text, #172033)',
    '@media(max-width:767px)': { padding: '0 8px', gap: 4 },
  },
  mark: {
    width: 32,
    height: 32,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 9,
    background: theme.palette.primary.main,
    color: '#fff',
    fontSize: 'calc(10px * var(--portal-font-scale, 1))',
    fontWeight: 800,
    letterSpacing: -0.5,
    overflow: 'hidden',
    overflowWrap: 'anywhere',
    '& img': {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      background: '#fff',
    },
  },
  title: {
    fontSize: 'calc(15px * var(--portal-font-scale, 1))',
    fontWeight: 700,
    textDecoration: 'none',
    color: 'var(--portal-header-text, #172033)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    maxWidth: 320,
    '@media(max-width:767px)': {
      fontSize: 'calc(12px * var(--portal-font-scale, 1))',
      maxWidth: 120,
    },
  },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: 'min(420px, 35vw)',
    padding: '4px 12px',
    borderRadius: 8,
    background: 'var(--portal-header-search, #ffffff10)',
    marginLeft: 'auto',
    color: 'var(--portal-header-muted, #667085)',
    '@media(max-width:767px)': { display: 'none' },
  },
  sidebar: {
    position: 'sticky',
    top: 64,
    height: 'calc(100vh - 64px)',
    overflowY: 'auto',
    padding: '20px 12px 12px',
    background: 'var(--portal-surface, #fff)',
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 32,
  },
  group: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    color: colors.textSecondary,
    textTransform: 'none',
    padding: '12px 10px 6px',
    fontSize: 'calc(11px * var(--portal-font-scale, 1))',
    fontWeight: 700,
    letterSpacing: 0.4,
  },
  menu: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    margin: '3px 0',
    padding: '10px 12px',
    borderRadius: 8,
    textDecoration: 'none',
    color: 'var(--portal-muted, #475569)',
    fontSize: 'calc(13px * var(--portal-font-scale, 1))',
    fontWeight: 500,
    lineHeight: 1.5,
    '&:hover': { background: colors.background },
    '&[aria-current="page"]': {
      background: 'var(--portal-primary-soft, #EAF0FE)',
      color: theme.palette.primary.main,
      fontWeight: 700,
    },
    '& svg': {
      fontSize: 'calc(20px * var(--portal-font-scale, 1))',
      flexShrink: 0,
    },
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
    '& .MuiChip-root': { maxWidth: '100%' },
  },
  main: {
    minWidth: 0,
    width: '100%',
    padding: '24px 24px 48px',
    '& > div': { maxWidth: 1560, margin: '0 auto' },
    '& .MuiTableContainer-root': { overflowX: 'auto' },
    '@media(max-width:767px)': { padding: '12px 8px 24px' },
  },
  content: {
    minWidth: 0,
    '& [data-capture-id]': { minWidth: 0 },
    '& .MuiGrid-item': { minWidth: 0 },
  },
  mobilePaper: {
    width: 280,
    maxWidth: '85vw',
    '& nav': { position: 'static', height: '100%' },
  },
  mobileSearch: {
    marginLeft: 'auto',
    '@media(min-width:768px)': { display: 'none' },
  },
  tenantSelect: {
    marginLeft: 8,
    minWidth: 78,
    maxWidth: 160,
    '& .MuiSelect-select': {
      fontSize: 'calc(12px * var(--portal-font-scale, 1))',
      padding: '8px 24px 8px 10px',
    },
    '@media(max-width:767px)': {
      marginLeft: 'auto',
      minWidth: 70,
      maxWidth: 100,
    },
  },
  welcome: {
    padding: '14px 18px',
    marginBottom: 20,
    background: 'var(--portal-primary-soft, #EAF0FE)',
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    borderRadius: 8,
    color: theme.palette.primary.main,
    fontSize: 'calc(14px * var(--portal-font-scale, 1))',
    lineHeight: 1.7,
  },
}));

/** 메뉴 폭은 하나의 grid 상태에서 계산한다. 좁은 화면은 개인 상태와 독립된 modal이다.
 * 현재 화면 선호는 세션 중만 유지하며 DB 저장으로 가장하지 않는다. */
export function PortalShell() {
  const classes = useStyles();
  const { hasAnyPermission, primaryRole } = useAuthz();
  const {
    tenantId,
    tenants,
    selectTenant,
    isDemo,
    loading: runtimeLoading,
    error: runtimeError,
  } = usePortalRuntime();
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    reload,
    hasUnsavedChanges,
  } = useTenantSettings();
  const [tenantError, setTenantError] = useState('');
  const [tenantChanging, setTenantChanging] = useState(false);
  const [pendingTenant, setPendingTenant] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const mobile = useMediaQuery('(max-width:1023px)');
  const [mode, setMode] = useState<SidebarMode>('hidden');
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { design } = useHomeDesign();
  const identity = useApi(identityApiRef);
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await identity.signOut();
      clearPreviewAuthenticated();
      sessionStorage.removeItem('__kt_ai_portal_role_override__');
      sessionStorage.removeItem('__kt_ai_portal_admin_preview__');
      window.location.assign('/');
    } catch {
      setTenantError('로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.');
      setSigningOut(false);
    }
  };
  const navigate = useNavigate();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const widths = { expanded: 256, compact: 72, hidden: 0 };
  const width = mobile || isHome ? 0 : widths[mode];
  const sidebarDisplay = mobile ? 'overlay' : mode;
  const compact = !mobile && mode === 'compact';
  const branding = settings.branding;
  const selectedTenant = tenants.find(tenant => tenant.id === tenantId);
  const menuSettings = new Map(settings.menus.map(menu => [menu.id, menu]));
  const routeMenu = portalMenuDefinitions.find(
    menu =>
      menu.route !== '/' &&
      (location.pathname === menu.route ||
        (menu.id === 'developer-console' &&
          location.pathname === '/platform-api-integration') ||
        location.pathname.startsWith(`${menu.route}/`)),
  );
  const hiddenRoute =
    !!routeMenu &&
    !PROTECTED_MENU_IDS.includes(routeMenu.id) &&
    menuSettings.get(routeMenu.id)?.visible === false;
  const searchVisible =
    menuSettings.get('integrated-search')?.visible !== false &&
    hasAnyPermission(['catalog.view']);
  const profileVisible =
    menuSettings.get('my-page')?.visible !== false &&
    hasAnyPermission(['portal.view']);
  const changeTenant = async (next: string) => {
    setTenantChanging(true);
    setTenantError('');
    try {
      await selectTenant(next);
    } catch (cause) {
      setTenantError(
        cause instanceof Error ? cause.message : '소속을 변경하지 못했습니다.',
      );
    } finally {
      setTenantChanging(false);
      setPendingTenant('');
    }
  };
  useEffect(() => {
    setLogoFailed(false);
  }, [branding.logoUrl]);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!mobile) setOpen(false);
  }, [mobile]);
  const closeMobile = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };
  const renderPageContent = () => {
    if (runtimeLoading || settingsLoading) {
      return (
        <Typography role="status">
          소속 군의 포털을 불러오는 중입니다.
        </Typography>
      );
    }
    if (runtimeError) {
      return (
        <Alert severity="warning">
          소속과 접근 권한을 확인할 수 없습니다. 다시 접속해 주세요.
        </Alert>
      );
    }
    if (settingsError) {
      return (
        <Alert severity="warning">
          포털 설정을 확인한 후 화면을 이용할 수 있습니다.
        </Alert>
      );
    }
    if (hiddenRoute) {
      return (
        <Alert
          severity="info"
          action={
            <Button color="inherit" component={Link} to="/">
              홈으로
            </Button>
          }
        >
          현재 소속 군에서 사용하지 않는 메뉴입니다. 필요한 경우 소속 군
          관리자에게 문의하세요.
        </Alert>
      );
    }
    return <Outlet />;
  };
  const nav = (
    <nav className={classes.sidebar} aria-label="주 메뉴">
      <div className={classes.sidebarTop}>
        {!compact && (
          <Typography
            style={{ paddingLeft: 10, fontSize: 12, fontWeight: 700 }}
          >
            {selectedTenant?.name || '포털'}
          </Typography>
        )}
        {mobile ? (
          <IconButton aria-label="메뉴 닫기" onClick={closeMobile}>
            <CloseIcon />
          </IconButton>
        ) : (
          <Tooltip title={compact ? '메뉴 펼치기' : '메뉴 접기'}>
            <IconButton
              size="small"
              aria-label={compact ? '메뉴 펼치기' : '메뉴 접기'}
              onClick={() => setMode(compact ? 'expanded' : 'compact')}
            >
              {compact ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        )}
      </div>
      {portalMenuGroups.map(group => {
        const menus = getMenuByGroup(group)
          .filter(
            menu =>
              hasAnyPermission(menu.requiredAnyPermissions) &&
              (PROTECTED_MENU_IDS.includes(menu.id) ||
                menuSettings.get(menu.id)?.visible !== false),
          )
          .sort(
            (a, b) =>
              (menuSettings.get(a.id)?.order ?? 999) -
              (menuSettings.get(b.id)?.order ?? 999),
          );
        if (!menus.length) return null;
        return (
          <div key={group}>
            {!compact && (
              <Button
                className={classes.group}
                aria-expanded={!collapsed[group]}
                onClick={() =>
                  setCollapsed(previous => ({
                    ...previous,
                    [group]: !previous[group],
                  }))
                }
              >
                {groupLabels[group]}
                <ExpandMoreIcon
                  style={{
                    fontSize: 16,
                    transform: collapsed[group] ? 'rotate(-90deg)' : undefined,
                  }}
                />
              </Button>
            )}
            <Collapse in={compact || !collapsed[group]}>
              {menus.map(menu => {
                const Icon = menu.icon;
                return (
                  <Tooltip
                    key={menu.id}
                    title={
                      compact
                        ? menuSettings.get(menu.id)?.label || menu.title
                        : ''
                    }
                    placement="right"
                  >
                    <Link
                      to={menu.route}
                      className={classes.menu}
                      aria-label={
                        menuSettings.get(menu.id)?.label || menu.title
                      }
                      aria-current={
                        location.pathname === menu.route ? 'page' : undefined
                      }
                      onClick={() => mobile && closeMobile()}
                      style={
                        compact
                          ? { justifyContent: 'center', padding: '10px 0' }
                          : undefined
                      }
                    >
                      <Icon />
                      {!compact && (
                        <span>
                          {menuSettings.get(menu.id)?.label || menu.title}
                        </span>
                      )}
                    </Link>
                  </Tooltip>
                );
              })}
            </Collapse>
          </div>
        );
      })}
      <div className={classes.footer}>
        {!compact && (
          <>
            <Chip
              size="small"
              variant="outlined"
              label={ROLE_LABELS[primaryRole]}
              data-testid="current-role-chip"
            />
            <RolePreviewSwitcher />
          </>
        )}
        {!mobile && (
          <Tooltip title="메뉴 숨기기">
            <IconButton
              size="small"
              aria-label="메뉴 숨기기"
              onClick={() => setMode('hidden')}
            >
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
        )}
      </div>
    </nav>
  );
  return (
    <PlatformLaunchProvider>
      <div
        className={`${classes.root} portal-shell-experience design-${design} ${
          isHome ? `home-shell-${design}` : ''
        }`}
        data-testid="portal-shell"
        data-design={design}
        data-sidebar-mode={isHome ? 'hidden' : sidebarDisplay}
      >
        <a href="#portal-main" className={classes.skip}>
          본문으로 건너뛰기
        </a>
        <header className={classes.header}>
          {!isHome && (
            <IconButton
              ref={toggleRef}
              aria-label={
                mobile || mode === 'hidden' ? '메뉴 열기' : '메뉴 숨기기'
              }
              aria-expanded={mobile ? open : mode !== 'hidden'}
              onClick={() =>
                mobile
                  ? setOpen(true)
                  : setMode(mode === 'hidden' ? 'expanded' : 'hidden')
              }
            >
              <MenuIcon />
            </IconButton>
          )}
          {branding.logoUrl && safeLogoUrl(branding.logoUrl) && !logoFailed && (
            <Link
              to="/"
              className={classes.mark}
              aria-label={`${branding.shortName} 포털 홈`}
            >
              <img
                src={branding.logoUrl}
                alt={`${branding.shortName} 로고`}
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
              />
            </Link>
          )}
          <Link
            to="/"
            className={classes.title}
            title={branding.portalTitle}
            aria-label={branding.portalTitle}
          >
            <div className="brand-kai">
              KAI<span style={{ color: '#aab1c3' }}>.</span>
            </div>
            <div className="brand-subtitle" style={{ letterSpacing: '0.3px' }}>
              {branding.portalTitle}
            </div>
          </Link>
          <PortalTenantPicker
            tenants={tenants}
            tenantId={tenantId}
            loading={runtimeLoading}
            changing={tenantChanging}
            className={classes.tenantSelect}
            onSelect={next => {
              if (hasUnsavedChanges) setPendingTenant(next);
              else void changeTenant(next);
            }}
            onManage={
              hasAnyPermission(['tenant.manage']) &&
              menuSettings.get('tenant-management')?.visible !== false
                ? () => navigate('/tenant-management')
                : undefined
            }
          />
          {searchVisible && !isHome && (
            <form
              role="search"
              className={classes.search}
              onSubmit={event => {
                event.preventDefault();
                navigate(`/integrated-search?q=${encodeURIComponent(query)}`);
              }}
            >
              <SearchIcon style={{ fontSize: 20 }} />
              <InputBase
                fullWidth
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="필요한 자산과 도구를 검색하세요"
                inputProps={{ 'aria-label': '통합검색어' }}
              />
            </form>
          )}
          {(!searchVisible || isHome) && <div className="header-spacer" />}
          <PortalAppLauncher workOnly />
          <PortalAppLauncher />
          {searchVisible && !isHome && (
            <IconButton
              className={classes.mobileSearch}
              aria-label="통합검색"
              component={Link}
              to="/integrated-search"
            >
              <SearchIcon />
            </IconButton>
          )}
          <Tooltip title="내 계정">
            <IconButton
              aria-label="내 계정"
              aria-haspopup="dialog"
              aria-expanded={!!profileAnchor}
              onClick={event => setProfileAnchor(event.currentTarget)}
              style={{ padding: 5 }}
            >
              <span className="profile-avatar">
                {branding.shortName.slice(0, 2)}
              </span>
            </IconButton>
          </Tooltip>
          <Popover
            open={!!profileAnchor}
            anchorEl={profileAnchor}
            onClose={() => setProfileAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              className: 'portal-profile-paper',
              role: 'dialog',
              'aria-label': '내 계정',
            }}
          >
            <h3>{selectedTenant?.name || '포털'} 계정</h3>
            <p>
              {ROLE_LABELS[primaryRole]}
              {isDemo ? ' · 예시 환경' : ''}
            </p>
            {profileVisible && (
              <>
                <Link to="/my-page" onClick={() => setProfileAnchor(null)}>
                  내 정보와 활동
                </Link>
                <Link
                  to="/my-page?tab=appearance"
                  onClick={() => setProfileAnchor(null)}
                >
                  화면 디자인과 글자 크기
                </Link>
              </>
            )}
            {hasAnyPermission([
              'tenant.manage',
              'settings.manage',
              'menu.manage',
            ]) && (
              <Link
                to="/tenant-settings"
                onClick={() => setProfileAnchor(null)}
              >
                테넌트 설정
              </Link>
            )}
            <Button
              fullWidth
              onClick={() => {
                setProfileAnchor(null);
                setHelp(true);
              }}
              startIcon={<HelpOutlineIcon />}
            >
              사용 도움말
            </Button>
            <div className="profile-divider" />
            <RolePreviewSwitcher />
            <Button
              fullWidth
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut ? '로그아웃 중…' : '로그아웃'}
            </Button>
          </Popover>
        </header>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${width}px minmax(0, 1fr)`,
          }}
        >
          <div>{!isHome && !mobile && mode !== 'hidden' && nav}</div>
          <main
            id="portal-main"
            tabIndex={-1}
            className={`${classes.main} ${isHome ? 'shell-home' : ''}`}
          >
            <div className={classes.content}>
              {isDemo &&
                !isHome &&
                location.pathname !== '/tenant-settings' &&
                location.pathname !== '/portal-work' && (
                  <Alert severity="info" style={{ marginBottom: 16 }}>
                    데모 모드 · 현재 브라우저의 예시 데이터와 설정을 사용하고
                    있습니다.
                  </Alert>
                )}
              {(tenantError || runtimeError || settingsError) && (
                <Alert
                  severity="error"
                  style={{ marginBottom: 16 }}
                  action={
                    settingsError ? (
                      <Button color="inherit" size="small" onClick={reload}>
                        다시 불러오기
                      </Button>
                    ) : undefined
                  }
                >
                  {tenantError || runtimeError || settingsError}
                </Alert>
              )}
              {renderPageContent()}
            </div>
          </main>
        </div>
        <Drawer
          open={!isHome && mobile && open}
          onClose={closeMobile}
          classes={{ paper: classes.mobilePaper }}
          ModalProps={{ keepMounted: true }}
        >
          {nav}
        </Drawer>
        <Dialog
          open={help}
          onClose={() => setHelp(false)}
          aria-labelledby="portal-help-title"
        >
          <DialogTitle id="portal-help-title">포털 사용 도움말</DialogTitle>
          <DialogContent>
            {branding.supportText && (
              <Typography paragraph>{branding.supportText}</Typography>
            )}
            <Typography paragraph>
              자산 찾기에서 데이터와 도구를 확인하고, 프로젝트와 신청에서
              작업환경과 반출 요청을 관리하세요.
            </Typography>
            <Typography paragraph>
              메뉴 접기는 아이콘만 표시하고, 메뉴 숨기기는 본문을 넓게
              표시합니다. 상단 메뉴 버튼으로 언제든 다시 열 수 있습니다.
            </Typography>
            <Typography>
              조회 가능한 메뉴와 작업은 현재 역할에 따라 달라집니다. 연결되지
              않은 서비스는 화면의 연결 상태를 확인하세요.
            </Typography>
            <Typography style={{ marginTop: 16 }}>
              화면 디자인과 글자 크기는 마이페이지의 화면 설정에서 변경할 수
              있습니다. 군 기본값을 선택하면 소속 군 관리자가 저장한 설정을
              사용합니다.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHelp(false)} color="primary">
              닫기
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={!!pendingTenant}
          onClose={() => !tenantChanging && setPendingTenant('')}
          aria-labelledby="tenant-change-title"
        >
          <DialogTitle id="tenant-change-title">
            저장하지 않은 변경사항이 있습니다
          </DialogTitle>
          <DialogContent>
            <Typography>
              소속 군을 변경하면 작성 중인 설정이 사라집니다. 변경사항을 버리고
              이동할까요?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              disabled={tenantChanging}
              onClick={() => setPendingTenant('')}
            >
              계속 편집
            </Button>
            <Button
              color="primary"
              disabled={tenantChanging}
              onClick={() => void changeTenant(pendingTenant)}
            >
              변경사항 버리고 이동
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </PlatformLaunchProvider>
  );
}
