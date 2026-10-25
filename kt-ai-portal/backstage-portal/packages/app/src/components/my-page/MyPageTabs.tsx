import { MyPageTab } from './types';

export const MY_PAGE_GROUPS: { label: string; tabs: MyPageTab[] }[] = [
  {
    label: '내 계정',
    tabs: ['프로필', '이메일 확인', '비밀번호 변경', '활성 세션'],
  },
  {
    label: '내 업무',
    tabs: ['내 프로젝트/워크스페이스', '자원 사용 이력', '크레딧 사용 내역'],
  },
  {
    label: '설정 · 기록',
    tabs: ['화면 설정', '알림 설정', '개인 API Key', '내 활동 로그'],
  },
];
export const MY_PAGE_TABS = MY_PAGE_GROUPS.flatMap(group => group.tabs);
export const MyPageTabs = ({
  value,
  onChange,
  visibleTabs = MY_PAGE_TABS,
}: {
  value: MyPageTab;
  onChange: (tab: MyPageTab) => void;
  visibleTabs?: MyPageTab[];
}) => (
  <nav className="my-page-nav" aria-label="마이페이지 메뉴">
    {MY_PAGE_GROUPS.map(group => (
      <div className="my-nav-group" key={group.label}>
        <h2>{group.label}</h2>
        <div
          role="tablist"
          aria-label={group.label}
          aria-orientation="vertical"
        >
          {group.tabs
            .filter(tab => visibleTabs.includes(tab))
            .map(tab => (
              <button
                type="button"
                role="tab"
                key={tab}
                id={`my-tab-${MY_PAGE_TABS.indexOf(tab)}`}
                aria-selected={value === tab}
                aria-controls="my-page-panel"
                onClick={() => onChange(tab)}
              >
                <span>
                  {tab === '내 프로젝트/워크스페이스'
                    ? '내 프로젝트 · 워크스페이스'
                    : tab}
                </span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
        </div>
      </div>
    ))}
  </nav>
);
