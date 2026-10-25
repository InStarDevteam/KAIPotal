import { useCallback, useEffect, useState } from 'react';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import { usePortalRuntime } from '../portal-runtime/PortalRuntimeContext';
import { ROLE_LABELS } from '../authz/types';
import { myPageStorageKey } from './myPageProfileStore';
import {
  DefenseProfile,
  emptyDefenseProfile,
  changeUserCategory,
  parseDefenseProfile,
  personnelLabels,
  validateProfileForm,
} from './defenseProfileModel';

interface ProfileResponse {
  profile: DefenseProfile;
  version: number;
  identity: {
    userId: string;
    displayName: string;
    email: string;
    status: string;
  };
}
const demoProfile: DefenseProfile = {
  ...emptyDefenseProfile(),
  userCategory: 'military',
  personnelType: 'soldier',
  militaryNumber: 'DEMO-001',
  rank: '대위',
  organization: '정보화 부대 (시연)',
  department: 'AI 활용 담당',
  position: '담당자',
  contact: '02-000-0000',
};

export const DefenseProfilePanel = () => {
  const { isDemo, request, tenantId, actorId, tenants, roles } =
    usePortalRuntime();
  const [form, setForm] = useState<DefenseProfile>(emptyDefenseProfile);
  const [identity, setIdentity] = useState<ProfileResponse['identity'] | null>(
    null,
  );
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [reload, setReload] = useState(0);
  const storageKey = myPageStorageKey('defenseProfile', tenantId, actorId);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setVersion(null);
    setNotice(null);
    const load = async () => {
      try {
        if (isDemo) {
          const raw = localStorage.getItem(storageKey);
          const loaded = raw
            ? parseDefenseProfile(JSON.parse(raw))
            : demoProfile;
          if (active) {
            setForm(loaded);
            setVersion(0);
            setIdentity({
              userId: actorId,
              displayName: '김국방 (시연)',
              email: 'demo@example.invalid',
              status: 'active',
            });
          }
        } else {
          const result = await request<ProfileResponse>('/v1/me/profile');
          const parsed = parseDefenseProfile(result.data.profile);
          if (!Number.isSafeInteger(result.data.version))
            throw new Error('프로필 버전 정보를 확인할 수 없습니다.');
          if (active) {
            setForm(parsed);
            setVersion(result.data.version);
            setIdentity(result.data.identity);
          }
        }
      } catch (error) {
        if (active)
          setNotice({
            error: true,
            message:
              error instanceof Error
                ? error.message
                : '프로필 정보를 불러오지 못했습니다.',
          });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [isDemo, request, storageKey, actorId, reload]);
  const setField = (key: keyof DefenseProfile, value: string) =>
    setForm(old => ({ ...old, [key]: value }));
  const save = useCallback(async () => {
    if (version === null || saving) return;
    const validationError = validateProfileForm(form);
    if (validationError) {
      setNotice({ error: true, message: validationError });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      if (isDemo) localStorage.setItem(storageKey, JSON.stringify(form));
      else {
        const result = await request<{
          profile: DefenseProfile;
          version: number;
        }>('/v1/me/profile', {
          method: 'PATCH',
          body: JSON.stringify({ profile: form, expectedVersion: version }),
        });
        setForm(parseDefenseProfile(result.data.profile));
        setVersion(result.data.version);
      }
      setNotice({
        error: false,
        message: isDemo
          ? '시연용 프로필을 이 브라우저에 저장했습니다.'
          : '프로필을 저장했습니다.',
      });
    } catch (error) {
      setNotice({
        error: true,
        message:
          error instanceof Error
            ? error.message
            : '저장하지 못했습니다. 입력 내용은 유지됩니다.',
      });
    } finally {
      setSaving(false);
    }
  }, [form, version, isDemo, storageKey, request, saving]);
  const field = (key: keyof DefenseProfile, label: string, maxLength = 120) => (
    <TextField
      key={key}
      id={`profile-${key}`}
      label={label}
      InputLabelProps={{ shrink: true }}
      variant="outlined"
      size="small"
      fullWidth
      value={form[key]}
      disabled={loading || version === null || saving}
      onChange={e => setField(key, e.target.value)}
      inputProps={{ maxLength }}
    />
  );
  return (
    <section
      className="my-panel defense-profile"
      aria-labelledby="profile-heading"
    >
      <div className="my-panel-heading">
        <div>
          <span className="my-eyebrow">MY IDENTITY</span>
          <h2 id="profile-heading">프로필</h2>
          <p>소속과 업무 연락처를 관리하세요.</p>
        </div>
      </div>
      {loading && <p role="status">계정 정보를 불러오는 중입니다.</p>}
      {notice && (
        <Alert
          severity={notice.error ? 'error' : 'success'}
          action={
            notice.error && !saving ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => setReload(v => v + 1)}
              >
                새로고침
              </Button>
            ) : undefined
          }
        >
          {notice.message}
        </Alert>
      )}
      <div className="identity-summary">
        <div className="identity-avatar" aria-hidden="true">
          {identity?.displayName?.slice(0, 1) || '나'}
        </div>
        <div>
          <h3>{identity?.displayName || '로그인 계정'}</h3>
          <p>
            {tenants.find(t => t.id === tenantId)?.name} ·{' '}
            {roles.map(role => ROLE_LABELS[role]).join(', ')}
          </p>
        </div>
        <span className="my-status">
          {isDemo ? '시연 권한' : '서버 권한 적용'}
        </span>
      </div>
      <dl className="identity-facts">
        <div>
          <dt>사용자 ID</dt>
          <dd>{identity?.userId || actorId}</dd>
        </div>
        <div>
          <dt>인증 계정 이메일</dt>
          <dd>{identity?.email || '등록된 이메일 없음'}</dd>
        </div>
      </dl>
      <div className="my-section-label">
        <h3>소속·인사 정보</h3>
        <p>
          직접 입력하는 참고 정보입니다. 소속 승인과 접근 권한은 관리자가
          관리합니다.
        </p>
      </div>
      <div className="profile-field-grid">
        <TextField
          select
          id="profile-user-category"
          label="사용자 구분"
          InputLabelProps={{ shrink: true }}
          SelectProps={{ displayEmpty: true }}
          variant="outlined"
          size="small"
          value={form.userCategory}
          disabled={loading || version === null || saving}
          onChange={e =>
            setForm(old => changeUserCategory(old, e.target.value))
          }
        >
          <MenuItem value="">선택하세요</MenuItem>
          <MenuItem value="military">군 내부 사용자</MenuItem>
          <MenuItem value="external">외부 사용자</MenuItem>
        </TextField>
        <TextField
          select
          id="profile-personnel-type"
          label="신분 구분"
          InputLabelProps={{ shrink: true }}
          SelectProps={{ displayEmpty: true }}
          variant="outlined"
          size="small"
          value={form.personnelType}
          disabled={!form.userCategory || loading || version === null || saving}
          onChange={e => setField('personnelType', e.target.value)}
        >
          <MenuItem value="">선택하세요</MenuItem>
          {(form.userCategory === 'external'
            ? ['contractor', 'researcher', 'other']
            : ['soldier', 'civilian', 'other']
          ).map(type => (
            <MenuItem key={type} value={type}>
              {personnelLabels[type]}
            </MenuItem>
          ))}
        </TextField>
        {form.userCategory !== 'external' && (
          <>
            {field('militaryNumber', '군번 / 군무원 직원번호', 30)}
            {field('rank', '계급 / 직급', 40)}
          </>
        )}
        {field(
          'organization',
          form.userCategory === 'external'
            ? '협업 소속부대 / 기관'
            : '소속부대 / 기관',
        )}
        {field('department', '부서')}
        {field('position', '직책', 80)}
        {field('contact', '업무 연락처', 40)}
        {form.userCategory === 'external' && (
          <>
            {field('affiliation', '소속 회사 / 연구기관')}
            {field('sponsor', '군 내부 담당자', 80)}
          </>
        )}
      </div>
      <div className="profile-save-row">
        <p>군번과 연락처는 본인 프로필에만 저장됩니다.</p>
        <Button
          variant="contained"
          color="primary"
          disableElevation
          startIcon={<SaveOutlinedIcon />}
          disabled={loading || version === null || saving}
          onClick={save}
        >
          {saving ? '저장 중…' : '프로필 저장'}
        </Button>
      </div>
    </section>
  );
};
