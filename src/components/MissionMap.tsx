import type { Mission } from '../api.ts'
import { missionDestination, SCHOOL_MAP_URL } from '../missionCoordinates.ts'
import type { EnuPoint } from '../missionCoordinates.ts'
import { GoogleMissionMap } from './GoogleMissionMap.tsx'
import './MissionMap.css'

export function MissionMap({ mission, position }: { readonly mission: Mission; readonly position: EnuPoint | null }) {
  const destination = missionDestination(mission)
  const points = [...mission.route_enu, ...(position ? [position] : []), ...(destination ? [destination] : [])]
  const east = points.map(point => point[0])
  const north = points.map(point => point[1])
  const minEast = Math.min(...east) - 5
  const maxNorth = Math.max(...north) + 5
  const scale = Math.min(330 / (Math.max(...east) - minEast + 5), 170 / (maxNorth - Math.min(...north) + 5))
  const project = (point: EnuPoint) => [30 + (point[0] - minEast) * scale, 25 + (maxNorth - point[1]) * scale] as const
  const home = mission.route_enu[0]
  const location = position ? project(position) : null
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || ''
  const diagram = <svg className="mission-route-diagram" viewBox="0 0 390 235" role="img" aria-label="시뮬레이션 비행 경로 도식과 최신 드론 위치">
        <polyline points={mission.route_enu.map(point => project(point).join(',')).join(' ')} fill="none" stroke="var(--brand)" strokeWidth="2" strokeDasharray="5 4" />
        {home && <circle cx={project(home)[0]} cy={project(home)[1]} r="5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />}
        {destination && <circle cx={project(destination)[0]} cy={project(destination)[1]} r="6" fill="var(--brand)" />}
        {location && <circle cx={location[0]} cy={location[1]} r="7" fill="var(--ink)" stroke="var(--spot-white)" strokeWidth="2" />}
      </svg>
  return (
    <figure className="mission-map">
      {apiKey ? <GoogleMissionMap apiKey={apiKey} mission={mission} position={position} fallback={diagram} /> : <>
        <p className="mission-map-status">비행 경로와 드론 위치</p>
        {diagram}
      </>}
      <figcaption>
        선린인터넷고 주변에 맞춘 대략적인 시뮬레이션 경로입니다. 실제 비행 안내가 아닙니다.<br />
        빨강: 수령 · 검정: 드론 · 테두리: 출발<br />
        {position ? '최신 시뮬레이션 위치 표시 중' : '최신 위치 없음 · 드론 표시 숨김'}<br />
        <a className="mission-school-link" href={SCHOOL_MAP_URL} target="_blank" rel="noreferrer">Google 지도에서 학교 보기</a>
      </figcaption>
    </figure>
  )
}
