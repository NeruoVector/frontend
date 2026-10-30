export const TRACKING_POLL_INTERVAL_MS = 8_000
export const TRACKING_BACKGROUND_POLL_INTERVAL_MS = 30_000
export const MAX_TRACKING_POLL_INTERVAL_MS = 60_000
export const MAX_TRACKING_REQUEST_CONCURRENCY = 6

export function trackingPollDelay(isVisible: boolean, consecutiveFailures: number): number {
  const baseInterval = isVisible ? TRACKING_POLL_INTERVAL_MS : TRACKING_BACKGROUND_POLL_INTERVAL_MS
  const failureExponent = Math.min(Math.max(0, consecutiveFailures), 3)
  return Math.min(baseInterval * (2 ** failureExponent), MAX_TRACKING_POLL_INTERVAL_MS)
}

const terminalStatuses = new Set(['delivered', 'completed', 'cancelled', 'failed'])

export function isTerminalTrackingStatus(status: string | null | undefined): boolean {
  return status !== null && status !== undefined && terminalStatuses.has(status.toLowerCase())
}

export function canCompleteHandoff(orderStatus: string, arrivedAt: string | null): boolean {
  return orderStatus === 'in_transit' && arrivedAt !== null
}

export function isOrderTrackingComplete(
  orderStatus: string,
  deliveryStatus: string | null,
): boolean {
  return isTerminalTrackingStatus(orderStatus)
    || isTerminalTrackingStatus(deliveryStatus)
}

export function trackingDisplayStatus(
  orderStatus: string,
  deliveryStatus: string | null,
  arrivedAt: string | null,
): string {
  if (isTerminalTrackingStatus(orderStatus)) return orderStatus
  if (deliveryStatus !== null && isTerminalTrackingStatus(deliveryStatus)) return deliveryStatus
  if (arrivedAt !== null || orderStatus.toLowerCase() === 'arrived' || deliveryStatus?.toLowerCase() === 'arrived') {
    return 'arrived'
  }
  return deliveryStatus ?? orderStatus
}

export function trackingStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'failed':
      return 'badge badge-danger'
    case 'cancelled':
      return 'badge muted'
    case 'delivered':
    case 'completed':
      return 'badge badge-ok'
    default:
      return 'badge badge-warn'
  }
}

export function mergeTrackingEntries<T>(
  current: Readonly<Record<string, T>>,
  updates: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
  return { ...current, ...updates }
}

export function ordersNeedingTracking<T extends { id: string }>(
  orders: readonly T[],
  terminalOrderIds: ReadonlySet<string>,
): T[] {
  return orders.filter((order) => !terminalOrderIds.has(order.id))
}
