import { useEffect, useRef, useState } from 'react'
import { customerJson } from './client'
import { orderTrackingSchema, type AccountOrder, type OrderTracking } from './models'
import { arrivalNotificationId } from './arrivalNotifications'
import type { TrackingEntry } from './CustomerOrderCard'
import {
  isOrderTrackingComplete,
  isTerminalTrackingStatus,
  MAX_TRACKING_REQUEST_CONCURRENCY,
  mergeTrackingEntries,
  ordersNeedingTracking,
  trackingPollDelay,
} from './trackingPolling'

function trackingPageIsVisible(): boolean {
  return document.visibilityState !== 'hidden'
}

async function loadTrackingInBatches(
  orders: readonly AccountOrder[],
  signal: AbortSignal,
): Promise<Array<PromiseSettledResult<OrderTracking>>> {
  const results: Array<PromiseSettledResult<OrderTracking>> = []
  for (let start = 0; start < orders.length; start += MAX_TRACKING_REQUEST_CONCURRENCY) {
    if (signal.aborted) break
    const batch = orders.slice(start, start + MAX_TRACKING_REQUEST_CONCURRENCY)
    const batchResults = await Promise.allSettled(batch.map((order) =>
      customerJson(`/account/orders/${order.id}/tracking`, orderTrackingSchema, { signal }),
    ))
    results.push(...batchResults)
  }
  return results
}

type Props = {
  orders: readonly AccountOrder[]
  onArrival: (id: string, orderNumber: string) => void
}

export function useOrderTrackingPoller({ orders, onArrival }: Props): Readonly<Record<string, TrackingEntry>> {
  const [tracking, setTracking] = useState<Readonly<Record<string, TrackingEntry>>>({})
  const terminalOrderIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (orders.length === 0) return
    let active = true
    let inFlight = false
    let timeout: number | undefined
    let controller: AbortController | null = null
    let consecutiveFailures = 0
    let resumeWhenVisible = false

    function remainingOrders() {
      return ordersNeedingTracking(orders, terminalOrderIds.current)
    }

    function scheduleNextPoll() {
      if (!active || remainingOrders().length === 0) return
      const delay = trackingPollDelay(trackingPageIsVisible(), consecutiveFailures)
      timeout = window.setTimeout(() => {
        timeout = undefined
        void poll()
      }, delay)
    }

    async function poll() {
      if (!active || inFlight) return
      const ordersToPoll = remainingOrders()
      if (ordersToPoll.length === 0) return
      inFlight = true
      const currentController = new AbortController()
      controller = currentController
      try {
        const results = await loadTrackingInBatches(ordersToPoll, currentController.signal)
        if (!active || currentController.signal.aborted) return
        const next: Record<string, TrackingEntry> = {}
        let failedRequests = 0
        results.forEach((result, index) => {
          const order = ordersToPoll[index]
          if (!order) return
          if (result.status === 'fulfilled') {
            next[order.id] = { data: result.value, error: null }
            if (isTerminalTrackingStatus(order.status)
              || isOrderTrackingComplete(result.value.order_status, result.value.delivery_status)) {
              terminalOrderIds.current.add(order.id)
            }
            const arrivalId = arrivalNotificationId(result.value)
            if (arrivalId) onArrival(arrivalId, order.order_number)
          } else {
            failedRequests += 1
            next[order.id] = {
              data: null,
              error: result.reason instanceof Error ? result.reason.message : '배송 상태를 확인하지 못했습니다.',
            }
            if (isTerminalTrackingStatus(order.status)) terminalOrderIds.current.add(order.id)
          }
        })
        setTracking((current) => mergeTrackingEntries(current, next))
        consecutiveFailures = failedRequests === 0 ? 0 : consecutiveFailures + 1
      } finally {
        inFlight = false
        if (controller === currentController) controller = null
        const resumeImmediately = resumeWhenVisible && trackingPageIsVisible()
        resumeWhenVisible = false
        if (resumeImmediately) queueMicrotask(() => void poll())
        else scheduleNextPoll()
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        if (timeout !== undefined) {
          window.clearTimeout(timeout)
          timeout = undefined
          scheduleNextPoll()
        }
        return
      }
      if (!inFlight) {
        if (timeout !== undefined) window.clearTimeout(timeout)
        timeout = undefined
        void poll()
      } else {
        resumeWhenVisible = true
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    void poll()
    return () => {
      active = false
      if (timeout !== undefined) window.clearTimeout(timeout)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [orders, onArrival])

  return tracking
}
