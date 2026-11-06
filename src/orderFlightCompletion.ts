const ELIGIBLE_STATUSES = ['paid', 'preparing', 'ready', 'assigned', 'in_transit'] as const
const TERMINAL_STATUSES = ['delivered', 'cancelled', 'failed', 'refunded'] as const

type HistoryOrder = { readonly id: string; readonly status: string }

export function canHaveFlightCompletion(status: string): boolean {
  return ELIGIBLE_STATUSES.some(candidate => candidate === status)
}

export function historyCompletion(order: HistoryOrder, confirmed: ReadonlySet<string>) {
  const flightCompleted = canHaveFlightCompletion(order.status) && confirmed.has(order.id)
  return { flightCompleted, completed: flightCompleted || TERMINAL_STATUSES.some(status => status === order.status) }
}

export async function checkFlightCompletions(
  ids: readonly string[],
  check: (id: string, signal: AbortSignal) => Promise<boolean>,
  signal: AbortSignal,
): Promise<{ readonly confirmed: readonly string[]; readonly failed: boolean }> {
  // Workers share this cursor and accumulator to bound concurrent requests.
  let next = 0
  let failed = false
  const confirmed: string[] = []
  async function worker() {
    while (!signal.aborted) {
      const id = ids[next++]
      if (id === undefined) return
      try {
        if (await check(id, signal)) confirmed.push(id)
      } catch { // no-excuse-ok: catch -- each independent proof failure is reported to the screen.
        if (signal.aborted) return
        failed = true
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker))
  return { confirmed, failed }
}
