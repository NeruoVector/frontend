import { z } from 'zod'
import { apiUrl, readApiError } from './api'

export const fleetDroneSchema = z.object({
  drone_id: z.string(),
  capacity_grams: z.number().int().positive(),
  home_latitude: z.number(),
  home_longitude: z.number(),
  cruise_speed_mps: z.number().positive(),
  max_altitude_m: z.number().positive(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})
export const fleetListSchema = z.array(fleetDroneSchema)
export const deliverySchema = z.object({
  id: z.string().uuid(),
  route_id: z.string().uuid(),
  drone_id: z.string(),
  cargo: z.string(),
  status: z.string(),
  scheduled_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export const deliveryListSchema = z.array(deliverySchema)
export const payloadMeasurementSchema = z.object({
  id: z.string().uuid(),
  delivery_id: z.string().uuid(),
  drone_id: z.string(),
  estimated_delivery_weight_grams: z.number().int().nullable(),
  weight_grams: z.number().int().nonnegative(),
  capacity_grams: z.number().int().positive(),
  capacity_exceeded: z.boolean(),
  measured_by: z.string(),
  measured_at: z.string(),
})

export type FleetDrone = z.infer<typeof fleetDroneSchema>
export type Delivery = z.infer<typeof deliverySchema>
export type PayloadMeasurement = z.infer<typeof payloadMeasurementSchema>
export type FleetDroneInput = {
  drone_id: string
  capacity_grams: number
  home_latitude: number
  home_longitude: number
  cruise_speed_mps: number
  max_altitude_m: number
  active: boolean
}
export type FleetForm = {
  drone_id: string
  capacity_grams: string
  home_latitude: string
  home_longitude: string
  cruise_speed_mps: string
  max_altitude_m: string
  active: boolean
}

export const emptyFleetForm: FleetForm = {
  drone_id: '',
  capacity_grams: '1000',
  home_latitude: '',
  home_longitude: '',
  cruise_speed_mps: '8',
  max_altitude_m: '30',
  active: true,
}
export const activeDeliveryStatuses = new Set(['scheduled', 'dispatched', 'in_flight'])

export async function adminJson<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit,
  onSessionExpired: () => void,
): Promise<T> {
  const response = await fetch(apiUrl(path), { ...init, credentials: 'include' })
  if (response.status === 401) {
    onSessionExpired()
    throw new Error('관리자 세션이 만료되었습니다. 다시 로그인하세요.')
  }
  if (!response.ok) throw new Error(await readApiError(response))
  return schema.parse(await response.json())
}

export function fleetFormFrom(drone: FleetDrone): FleetForm {
  return {
    drone_id: drone.drone_id,
    capacity_grams: String(drone.capacity_grams),
    home_latitude: String(drone.home_latitude),
    home_longitude: String(drone.home_longitude),
    cruise_speed_mps: String(drone.cruise_speed_mps),
    max_altitude_m: String(drone.max_altitude_m),
    active: drone.active,
  }
}

export function numberField(value: string, label: string, min: number, max?: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || (max !== undefined && parsed > max)) {
    throw new Error(`${label} 범위를 확인하세요.`)
  }
  return parsed
}

export function deliveryLabel(delivery: Delivery): string {
  const date = new Date(delivery.scheduled_at).toLocaleString('ko-KR')
  return `${delivery.drone_id} · ${delivery.status} · ${date} · ${delivery.id}`
}
