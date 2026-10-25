import { FormEvent, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
} from '@material-ui/core';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import VerifiedUserOutlinedIcon from '@material-ui/icons/VerifiedUserOutlined';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@material-ui/icons/VisibilityOffOutlined';
import { setPreviewAuthenticated } from './previewAuth';
import {
  HOME_DESIGNS,
  HomeDesign,
  selectHomeDesign,
  useHomeDesign,
} from '../portal-home/homeDesign';
import './loginExperience.css';

interface PreviewLoginPageProps {
  accessCode?: string;
  enterpriseLogin?: () => Promise<void>;
}

// Code-native artwork stays crisp on large displays and can follow each theme.
const LoginIllustration = () => {
  const nodes = [
    [296, 207],
    [367, 164],
    [437, 207],
    [476, 260],
    [450, 324],
    [422, 393],
    [382, 457],
    [323, 386],
    [284, 324],
    [259, 268],
    [354, 254],
    [390, 300],
    [351, 337],
    [403, 352],
    [391, 221],
    [327, 286],
    [440, 278],
    [340, 429],
    [423, 429],
    [302, 241],
  ];
  return (
    <svg viewBox="0 0 740 610" className="login-shield-art" aria-hidden="true">
      <defs>
        <linearGradient id="login-shield-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e5f5fc" stopOpacity=".5" />
          <stop offset=".28" stopColor="#7ab4cb" stopOpacity=".09" />
          <stop offset=".58" stopColor="#0d2537" stopOpacity=".64" />
          <stop offset="1" stopColor="#b8e5f1" stopOpacity=".22" />
        </linearGradient>
        <linearGradient id="login-shield-rim" x1="0" y1="0" x2="1" y2=".7">
          <stop offset="0" stopColor="#ebf8ff" />
          <stop offset=".25" stopColor="#78adc7" />
          <stop offset=".48" stopColor="#f2fcff" />
          <stop offset=".68" stopColor="#4f839b" />
          <stop offset="1" stopColor="#d7f3ff" />
        </linearGradient>
        <radialGradient id="login-art-halo">
          <stop stopColor="var(--login-visual-accent)" stopOpacity=".26" />
          <stop
            offset="1"
            stopColor="var(--login-visual-accent)"
            stopOpacity="0"
          />
        </radialGradient>
        <radialGradient id="login-node">
          <stop stopColor="#fff" />
          <stop offset=".48" stopColor="var(--login-visual-accent)" />
          <stop
            offset="1"
            stopColor="var(--login-visual-accent)"
            stopOpacity="0"
          />
        </radialGradient>
        <filter
          id="login-shield-shadow"
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feDropShadow
            dx="0"
            dy="14"
            stdDeviation="14"
            floodColor="#000"
            floodOpacity=".54"
          />
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="7"
            floodColor="#8edcff"
            floodOpacity=".13"
          />
        </filter>
        <clipPath id="login-shield-clip">
          <path d="M383 113 536 177 518 329Q497 440 383 521Q270 440 250 329L232 177Z" />
        </clipPath>
      </defs>
      <ellipse
        cx="382"
        cy="352"
        rx="284"
        ry="242"
        fill="url(#login-art-halo)"
      />
      <g
        fill="none"
        stroke="var(--login-visual-accent)"
        strokeWidth=".6"
        opacity=".25"
      >
        {[0, 1, 2, 3, 4].map(i => (
          <ellipse
            key={i}
            cx="382"
            cy="509"
            rx={130 + i * 46}
            ry={23 + i * 12}
          />
        ))}
        <path d="M-10 398Q215 193 756 329M-12 524Q259 216 764 482M31 593Q322 239 704 113M-12 137Q407 336 751 582M139 8Q454 303 553 596" />
        <path d="M93 562 653 240M2 339 729 527M190 590 529 90M318 575 156 113" />
      </g>
      <g fill="var(--login-visual-accent)" opacity=".6">
        <circle cx="128" cy="333" r="2" />
        <circle cx="192" cy="530" r="2" />
        <circle cx="626" cy="400" r="2" />
        <circle cx="570" cy="205" r="2" />
        <circle cx="198" cy="202" r="1.8" />
        <circle cx="513" cy="552" r="1.8" />
      </g>
      <g filter="url(#login-shield-shadow)">
        <path
          d="M350 120 503 184 489 340Q471 444 368 520Q252 440 232 332L214 183Z"
          fill="#abcddb"
          fillOpacity=".035"
          stroke="#bce8fb"
          strokeOpacity=".26"
        />
        <path
          d="M368 106 523 174 506 335Q487 444 378 529Q260 444 241 329L224 173Z"
          fill="#abcddb"
          fillOpacity=".025"
          stroke="#bce8fb"
          strokeOpacity=".35"
        />
        <path
          d="M383 101 550 171 531 333Q510 451 383 542Q256 451 235 333L216 171Z"
          fill="url(#login-shield-face)"
          stroke="url(#login-shield-rim)"
          strokeWidth="1.8"
        />
        <path
          d="M383 113 536 177 518 329Q497 440 383 521Q270 440 250 329L232 177Z"
          fill="#051827"
          fillOpacity=".18"
          stroke="#bce8fb"
          strokeOpacity=".56"
        />
        <path
          d="M383 101V113M216 171 232 177M550 171 536 177M383 542V521"
          fill="none"
          stroke="#dceffa"
          strokeWidth="1.3"
        />
        <g clipPath="url(#login-shield-clip)">
          <g
            fill="none"
            stroke="var(--login-visual-accent)"
            strokeWidth=".6"
            opacity=".21"
          >
            {[0, 1, 2, 3, 4].map(i => (
              <ellipse key={i} cx="383" cy="305" rx={26 + i * 27} ry="153" />
            ))}
            {[0, 1, 2, 3, 4].map(i => (
              <ellipse
                key={i}
                cx="383"
                cy={219 + i * 42}
                rx={i === 0 || i === 4 ? 99 : 143}
                ry="27"
              />
            ))}
          </g>
          <g
            stroke="var(--login-visual-accent)"
            strokeWidth=".85"
            opacity=".46"
          >
            {nodes.flatMap((node, i) =>
              nodes
                .slice(i + 1)
                .map((next, j) =>
                  Math.hypot(node[0] - next[0], node[1] - next[1]) < 138 ? (
                    <line
                      key={`${i}-${j}`}
                      x1={node[0]}
                      y1={node[1]}
                      x2={next[0]}
                      y2={next[1]}
                    />
                  ) : null,
                ),
            )}
          </g>
          {nodes.map((node, i) => (
            <g key={i}>
              <circle
                cx={node[0]}
                cy={node[1]}
                r={i === 11 ? 13 : 7}
                fill="url(#login-node)"
                opacity=".72"
              />
              <circle
                cx={node[0]}
                cy={node[1]}
                r={i === 11 ? 4.4 : 2.4}
                fill="#e4faff"
              />
            </g>
          ))}
        </g>
        <path
          d="M232 177 383 113 536 177M250 329Q271 439 383 521"
          fill="none"
          stroke="#f1fbff"
          strokeWidth="1"
          strokeOpacity=".75"
        />
      </g>
      <text x="31" y="401" fill="#76a6ba" fontSize="9" letterSpacing="4">
        CONNECTED
      </text>
      <text x="31" y="419" fill="#76a6ba" fontSize="9" letterSpacing="4">
        INTELLIGENCE
      </text>
      <path d="M31 439H52" stroke="var(--login-visual-accent)" opacity=".5" />
    </svg>
  );
};

export const PreviewLoginPage = ({
  accessCode,
  enterpriseLogin,
}: PreviewLoginPageProps) => {
  const { design, reviewEnabled } = useHomeDesign();
  const [input, setInput] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityInfo, setSecurityInfo] = useState(false);
  const enter = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (accessCode) {
      if (!input || input !== accessCode) {
        setError('접근코드가 일치하지 않습니다. 다시 확인해 주세요.');
        return;
      }
      setLoading(true);
      setPreviewAuthenticated();
      window.location.assign('/');
      return;
    }
    setLoading(true);
    try {
      if (!enterpriseLogin)
        throw new Error('인증 서비스 설정을 확인해 주세요.');
      await enterpriseLogin();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '로그인에 실패했습니다. 다시 시도해 주세요.',
      );
    } finally {
      setLoading(false);
    }
  };
  const choose = (next: HomeDesign) => selectHomeDesign(next);
  const entryLabel = accessCode ? '포털 시작하기' : '기관 계정으로 로그인';
  return (
    <main
      className="experience-login"
      data-testid="portal-login"
      data-design={design}
    >
      <header className="login-masthead">
        <a className="login-brand" href="/" aria-label="KAI 국방 지능형플랫폼">
          <strong>
            KAI<span>.</span>
          </strong>
          <span className="login-brand-description">
            국방 지능형플랫폼
            <small>DEFENSE AI PLATFORM</small>
          </span>
        </a>
        <button
          type="button"
          className="login-access-info"
          onClick={() => setSecurityInfo(true)}
        >
          <VerifiedUserOutlinedIcon /> <span>통합 포털</span>
        </button>
      </header>
      <section className="login-story" aria-labelledby="login-story-title">
        <div className="login-story-copy">
          <div className="login-eyebrow">INTELLIGENCE, CONNECTED.</div>
          <h1 id="login-story-title">
            더 깊이 이해하고,
            <br />
            <span>더 정확히 연결합니다.</span>
          </h1>
          <p>
            AI · 데이터 · 클라우드가 하나로 연결되는
            <br className="login-mobile-break" /> 국방 지능형플랫폼
          </p>
        </div>
        <LoginIllustration />
        <div className="login-story-footer">
          <span>지능형 분석</span>
          <i />
          <span>연결되는 가능성</span>
          <i />
          <span>하나의 업무 환경</span>
        </div>
      </section>
      <section className="login-entry" aria-labelledby="login-entry-title">
        <div className="login-form-wrap">
          <div className="login-small-label">YOUR SECURE WORKSPACE</div>
          <h2 id="login-entry-title">업무의 다음 단계로</h2>
          <p className="login-intro">
            인증 후 나의 포털 업무 공간으로 이동합니다.
          </p>
          <form onSubmit={event => void enter(event)} aria-busy={loading}>
            {accessCode ? (
              <>
                <label
                  className="login-field-label"
                  htmlFor="portal-access-code"
                >
                  포털 접근코드
                </label>
                <TextField
                  id="portal-access-code"
                  type={showCode ? 'text' : 'password'}
                  variant="outlined"
                  fullWidth
                  value={input}
                  onChange={event => {
                    setInput(event.target.value);
                    if (error) setError('');
                  }}
                  placeholder="접근코드를 입력하세요"
                  error={!!error}
                  disabled={loading}
                  inputProps={{
                    'aria-label': '접근코드',
                    'aria-describedby': error
                      ? 'portal-login-error portal-access-note'
                      : 'portal-access-note',
                    autoComplete: 'current-password',
                    autoCapitalize: 'none',
                    spellCheck: false,
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showCode ? '접근코드 숨기기' : '접근코드 표시'
                          }
                          aria-pressed={showCode}
                          onClick={() => setShowCode(value => !value)}
                          disabled={loading}
                          edge="end"
                        >
                          {showCode ? (
                            <VisibilityOffOutlinedIcon />
                          ) : (
                            <VisibilityOutlinedIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <p id="portal-access-note" className="login-code-note">
                  <LockOutlinedIcon /> 고객 협의용 접근코드로 로그인합니다.
                </p>
              </>
            ) : (
              <div className="enterprise-auth-note">
                <LockOutlinedIcon />
                <p>
                  기관 통합 계정으로 로그인합니다.
                  <br />
                  <span>
                    추가 인증과 단말 접근 정책은 기관 인증 시스템에서
                    확인합니다.
                  </span>
                </p>
              </div>
            )}
            {error && (
              <p id="portal-login-error" role="alert" className="login-error">
                {error}
              </p>
            )}
            <Button
              className="login-primary"
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              endIcon={<ArrowForwardIcon />}
            >
              {loading ? '포털에 연결 중…' : entryLabel}
            </Button>
            {reviewEnabled && (
              <>
                <div className="login-design-heading">
                  <h3>시작 화면 선택</h3>
                  <span>디자인 시안 4가지</span>
                </div>
                <div className="login-design-grid">
                  {HOME_DESIGNS.map(item => (
                    <button
                      type="submit"
                      key={item.id}
                      className={`login-design-option preview-${item.id}`}
                      aria-label={`${item.number} ${item.name} 메인으로 입장`}
                      aria-pressed={design === item.id}
                      onClick={() => choose(item.id)}
                      disabled={loading}
                    >
                      <div className="design-mini" aria-hidden="true">
                        <div className="mini-heading" />
                        <div className="mini-subheading" />
                        <div className="mini-sphere">
                          <i />
                          <i />
                          <i />
                        </div>
                        <div className="mini-cards">
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                      <div className="design-option-bottom">
                        <div>
                          <span>{item.number}</span>{' '}
                          <strong>{item.name}</strong>
                          <p>{item.label}</p>
                        </div>
                        <ArrowForwardIcon />
                      </div>
                    </button>
                  ))}
                </div>
                <p className="design-selection-note">
                  시안을 선택하면 해당 디자인으로 포털을 시작합니다.
                </p>
              </>
            )}
          </form>
          <div className="login-security-flow" aria-label="운영 보안 접속 절차">
            <span>
              <i>1</i> 계정 인증
            </span>
            <b>→</b>
            <span>
              <i>2</i> 접근 정책 확인
            </span>
            <b>→</b>
            <span>
              <i>3</i> 서비스 연결
            </span>
          </div>
        </div>
        <button
          className="login-entry-guide"
          type="button"
          onClick={() => setSecurityInfo(true)}
        >
          접속 안내 <ArrowForwardIcon />
        </button>
      </section>
      <footer className="login-page-footer">
        <span>© KAI Intelligence Platform</span>
        <span>AI · DATA · CLOUD · VDI</span>
      </footer>
      <Dialog
        open={securityInfo}
        onClose={() => setSecurityInfo(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="security-info-title"
      >
        <DialogTitle id="security-info-title">안전한 포털 접속</DialogTitle>
        <DialogContent>
          <p>
            기관 통합 인증 후 소속과 역할에 맞는 업무 공간이 제공됩니다. 각
            플랫폼에 진입할 때도 이용 권한을 확인합니다.
          </p>
          <p>
            다중 인증, 단말 보안 상태와 접속망 정책은 기관 인증·보안 시스템과의
            연동 후 적용됩니다.
          </p>
          {accessCode && (
            <p>
              현재 접근코드는 고객 협의용입니다. 실제 기관 계정 인증이나 단말
              보안 검증을 대신하지 않습니다.
            </p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSecurityInfo(false)} color="primary">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </main>
  );
};
