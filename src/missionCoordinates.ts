export type EnuPoint = readonly [number, number, number]
export type MapCoordinate = { readonly lat: number; readonly lng: number }

// Display calibration only: the simulator's physical origin stays unchanged.
// https://en.wikipedia.org/wiki/Sunrin_Internet_High_School
export const SCHOOL_CENTER = { lat: 37.54250, lng: 126.96639 } as const
export const SCHOOL_MAP_URL = 'https://www.google.com/maps/search/?api=1&query=37.54250%2C126.96639'
const EARTH_RADIUS_M = 6378137
const RADIANS = Math.PI / 180

export function schoolCoordinate(point: EnuPoint): MapCoordinate {
  return {
    lat: SCHOOL_CENTER.lat + (point[1] - 30) / EARTH_RADIUS_M / RADIANS,
    lng: SCHOOL_CENTER.lng + (point[0] - 30) / (EARTH_RADIUS_M * Math.cos(SCHOOL_CENTER.lat * RADIANS)) / RADIANS,
  }
}

export type MapMission = {
  readonly route_enu: readonly EnuPoint[]
  readonly destination_enu?: EnuPoint
}

export function missionDestination(mission: MapMission): EnuPoint | undefined {
  return mission.destination_enu ?? mission.route_enu[1]
}
