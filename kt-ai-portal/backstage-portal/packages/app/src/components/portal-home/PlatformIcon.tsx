import { useId } from 'react';

/** One icon family for the home, service launcher, navigation, and login. */
export function PlatformIcon({
  id,
  className = '',
}: {
  id: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const surface = `url(#${uid}-surface)`;
  const edge = `url(#${uid}-edge)`;
  return (
    <span
      className={`platform-icon platform-icon-${id} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" fill="none" focusable="false">
        <defs>
          <linearGradient
            id={`${uid}-surface`}
            x1="12"
            y1="8"
            x2="49"
            y2="56"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" stopOpacity=".94" />
            <stop offset=".24" stopColor="currentColor" stopOpacity=".7" />
            <stop offset=".58" stopColor="currentColor" stopOpacity=".95" />
            <stop offset="1" stopColor="#1c3241" />
          </linearGradient>
          <linearGradient
            id={`${uid}-edge`}
            x1="10"
            y1="12"
            x2="49"
            y2="51"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" />
            <stop offset=".4" stopColor="currentColor" stopOpacity=".72" />
            <stop offset="1" stopColor="#f0f9ff" stopOpacity=".84" />
          </linearGradient>
        </defs>
        {id === 'ai' && (
          <>
            <path
              d="m8 35 24-15 24 15v7L32 57 8 42v-7Z"
              fill={surface}
              stroke={edge}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path
              d="m8 35 24 15 24-15M32 50v7"
              stroke="#fff"
              strokeOpacity=".57"
            />
            <path
              d="m11 25 21-13 21 13v8L32 46 11 33v-8Z"
              fill={surface}
              stroke={edge}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path
              d="m11 25 21 13 21-13M32 38v8"
              stroke="#fff"
              strokeOpacity=".8"
            />
            <path
              d="m19 26 7-9 7 13m-10-7 7 4m8-4 7 4m-4-6-7 11"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m17 42-4 2m10 2-4 3m29-6 4 2m-10 2 4 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}
        {id === 'data' && (
          <>
            <path
              d="M13 15v34c0 6 38 6 38 0V15H13Z"
              fill={surface}
              stroke={edge}
              strokeWidth="1.5"
            />
            <ellipse
              cx="32"
              cy="15"
              rx="19"
              ry="8"
              fill={surface}
              stroke={edge}
              strokeWidth="1.5"
            />
            <path
              d="M13 27c0 11 38 11 38 0M13 39c0 11 38 11 38 0"
              stroke="#fff"
              strokeOpacity=".83"
              strokeWidth="1.3"
            />
            <path
              d="M13 30c0 11 38 11 38 0M13 42c0 11 38 11 38 0"
              stroke="#183844"
              strokeOpacity=".38"
              strokeWidth="2"
            />
            <path
              d="M18 18c4 3 12 4 19 3"
              stroke="#fff"
              strokeOpacity=".67"
              strokeLinecap="round"
            />
            <path
              d="M43 30v2m0 12v2"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </>
        )}
        {id === 'cloud' && (
          <>
            <path
              d="M17 48a12 12 0 0 1-1.5-23.9 17 17 0 0 1 32.1-2.2A13 13 0 0 1 49 48H17Z"
              fill={surface}
              stroke={edge}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M10 29c2-3 4-4 8-4 2-8 8-13 15-13 6 0 10 3 13 8"
              stroke="#fff"
              strokeOpacity=".82"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="m26 33 6-6 6 6m-6-6v14"
              stroke="#f9ffff"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 46h33"
              stroke="#fff"
              strokeOpacity=".28"
              strokeLinecap="round"
            />
          </>
        )}
        {id === 'vdi' && (
          <>
            <rect
              x="11"
              y="10"
              width="42"
              height="34"
              rx="4"
              fill={surface}
              stroke={edge}
              strokeWidth="1.6"
            />
            <rect
              x="15"
              y="14"
              width="34"
              height="25"
              rx="1.8"
              fill="#102a36"
              fillOpacity=".66"
              stroke="#fff"
              strokeOpacity=".48"
            />
            <path
              d="M11 44 5 51v3h54v-3l-6-7H11Z"
              fill={surface}
              stroke={edge}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M5 51h54m-34-4h14" stroke="#fff" strokeOpacity=".72" />
            <rect
              x="24"
              y="21"
              width="6"
              height="6"
              rx=".8"
              fill="#fff"
              fillOpacity=".9"
            />
            <rect
              x="33"
              y="21"
              width="6"
              height="6"
              rx=".8"
              fill="#fff"
              fillOpacity=".66"
            />
            <rect
              x="24"
              y="30"
              width="6"
              height="6"
              rx=".8"
              fill="#fff"
              fillOpacity=".66"
            />
            <rect
              x="33"
              y="30"
              width="6"
              height="6"
              rx=".8"
              fill="#fff"
              fillOpacity=".9"
            />
          </>
        )}
      </svg>
    </span>
  );
}
