import { useEffect, useRef, useState } from 'react';
import {
  Button,
  CircularProgress,
  MenuItem,
  TextField,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import {
  HOME_DESIGNS,
  clearHomeDesignSelection,
} from '../portal-home/homeDesign';
import { usePlatformAccess } from '../tenant-settings/PlatformAccessContext';
import { useTenantSettings } from '../tenant-settings/TenantSettingsContext';
import {
  PORTAL_FONT_SCALES,
  PORTAL_FONT_LABELS,
} from '../tenant-settings/settingsModel';
import { PlatformPreferences } from '../tenant-settings/platformAccessModel';
import './appearanceSettings.css';

type PersonalDesign = NonNullable<PlatformPreferences['design']>;

export function AppearanceSettingsPanel() {
  const { preferences, loading, saving, error, reload, savePreferences } =
    usePlatformAccess();
  const { settings, setHasUnsavedChanges } = useTenantSettings();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const busy = saving || pending;
  const [design, setDesign] = useState<PersonalDesign>(
    preferences.design ?? 'tenant',
  );
  const [fontScale, setFontScale] = useState<number | undefined>(
    preferences.fontScale,
  );
  const [message, setMessage] = useState<{
    text: string;
    severity: 'success' | 'error';
  }>();
  const dirty =
    design !== (preferences.design ?? 'tenant') ||
    fontScale !== preferences.fontScale;
  const tenantDesign = HOME_DESIGNS.find(
    item => item.id === (settings.branding.design ?? 'aurora'),
  )!;
  const tenantScale = settings.branding.fontScale ?? 1;

  useEffect(() => {
    setDesign(preferences.design ?? 'tenant');
    setFontScale(preferences.fontScale);
  }, [preferences.design, preferences.fontScale]);
  useEffect(() => {
    setHasUnsavedChanges(dirty, 'personal-appearance');
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      setHasUnsavedChanges(false, 'personal-appearance');
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [dirty, setHasUnsavedChanges]);

  const save = async () => {
    if (pendingRef.current || saving || loading || error || !dirty) return;
    pendingRef.current = true;
    setPending(true);
    setMessage(undefined);
    const next: PlatformPreferences = { ...preferences, design };
    if (fontScale === undefined) delete next.fontScale;
    else next.fontScale = fontScale;
    try {
      await savePreferences(next);
      clearHomeDesignSelection();
      setMessage({
        severity: 'success',
        text: '화면 설정을 저장했습니다. 홈과 모든 업무 화면에 적용되었습니다.',
      });
    } catch (cause) {
      setMessage({
        severity: 'error',
        text:
          cause instanceof Error
            ? cause.message
            : '화면 설정을 저장하지 못했습니다.',
      });
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <section
      className="my-panel appearance-settings"
      aria-labelledby="appearance-settings-title"
      data-testid="appearance-settings-panel"
    >
      <div className="my-panel-heading">
        <div>
          <span className="my-eyebrow">YOUR EXPERIENCE</span>
          <h2 id="appearance-settings-title">화면 설정</h2>
          <p>
            나에게 편한 디자인과 글자 크기를 선택하세요. 설정은 현재 계정과 소속
            군에 저장됩니다.
          </p>
        </div>
      </div>
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={reload}>
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
        >
          {message.text}
        </Alert>
      )}
      {loading ? (
        <div className="my-empty" role="status">
          <CircularProgress size={28} />
          <p>화면 설정을 불러오는 중입니다.</p>
        </div>
      ) : (
        <>
          <div className="appearance-tenant-default">
            <span>소속 군 기본 설정</span>
            <strong>
              {tenantDesign.name} · 글자 크기 {Math.round(tenantScale * 100)}%
            </strong>
            <p>
              군 기본 설정을 사용하면 관리자가 변경한 디자인과 크기를 자동으로
              따릅니다.
            </p>
          </div>
          <fieldset
            className="appearance-design-fieldset"
            disabled={busy || !!error}
          >
            <legend>포털 디자인</legend>
            <div className="appearance-options">
              {[
                {
                  id: 'tenant' as const,
                  name: '군 기본 설정',
                  description: `${tenantDesign.name} · 관리자가 정한 디자인`,
                  number: '기본',
                },
                ...HOME_DESIGNS,
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`appearance-option appearance-option-${item.id}`}
                  aria-pressed={design === item.id}
                  aria-label={`개인 디자인 ${item.name}`}
                  disabled={busy || !!error}
                  onClick={() => {
                    setDesign(item.id);
                    setMessage(undefined);
                  }}
                >
                  <span
                    className="appearance-option-preview"
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="appearance-option-number">
                    {item.number}
                  </span>
                  <strong>{item.name}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="appearance-font-field">
            <TextField
              id="personal-font-scale"
              label="개인 글자 크기"
              select
              fullWidth
              variant="outlined"
              value={fontScale ?? 'tenant'}
              disabled={busy || !!error}
              onChange={event => {
                setFontScale(
                  event.target.value === 'tenant'
                    ? undefined
                    : Number(event.target.value),
                );
                setMessage(undefined);
              }}
              helperText="메뉴, 표, 입력 항목과 안내 문구에 함께 적용됩니다."
            >
              <MenuItem value="tenant">
                군 기본 설정 · {Math.round(tenantScale * 100)}%
              </MenuItem>
              {PORTAL_FONT_SCALES.map(scale => (
                <MenuItem key={scale} value={scale}>
                  {PORTAL_FONT_LABELS[scale]} · {Math.round(scale * 100)}%
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div className="profile-save-row">
            <p>
              {dirty
                ? '저장하면 홈과 업무 화면에 함께 적용됩니다.'
                : '저장된 화면 설정을 사용하고 있습니다.'}
            </p>
            <div className="appearance-save-actions">
              <Button
                disabled={
                  busy ||
                  !!error ||
                  (design === 'tenant' && fontScale === undefined)
                }
                onClick={() => {
                  setDesign('tenant');
                  setFontScale(undefined);
                  setMessage(undefined);
                }}
              >
                군 기본값으로 채우기
              </Button>
              <Button
                disabled={busy || !dirty}
                onClick={() => {
                  setDesign(preferences.design ?? 'tenant');
                  setFontScale(preferences.fontScale);
                  setMessage(undefined);
                }}
              >
                변경 취소
              </Button>
              <Button
                color="primary"
                variant="contained"
                disableElevation
                disabled={busy || !dirty || !!error}
                startIcon={
                  busy ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SaveOutlinedIcon />
                  )
                }
                onClick={save}
              >
                화면 설정 저장
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
