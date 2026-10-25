import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconButton, Popover, Tooltip } from '@material-ui/core';
import AppsIcon from '@material-ui/icons/Apps';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import CloseIcon from '@material-ui/icons/Close';
import WorkIcon from '@material-ui/icons/AssignmentTurnedIn';
import { usePlatformAccess, useTenantSettings } from '../tenant-settings';
import { useAuthz } from '../authz';
import { portalMenuDefinitions } from '../navigation';
import { PlatformIcon } from './PlatformIcon';
import { usePlatformLaunch } from './PlatformLaunch';

export function PortalAppLauncher({
  workOnly = false,
  variant = 'header',
}: {
  workOnly?: boolean;
  variant?: 'header' | 'home';
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { platforms, preferences } = usePlatformAccess();
  const { settings } = useTenantSettings();
  const { hasAnyPermission } = useAuthz();
  const launch = usePlatformLaunch();
  const menus = portalMenuDefinitions
    .filter(
      menu =>
        menu.route !== '/' &&
        hasAnyPermission(menu.requiredAnyPermissions) &&
        settings.menus.find(m => m.id === menu.id)?.visible !== false,
    )
    .sort(
      (a, b) =>
        (settings.menus.find(m => m.id === a.id)?.order ?? 999) -
        (settings.menus.find(m => m.id === b.id)?.order ?? 999),
    );
  const ordered = [...platforms].sort(
    (a, b) =>
      preferences.platformOrder.indexOf(a.id) -
      preferences.platformOrder.indexOf(b.id),
  );
  if (workOnly) {
    if (variant === 'home')
      return (
        <Link to="/portal-work" className="home-work-button">
          <span className="home-work-icon">
            <WorkIcon />
          </span>
          <span className="home-work-copy">
            <strong>포털 업무 시작하기</strong>
            <small>내 프로젝트와 담당 업무를 바로 확인하세요</small>
          </span>
          <span className="home-work-action">
            바로가기 <ArrowForwardIcon />
          </span>
        </Link>
      );
    return (
      <Link
        to="/portal-work"
        className="header-work-button"
        aria-label="포털 업무"
      >
        <span className="header-work-prefix">포털 </span>업무{' '}
        <ArrowForwardIcon />
      </Link>
    );
  }
  return (
    <>
      <Tooltip title="모든 앱">
        <IconButton
          className="apps-launcher-button"
          aria-label="모든 앱"
          aria-expanded={!!anchor}
          aria-haspopup="dialog"
          onClick={event => setAnchor(event.currentTarget)}
        >
          <AppsIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: variant === 'home' ? 'left' : 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: variant === 'home' ? 'left' : 'right',
        }}
        PaperProps={{
          className: 'portal-launcher-paper',
          role: 'dialog',
          'aria-label': '모든 앱',
        }}
      >
        <div className="launcher-heading">
          <h2>나의 앱</h2>
          <IconButton
            size="small"
            aria-label="앱 메뉴 닫기"
            onClick={() => setAnchor(null)}
          >
            <CloseIcon />
          </IconButton>
        </div>
        <section className="launcher-platform-section">
          <p>PLATFORMS</p>
          <div className="launcher-apps">
            {ordered.map(platform => (
              <button
                key={platform.id}
                onClick={() => {
                  setAnchor(null);
                  launch(platform.id);
                }}
                aria-label={`${platform.name} 열기`}
              >
                <PlatformIcon id={platform.id} />
                <span>{platform.name}</span>
                {!platform.canAccess && <small>접근 제한</small>}
              </button>
            ))}
          </div>
        </section>
        <section className="launcher-work-section">
          <p>PORTAL WORKSPACE</p>
          <div className="launcher-work-grid">
            {menus.map(menu => {
              const Icon = menu.icon;
              return (
                <Link
                  key={menu.id}
                  to={menu.route}
                  onClick={() => setAnchor(null)}
                >
                  <span className="work-app-icon">
                    <Icon />
                  </span>
                  <span>
                    {settings.menus.find(m => m.id === menu.id)?.label ||
                      menu.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
        <div className="launcher-footnote">
          현재 소속과 권한으로 이용할 수 있는 업무입니다.
        </div>
      </Popover>
    </>
  );
}
