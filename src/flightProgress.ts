import type { Mission, SimulationState } from './api.ts'

export function freshSimulation(state: SimulationState | null, nowMs: number): boolean {
  if (state === null) return false
  const age = nowMs / 1000 - state.timestamp
  return age >= -2 && age < 5
}

export function matchingMission(state: SimulationState | null, orderId: string, nowMs: number): Mission | null {
  if (!freshSimulation(state, nowMs) || state?.mission?.order_id !== orderId) return null
  if (state.order_id != null && state.order_id !== orderId) return null
  return state.mission
}

export function flightDistance(meters: number | null): string {
  if (meters === null) return '경로 준비 중'
  return meters < 1000 ? `${meters.toFixed(1)} m` : `${(meters / 1000).toFixed(2)} km`
}

export function flightEta(seconds: number | null): string {
  if (seconds === null) return '대기 중'
  if (seconds === 0) return '도착 완료'
  if (seconds < 60) return `약 ${Math.ceil(seconds)}초`
  return `약 ${Math.ceil(seconds / 60)}분`
}

export function flightStep(status: string, completed: boolean, active: boolean, airborne: boolean): 0 | 1 | 2 | 3 {
  if (completed) return 3
  if (active && airborne) return 2
  return ['paid', 'preparing', 'ready', 'assigned', 'in_transit'].includes(status) ? 1 : 0
}
