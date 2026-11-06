import type { Mission, SimulationState } from './api.ts'
import { canHaveFlightCompletion } from './orderFlightCompletion.ts'

export function canConfirmReceipt(state: SimulationState | null, order: { readonly id: string; readonly status: string }, nowMs: number): boolean {
  const mission = matchingMission(state, order.id, nowMs)
  return canHaveFlightCompletion(order.status) && state?.order_id === order.id && state.armed === false
    && mission?.phase === 'awaiting_receipt' && mission.arrived && !mission.received
}

export function missionStatus(phase: Mission['phase']): string {
  switch (phase) {
    case 'outbound': return '수령 장소로 비행 중'
    case 'delivery_landing': return '수령 장소에 착륙 중'
    case 'awaiting_receipt': return '수령 장소 착륙 완료 · 수령 확인 대기 중'
    case 'arrival_hold': return '수령 지점에서 대기 중'
    case 'return_takeoff': return '수령 확인 완료 · 귀환을 위해 이륙 중'
    case 'returning': return '수령 확인 완료 · 출발지로 귀환 중'
    case 'landing': return '출발지에 착륙 중'
    case 'completed': return '출발지 착륙 완료 · 비행 기록 확인 중'
    default: { const unreachable: never = phase; return unreachable }
  }
}

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
