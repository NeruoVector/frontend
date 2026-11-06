import { useEffect, useState } from 'react'
import { api, type SimulationState } from './api.ts'
import { canConfirmReceipt, freshSimulation, matchingMission } from './flightProgress.ts'
import { canHaveFlightCompletion } from './orderFlightCompletion.ts'

export function useOrderFlightProgress(order: { readonly id: string; readonly status: string }) {
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [simulation, setSimulation] = useState<SimulationState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(Date.now)
  useEffect(() => {
    const clock = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(clock)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function poll() {
      const [state, completed] = await Promise.allSettled([api.simulation(controller.signal), api.simulationResult(order.id, controller.signal)])
      if (controller.signal.aborted) return
      const now = Date.now()
      setNowMs(now)
      if (state.status === 'fulfilled') {
        setSimulation(state.value)
        if (freshSimulation(state.value, now) && state.value.completed_order_id === order.id) setCompletedOrderId(order.id)
      }
      if (completed.status === 'fulfilled' && completed.value) setCompletedOrderId(order.id)
      setError(state.status === 'rejected' || completed.status === 'rejected'
        ? '일부 비행 정보를 확인하지 못했습니다. 자동으로 다시 확인합니다.' : null)
      timer = setTimeout(() => void poll(), 1000)
    }
    void poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [order.id])
  const fresh = freshSimulation(simulation, nowMs)
  const eligible = canHaveFlightCompletion(order.status)
  const active = eligible && fresh && simulation?.order_id === order.id
  const completed = order.status === 'delivered' || (eligible && completedOrderId === order.id)
  return { simulation, fresh, active, completed, error, awaitingReceipt: !completed && canConfirmReceipt(simulation, order, nowMs), mission: eligible ? matchingMission(simulation, order.id, nowMs) : null }
}
