import { useId } from 'react';
import { HomeDesign } from './homeDesign';

/** Local, scalable sculpture: its lighting follows the selected tenant's palette. */
export function PortalHeroArt({ design }: { design: HomeDesign }) {
  const id = useId().replace(/:/g, '');
  const url = (name: string) => `url(#${id}-${name})`;
  const dark = design === 'focus' || design === 'orbit';
  const globe = { x: 360, y: 253, r: design === 'orbit' ? 108 : 113 };
  const nodes = [-60, -30, 0, 30, 60].flatMap((latitude, row) =>
    [-78, -39, 0, 39, 78].map((longitude, column) => {
      const lat = (latitude * Math.PI) / 180;
      const lon = ((longitude + (row % 2 ? 11 : 0)) * Math.PI) / 180;
      return {
        x: globe.x + globe.r * Math.cos(lat) * Math.sin(lon),
        y: globe.y + globe.r * Math.sin(lat),
        depth: Math.cos(lat) * Math.cos(lon),
        row,
        column,
      };
    }),
  );
  const terrain = Array.from({ length: 24 }, (_, row) =>
    Array.from({ length: 55 }, (_cell, column) => {
      const x = column * 14;
      const y =
        382 +
        row * 7 +
        Math.sin(column * 0.24 + row * 0.17) * (14 + row * 0.4) -
        Math.exp(-((column - 12) ** 2) / 30) * (45 - row) -
        Math.exp(-((column - 42) ** 2) / 42) * (35 - row * 0.8);
      return `${column ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' '),
  );
  const sphere = (
    <g className="sculpture-sphere">
      <circle cx={globe.x} cy={globe.y} r={globe.r} fill={url('sphere')} />
      <circle
        cx={globe.x}
        cy={globe.y}
        r={globe.r}
        stroke={url('edge')}
        strokeWidth="1.6"
      />
      <g
        clipPath={url('sphere-clip')}
        stroke="var(--art-wire, #8dc5d4)"
        strokeOpacity=".34"
      >
        {[25, 55, 83, 104].map(radius => (
          <ellipse
            key={radius}
            cx={globe.x}
            cy={globe.y}
            rx={radius}
            ry={globe.r}
            transform={`rotate(-18 ${globe.x} ${globe.y})`}
          />
        ))}
        {[-77, -42, 0, 42, 77].map(offset => (
          <ellipse
            key={offset}
            cx={globe.x}
            cy={globe.y + offset}
            rx={Math.sqrt(globe.r ** 2 - offset ** 2)}
            ry="18"
          />
        ))}
        {nodes.map((node, index) => (
          <g key={index}>
            {node.column < 4 && (
              <path
                d={`M${node.x} ${node.y}L${nodes[index + 1].x} ${
                  nodes[index + 1].y
                }`}
              />
            )}
            {node.row < 4 && (
              <path
                d={`M${node.x} ${node.y}L${nodes[index + 5].x} ${
                  nodes[index + 5].y
                }`}
              />
            )}
            {node.row < 4 && node.column < 4 && (
              <path
                d={`M${node.x} ${node.y}L${nodes[index + 6].x} ${
                  nodes[index + 6].y
                }`}
                strokeOpacity=".55"
              />
            )}
          </g>
        ))}
      </g>
      <path
        d="M317 171c-30 15-47 40-52 75"
        stroke="#fff"
        strokeWidth="2"
        strokeOpacity=".7"
        strokeLinecap="round"
      />
      {nodes
        .filter((node, index) => node.depth > 0.32 && index % 3 === 0)
        .map((node, index) => (
          <g key={index}>
            <circle
              cx={node.x}
              cy={node.y}
              r="8"
              fill="var(--art-glow, #9ad4e4)"
              opacity=".16"
            />
            <circle
              cx={node.x}
              cy={node.y}
              r={index % 3 ? 2.4 : 3.8}
              fill="#f5ffff"
            />
          </g>
        ))}
      <ellipse
        cx="322"
        cy="203"
        rx="34"
        ry="20"
        fill="#fff"
        opacity=".08"
        transform="rotate(-36 322 203)"
      />
    </g>
  );
  return (
    <div className={`portal-hero-art art-${design}`} aria-hidden="true">
      <svg viewBox="0 0 740 560" fill="none" focusable="false">
        <defs>
          <linearGradient
            id={`${id}-metal`}
            x1="160"
            y1="60"
            x2="490"
            y2="430"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#faffff" />
            <stop offset=".16" stopColor="#a4b9c0" />
            <stop offset=".28" stopColor="#f0f3ee" />
            <stop offset=".43" stopColor="#6e8188" />
            <stop offset=".52" stopColor="#dbe4df" />
            <stop offset=".71" stopColor="#3b505b" />
            <stop offset=".87" stopColor="#adb9ba" />
            <stop offset="1" stopColor="#edf3ef" />
          </linearGradient>
          <linearGradient
            id={`${id}-glass`}
            x1="240"
            y1="80"
            x2="510"
            y2="410"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" stopOpacity={dark ? '.32' : '.84'} />
            <stop
              offset=".3"
              stopColor="var(--art-glow, #8ecce5)"
              stopOpacity=".09"
            />
            <stop
              offset=".7"
              stopColor="var(--art-glow, #8ecce5)"
              stopOpacity={dark ? '.15' : '.28'}
            />
            <stop
              offset="1"
              stopColor="#fff"
              stopOpacity={dark ? '.32' : '.76'}
            />
          </linearGradient>
          <linearGradient
            id={`${id}-edge`}
            x1="210"
            y1="80"
            x2="490"
            y2="445"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" />
            <stop
              offset=".42"
              stopColor="var(--art-wire, #8ecce5)"
              stopOpacity=".55"
            />
            <stop offset=".7" stopColor="#fff" stopOpacity=".88" />
            <stop offset="1" stopColor="var(--art-glow, #8ecce5)" />
          </linearGradient>
          <linearGradient
            id={`${id}-orbit`}
            x1="170"
            y1="360"
            x2="545"
            y2="125"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--art-orbit, #b9cae0)" stopOpacity=".35" />
            <stop offset=".35" stopColor="#fff8df" />
            <stop offset=".62" stopColor="var(--art-orbit, #b9cae0)" />
            <stop offset="1" stopColor="#fff" stopOpacity=".85" />
          </linearGradient>
          <radialGradient id={`${id}-sphere`} cx=".31" cy=".25" r=".76">
            <stop stopColor="#edfaff" stopOpacity={dark ? '.33' : '.87'} />
            <stop
              offset=".46"
              stopColor="var(--art-glow, #8ecce5)"
              stopOpacity={dark ? '.13' : '.3'}
            />
            <stop
              offset="1"
              stopColor={dark ? '#091e24' : '#6893ad'}
              stopOpacity={dark ? '.94' : '.22'}
            />
          </radialGradient>
          <radialGradient id={`${id}-ambient`}>
            <stop
              stopColor="var(--art-glow, #8ecce5)"
              stopOpacity={dark ? '.2' : '.34'}
            />
            <stop
              offset="1"
              stopColor="var(--art-glow, #8ecce5)"
              stopOpacity="0"
            />
          </radialGradient>
          <linearGradient
            id={`${id}-stage`}
            x1="160"
            y1="430"
            x2="500"
            y2="525"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={dark ? '#68787b' : '#e9f1f6'} />
            <stop offset=".2" stopColor={dark ? '#1f3037' : '#b5c9d5'} />
            <stop offset=".48" stopColor={dark ? '#93a3a0' : '#f7fcff'} />
            <stop offset=".69" stopColor={dark ? '#25333b' : '#adc1cd'} />
            <stop offset="1" stopColor={dark ? '#080e13' : '#e2ecf2'} />
          </linearGradient>
          <linearGradient
            id={`${id}-paper`}
            x1="120"
            y1="130"
            x2="510"
            y2="390"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fafffb" />
            <stop offset=".37" stopColor="#dbe8e5" />
            <stop offset=".63" stopColor="#7ba2a6" />
            <stop offset="1" stopColor="#163e4d" />
          </linearGradient>
          <filter
            id={`${id}-blur`}
            x="-50%"
            y="-100%"
            width="200%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter
            id={`${id}-light`}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <clipPath id={`${id}-sphere-clip`}>
            <circle cx={globe.x} cy={globe.y} r={globe.r} />
          </clipPath>
        </defs>
        <ellipse cx="371" cy="272" rx="291" ry="230" fill={url('ambient')} />
        <g
          className="sculpture-terrain"
          stroke="var(--art-wire, #8ecce5)"
          strokeWidth=".7"
          strokeOpacity={dark ? '.15' : '.16'}
        >
          {terrain.map((d, index) => (
            <path key={index} d={d} />
          ))}
        </g>
        <ellipse
          cx="361"
          cy="490"
          rx="224"
          ry="21"
          fill={dark ? '#000' : '#283e56'}
          opacity=".3"
          filter={url('blur')}
        />
        <g className="sculpture-stage">
          <ellipse
            cx="360"
            cy="482"
            rx="224"
            ry="43"
            fill={url('stage')}
            stroke={url('edge')}
            strokeOpacity=".4"
          />
          <ellipse
            cx="360"
            cy="476"
            rx="222"
            ry="40"
            fill={dark ? '#102126' : '#d9e7ef'}
            fillOpacity=".75"
            stroke={url('edge')}
            strokeOpacity=".6"
          />
          <ellipse
            cx="360"
            cy="470"
            rx="176"
            ry="31"
            fill={url('stage')}
            stroke={url('edge')}
            strokeOpacity=".8"
          />
          <ellipse
            cx="360"
            cy="466"
            rx="154"
            ry="25"
            fill={dark ? '#091b22' : '#e5eff4'}
            stroke={url('orbit')}
            strokeWidth="1.5"
          />
          <ellipse
            cx="360"
            cy="466"
            rx="286"
            ry="55"
            stroke={url('orbit')}
            strokeOpacity=".28"
          />
          <ellipse
            cx="360"
            cy="466"
            rx="315"
            ry="65"
            stroke={url('orbit')}
            strokeOpacity=".12"
          />
        </g>
        {(design === 'aurora' || design === 'focus') && (
          <g className="sculpture-object">
            <path
              d="M360 66 520 129v132c-4 94-51 155-160 209-109-54-156-115-160-209V129L360 66Z"
              fill={url('glass')}
              stroke={url('metal')}
              strokeWidth="10"
              strokeLinejoin="round"
            />
            <path
              d="M360 64 520 128v134c-5 92-53 157-160 207-108-52-155-117-160-207V128L360 64Z"
              stroke={url('edge')}
              strokeWidth="1.8"
            />
            <path
              d="M360 85 501 141v120c-5 83-47 139-141 187-94-48-136-104-141-187V141L360 85Z"
              fill={url('glass')}
              stroke={url('edge')}
              strokeWidth="1.4"
            />
            <path
              d="M360 86v362L219 261V141L360 86Z"
              fill="#fff"
              opacity={dark ? '.03' : '.13'}
            />
            <path d="M360 86v362" stroke={url('edge')} strokeOpacity=".25" />
            <path
              d="m216 139 144-58 151 61"
              stroke="#fff"
              strokeWidth="2"
              strokeOpacity=".78"
              strokeLinecap="round"
            />
            {sphere}
            <ellipse
              cx="360"
              cy="258"
              rx="242"
              ry="71"
              transform="rotate(-31 360 258)"
              stroke={url('orbit')}
              strokeWidth="1.8"
            />
            {[
              [156, 371],
              [204, 350],
              [554, 131],
              [486, 187],
            ].map(([x, y], index) => (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="14"
                  fill="var(--art-glow, #8ecce5)"
                  opacity=".24"
                  filter={url('light')}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={index % 2 ? 5 : 8}
                  fill={url('metal')}
                  stroke="#f3ffff"
                  strokeOpacity=".8"
                />
              </g>
            ))}
            <path
              d="M393 214 399 226 392 235 395 245 386 252 385 264 376 269 380 255 372 248 380 234 384 227 386 218 393 214Z"
              fill="var(--art-glow, #8ecce5)"
              stroke="#f4ffff"
              strokeOpacity=".7"
              fillOpacity=".56"
            />
          </g>
        )}
        {design === 'orbit' && (
          <g className="sculpture-object">
            {[
              [-28, 192, 213],
              [51, 195, 194],
              [104, 195, 146],
            ].map(([rotation, rx, ry]) => (
              <g key={rotation} transform={`rotate(${rotation} 360 251)`}>
                <ellipse
                  cx="360"
                  cy="251"
                  rx={rx}
                  ry={ry}
                  stroke="#fff"
                  strokeOpacity=".34"
                  strokeWidth="24"
                />
                <ellipse
                  cx="360"
                  cy="251"
                  rx={rx}
                  ry={ry}
                  stroke={url('metal')}
                  strokeWidth="21"
                />
                <ellipse
                  cx="360"
                  cy="251"
                  rx={rx - 12}
                  ry={ry - 11}
                  stroke="#f6efdd"
                  strokeOpacity=".66"
                />
              </g>
            ))}
            {sphere}
            {[
              [-28, 192, 213],
              [104, 195, 146],
            ].map(([rotation, rx, ry]) => (
              <g key={rotation} transform={`rotate(${rotation} 360 251)`}>
                <path
                  d={`M${360 - rx} 251A${rx} ${ry} 0 0 0 ${360 + rx} 251`}
                  stroke={url('metal')}
                  strokeWidth="21"
                />
                <path
                  d={`M${360 - rx + 11} 251A${rx - 11} ${ry - 11} 0 0 0 ${
                    360 + rx - 11
                  } 251`}
                  stroke="#f6efdd"
                  strokeOpacity=".58"
                />
              </g>
            ))}
            <ellipse
              cx="360"
              cy="251"
              rx="256"
              ry="91"
              transform="rotate(-31 360 251)"
              stroke={url('orbit')}
              strokeWidth="1.7"
            />
            {[
              [158, 374],
              [198, 111],
              [559, 135],
              [548, 388],
            ].map(([x, y], index) => (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="30"
                  fill={url('sphere')}
                  stroke={url('metal')}
                  strokeWidth="3"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="23"
                  fill="#111e24"
                  stroke={url('orbit')}
                  strokeOpacity=".46"
                />
                {index === 0 && (
                  <path
                    d={`M${x - 10} ${
                      y + 5
                    }a7 7 0 0 1 0-14 10 10 0 0 1 19 1 6 6 0 0 1-1 13h-18Z`}
                    stroke="#f6efd9"
                    strokeWidth="1.5"
                  />
                )}
                {index === 1 && (
                  <g stroke="#f6efd9" strokeWidth="1.5">
                    <rect x={x - 9} y={y - 9} width="18" height="18" rx="2" />
                    <path
                      d={`M${x - 4} ${
                        y - 14
                      }v5m8-5v5m5 5h5m-5 8h5m-14 5v5m-8-5v5m-5-9h-5m5-8h-5`}
                    />
                  </g>
                )}
                {index === 2 && (
                  <g stroke="#f6efd9" strokeWidth="1.5">
                    <ellipse cx={x} cy={y - 8} rx="10" ry="4" />
                    <path
                      d={`M${x - 10} ${y - 8}v16c0 5 20 5 20 0V${
                        y - 8
                      }m-20 8c0 5 20 5 20 0`}
                    />
                  </g>
                )}
                {index === 3 && (
                  <g stroke="#f6efd9" strokeWidth="1.5">
                    <rect x={x - 12} y={y - 9} width="24" height="17" rx="2" />
                    <path d={`M${x - 16} ${y + 11}h32m-16-3v3`} />
                  </g>
                )}
              </g>
            ))}
          </g>
        )}
        {design === 'canvas' && (
          <g className="sculpture-object">
            <path
              d="M130 221 573 114 394 370 321 286 130 221Z"
              fill={url('paper')}
              stroke="#effbf7"
              strokeWidth="1.5"
            />
            <path
              d="m130 221 225 4 218-111-443 107Z"
              fill="#f0f7f3"
              fillOpacity=".9"
            />
            <path
              d="m355 225 39 145 179-256-218 111Z"
              fill="#779a9d"
              fillOpacity=".68"
            />
            <path
              d="m355 225-34 61 73 84-39-145Z"
              fill="#193f4d"
              fillOpacity=".83"
            />
            <path d="m321 286-73 40 107-101-34 61Z" fill="#b0ccca" />
            <path
              d="m130 221 225 4 218-111M355 225l39 145"
              stroke="#fff"
              strokeOpacity=".8"
            />
            <path
              d="m153 230 164 68M403 374l177-254"
              stroke="#fff"
              strokeOpacity=".18"
              strokeWidth="2"
            />
            <g stroke="var(--art-wire, #80a9b2)" strokeOpacity=".5">
              <path d="m174 350 110 46 179-40 106-112M284 396l36 50 143-90M174 350l146 96" />
              {[
                [174, 350],
                [284, 396],
                [463, 356],
                [569, 244],
                [320, 446],
              ].map(([x, y], index) => (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="10"
                    fill="var(--art-glow, #b2ddd6)"
                    opacity=".18"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#fff"
                    stroke="var(--art-wire, #80a9b2)"
                  />
                </g>
              ))}
            </g>
          </g>
        )}
        <g className="sculpture-stars" fill="var(--art-glow, #8ecce5)">
          {[
            [121, 144],
            [613, 282],
            [611, 421],
            [94, 426],
            [558, 64],
            [169, 94],
          ].map(([x, y], index) => (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={index % 2 ? 1.3 : 2.2}
              opacity=".64"
            />
          ))}
        </g>
      </svg>
      <div className="art-caption">
        <span>CONNECTED INTELLIGENCE</span>
        <span>01 — 04</span>
      </div>
    </div>
  );
}
