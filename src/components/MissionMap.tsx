import type { Mission } from '../api.ts'

type Point = readonly [number, number, number]

export function MissionMap({ mission, position }: { readonly mission: Mission; readonly position: Point | null }) {
  const points = position ? [...mission.route_enu, position] : mission.route_enu
  const east = points.map(point => point[0])
  const north = points.map(point => point[1])
  const minEast = Math.min(...east) - 5
  const maxNorth = Math.max(...north) + 5
  const scale = Math.min(330 / (Math.max(...east) - minEast + 5), 170 / (maxNorth - Math.min(...north) + 5))
  const project = (point: Point) => [30 + (point[0] - minEast) * scale, 25 + (maxNorth - point[1]) * scale] as const
  const destination = mission.route_enu[1]
  const home = mission.route_enu[0]
  const location = position ? project(position) : null
  return (
    <figure className="mission-map">
      <svg viewBox="0 0 390 235" role="img" aria-label="가상 학교의 실제 비행 경로와 드론 위치">
        <polyline points={mission.route_enu.map(point => project(point).join(',')).join(' ')} fill="none" stroke="var(--brand)" strokeWidth="2" strokeDasharray="5 4" />
        {home && <circle cx={project(home)[0]} cy={project(home)[1]} r="5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />}
        {destination && <circle cx={project(destination)[0]} cy={project(destination)[1]} r="6" fill="var(--brand)" />}
        {location && <circle cx={location[0]} cy={location[1]} r="7" fill="var(--ink)" stroke="var(--spot-white)" strokeWidth="2" />}
      </svg>
      <figcaption>가상 학교 비행 경로 · 빨강: 수령 지점 · 검정: 현재 위치</figcaption>
    </figure>
  )
}
