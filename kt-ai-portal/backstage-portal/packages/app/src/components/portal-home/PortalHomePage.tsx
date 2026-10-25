import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@material-ui/core';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import TuneIcon from '@material-ui/icons/Tune';
import StarIcon from '@material-ui/icons/Star';
import { usePlatformAccess, useTenantSettings } from '../tenant-settings';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { useHomeDesign, HOME_DESIGNS, selectHomeDesign } from './homeDesign';
import { PlatformIcon } from './PlatformIcon';
import { usePlatformLaunch } from './PlatformLaunch';
import { PortalAppLauncher } from './PortalAppLauncher';
import { PortalHeroArt } from './PortalHeroArt';
import './portalExperience.css';
import './homePremium.css';

export function PortalHomePage() {
  const { design, reviewEnabled } = useHomeDesign();
  const { settings } = useTenantSettings();
  const { isDemo, tenants, tenantId } = usePortalRuntime();
  const { platforms, preferences, savePreferences, error } =
    usePlatformAccess();
  const launch = usePlatformLaunch();
  const [customize, setCustomize] = useState(false);
  const [draft, setDraft] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const ordered = [...platforms].sort(
    (a, b) =>
      preferences.platformOrder.indexOf(a.id) -
      preferences.platformOrder.indexOf(b.id),
  );
  const tenant =
    tenants.find(t => t.id === tenantId)?.name || settings.branding.shortName;
  const headlines = {
    aurora: (
      <>
        모든 가능성을,
        <br />
        <span>하나로 연결하다.</span>
      </>
    ),
    focus: (
      <>
        필요한 것에만,
        <br />
        <span>집중하세요.</span>
      </>
    ),
    orbit: (
      <>
        다음의 가능성은
        <br />
        <span>연결에서 시작됩니다.</span>
      </>
    ),
    canvas: (
      <>
        생각을 펼치고,
        <br />
        <span>함께 완성하세요.</span>
      </>
    ),
  };
  const platformLabels: Record<string, string> = {
    ai: 'AI',
    data: 'DATA',
    cloud: 'CLOUD',
    vdi: 'WORKSPACE',
  };
  const move = (index: number, step: number) => {
    const next = [...draft.platformOrder];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    setDraft({ ...draft, platformOrder: next });
  };
  return (
    <div
      className={`portal-home premium-home home-${design}`}
      data-testid="portal-home"
      data-design={design}
    >
      <div className="premium-shell">
        <section className="premium-hero">
          <div className="premium-hero-copy">
            <div className="premium-eyebrow">
              <span className="eyebrow-line" /> {tenant} INTELLIGENCE PLATFORM
            </div>
            <h1>{headlines[design]}</h1>
            <p className="premium-description">
              {settings.branding.welcomeText &&
              settings.branding.welcomeText !==
                '필요한 자산을 찾고, 프로젝트를 시작하세요.' ? (
                settings.branding.welcomeText
              ) : (
                <>
                  AI, 데이터, 클라우드. 흩어져 있던 업무의 가능성을
                  <br className="desktop-break" /> 하나의 경험으로 연결합니다.
                </>
              )}
            </p>
            <PortalAppLauncher workOnly variant="home" />
            <div className="hero-footnote">
              <span /> 나의 역할에 맞는 업무 공간으로 연결됩니다
            </div>
          </div>
          <PortalHeroArt design={design} />
        </section>
        <section className="premium-services" aria-label="플랫폼 바로가기">
          <div className="services-heading">
            <div>
              <span className="section-number">01 /</span>
              <h2>당신의 다음 작업을 위한 플랫폼</h2>
            </div>
            <button
              className="service-personalize"
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                setDraft({
                  ...preferences,
                  platformOrder: ordered.map(platform => platform.id),
                });
                setSaveError('');
                setCustomize(true);
              }}
            >
              <TuneIcon /> 나의 바로가기
            </button>
          </div>
          {error && (
            <p role="alert" className="home-error">
              {error}
            </p>
          )}
          <div className="premium-service-grid">
            {ordered.map((platform, index) => (
              <button
                key={platform.id}
                type="button"
                className={`platform-card service-tile service-${platform.id}`}
                onClick={() => launch(platform.id)}
                aria-label={`${platform.name} 열기`}
                aria-disabled={!platform.canAccess}
              >
                <div className="service-tile-head">
                  <span className="service-index">0{index + 1}</span>
                  <span className="service-category">
                    {platformLabels[platform.id]}
                  </span>
                  <ArrowForwardIcon className="service-arrow" />
                </div>
                <div className="service-icon-wrap">
                  <PlatformIcon id={platform.id} />
                  <div className="service-mini-art" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <div className="service-title">
                  <h3>{platform.name}</h3>
                  {preferences.favorites.includes(platform.id) && (
                    <StarIcon className="platform-favorite" />
                  )}
                </div>
                <p>{platform.description}</p>
                {!platform.canAccess && (
                  <span className="service-restricted">
                    접근 권한 확인 필요
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
        <footer className="premium-footer">
          <span>
            KAI <b>/</b> CONNECTED INTELLIGENCE
          </span>
          <span>
            {isDemo
              ? '고객 협의용 · 예시 환경'
              : '소속과 권한에 따라 서비스를 제공합니다'}
          </span>
        </footer>
      </div>
      {reviewEnabled && (
        <nav className="review-dock" aria-label="메인 디자인 시안 선택">
          <span className="review-label">
            DESIGN COLLECTION <b>2026</b>
          </span>
          {HOME_DESIGNS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                selectHomeDesign(item.id);
                window.scrollTo({ top: 0, behavior: 'auto' });
              }}
              aria-pressed={design === item.id}
              aria-label={`${item.number} ${item.name}`}
            >
              <span className={`review-swatch swatch-${item.id}`} />
              <span>
                <small>{item.number}</small> {item.name}
              </span>
            </button>
          ))}
        </nav>
      )}
      <Dialog
        open={customize}
        onClose={() => !saving && setCustomize(false)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="customize-title"
      >
        <DialogTitle id="customize-title">나의 플랫폼 바로가기</DialogTitle>
        <DialogContent>
          <p className="customize-hint">
            순서와 즐겨찾기는 현재 소속의 내 계정에 저장됩니다.
          </p>
          {draft.platformOrder.map((id, index) => (
            <div className="customize-row" key={id}>
              <PlatformIcon id={id} />
              <FormControlLabel
                label={platforms.find(p => p.id === id)?.name || id}
                control={
                  <Checkbox
                    checked={draft.favorites.includes(id)}
                    disabled={saving}
                    onChange={(_, checked) =>
                      setDraft({
                        ...draft,
                        favorites: checked
                          ? [...draft.favorites, id]
                          : draft.favorites.filter(f => f !== id),
                      })
                    }
                  />
                }
              />
              <IconButton
                size="small"
                disabled={index === 0 || saving}
                aria-label={`${id} 위로`}
                onClick={() => move(index, -1)}
              >
                <ArrowUpwardIcon />
              </IconButton>
              <IconButton
                size="small"
                disabled={index === draft.platformOrder.length - 1 || saving}
                aria-label={`${id} 아래로`}
                onClick={() => move(index, 1)}
              >
                <ArrowDownwardIcon />
              </IconButton>
            </div>
          ))}
          {saveError && <p role="alert">{saveError}</p>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomize(false)} disabled={saving}>
            취소
          </Button>
          <Button
            color="primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await savePreferences(draft);
                setCustomize(false);
              } catch (e) {
                setSaveError(
                  e instanceof Error ? e.message : '저장하지 못했습니다.',
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
