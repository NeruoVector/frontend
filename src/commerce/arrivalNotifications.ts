import { z } from 'zod'

const arrivalIdSchema = z.string().uuid()
const MAX_STORED_ARRIVAL_IDS = 500

export type ArrivalTrackingEvent = {
  id: string
  event_type: string
}

export type ArrivalTracking = {
  arrival_notification_id: string | null
  events: readonly ArrivalTrackingEvent[]
}

export function decodeArrivalIds(raw: string | null): string[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) return []
    throw error
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((candidate): candidate is string => arrivalIdSchema.safeParse(candidate).success)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .slice(-MAX_STORED_ARRIVAL_IDS)
}

export function arrivalNotificationId(tracking: ArrivalTracking): string | null {
  if (tracking.arrival_notification_id && arrivalIdSchema.safeParse(tracking.arrival_notification_id).success) {
    return tracking.arrival_notification_id
  }
  return tracking.events.find((event) => event.event_type === 'arrived' && arrivalIdSchema.safeParse(event.id).success)?.id ?? null
}

export function rememberArrivalId(
  seenIds: readonly string[],
  candidate: string | null,
): { seenIds: string[]; isNew: boolean } {
  if (!candidate || !arrivalIdSchema.safeParse(candidate).success || seenIds.includes(candidate)) {
    return { seenIds: [...seenIds], isNew: false }
  }
  return {
    seenIds: [...seenIds, candidate].slice(-MAX_STORED_ARRIVAL_IDS),
    isNew: true,
  }
}
