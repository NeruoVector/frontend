/** Figma: "배달 경로의 출발, 도착, 현재 위치" 일러스트 (390 × 230) */
export function RouteMap({ height = 230, progress = 0.5 }: { height?: number; progress?: number }) {
  // 경로: 출발(152,150) → 아래(152,169.6) → 오른쪽(243,169.6) → 위(243,118)
  const segs = [19.6, 91, 51.6]
  const total = segs.reduce((a, b) => a + b, 0)
  let d = Math.max(0, Math.min(1, progress)) * total
  let cx = 152
  let cy = 150
  if (d <= segs[0]) cy += d
  else if ((d -= segs[0]) <= segs[1]) {
    cy = 169.6
    cx += d
  } else {
    d -= segs[1]
    cx = 243
    cy = 169.6 - d
  }

  return (
    <svg
      className="route-map"
      viewBox="0 0 390 230"
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="배달 경로의 출발, 도착, 현재 위치"
    >
      <rect width="390" height="230" fill="var(--surface)" />
      <path
        d="M152 150V169.6H243V118"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="3"
        strokeDasharray="7 4"
        strokeLinecap="round"
      />
      <circle cx="151.8" cy="143.8" r="5.6" fill="#fff" stroke="var(--brand)" strokeWidth="2.6" />
      <circle cx="243" cy="112" r="5.6" fill="#fff" stroke="var(--brand)" strokeWidth="2.6" />
      <circle cx={cx} cy={cy} r="6.2" fill="var(--brand)" stroke="#fff" strokeWidth="1.5" />
      <g fontFamily="Inter, 'Noto Sans KR', sans-serif" fontSize="11.5" fill="var(--ink)" textAnchor="middle">
        <text x="151.5" y="125">출발</text>
        <text x="242.5" y="93">도착</text>
        <text x={cx} y={cy + 27}>현재 위치</text>
      </g>
    </svg>
  )
}
