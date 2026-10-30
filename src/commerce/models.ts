import { z } from 'zod'

export const customerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  merchant_enabled: z.boolean(),
})

export type Customer = z.infer<typeof customerSchema>

export const providerSchema = z.enum(['google', 'kakao', 'naver'])

export type AuthProvider = z.infer<typeof providerSchema>

export const catalogProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  unit_price: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3),
  stock_quantity: z.number().int().nonnegative(),
  active: z.boolean().default(true),
  merchant_id: z.string().uuid().nullable().optional(),
  merchant_name: z.string().nullable().optional(),
  merchant_cover_photo_url: z.string().nullable().optional(),
  cover_photo_url: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  category_name: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  weight_grams: z.number().int().nonnegative().nullable().optional(),
})

export type CatalogProduct = z.infer<typeof catalogProductSchema>

export const catalogResponseSchema = z.union([
  z.array(catalogProductSchema),
  z.object({ items: z.array(catalogProductSchema) }).transform(({ items }) => items),
])

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_price: z.number().int().nonnegative(),
  line_total: z.number().int().nonnegative(),
})

export const createdOrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  customer_name: z.string(),
  customer_phone: z.string(),
  status: z.string(),
  total_amount: z.number().int().nonnegative(),
  currency: z.string(),
  delivery_address: z.string(),
  delivery_detail: z.string().nullable(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  notes: z.string().nullable(),
  items: z.array(orderItemSchema),
  payment: z.unknown().nullable(),
  created_at: z.string(),
})

export type CreatedOrder = z.infer<typeof createdOrderSchema>

export const studentVerificationSchema = z.object({
  school: z.string(),
  student_number: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  reason: z.string().nullable(),
  submitted_at: z.string(),
  reviewed_at: z.string().nullable(),
})

export type StudentVerification = z.infer<typeof studentVerificationSchema>

export const optionalStudentVerificationSchema = studentVerificationSchema.nullable()

export const spotSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  delivery_address: z.string(),
  delivery_detail: z.string().nullable(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  room_number: z.string().nullable(),
  grade: z.number().int().nullable(),
  classroom: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Spot = z.infer<typeof spotSchema>

export const spotListSchema = z.array(spotSchema)

export const accountOrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  customer_name: z.string(),
  customer_phone: z.string(),
  status: z.string(),
  total_amount: z.number().int().nonnegative(),
  currency: z.string(),
  delivery_address: z.string(),
  delivery_detail: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  notes: z.string().nullable(),
  delivery_id: z.string().uuid().nullable(),
  stock_restored_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type AccountOrder = z.infer<typeof accountOrderSchema>

export const accountOrdersSchema = z.array(accountOrderSchema)

export const trackingEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  occurred_at: z.string(),
  payload: z.unknown(),
})

export const orderTrackingSchema = z.object({
  order_id: z.string().uuid(),
  order_status: z.string(),
  delivery_status: z.string().nullable(),
  scheduled_at: z.string().nullable(),
  eta_at: z.string().nullable(),
  eta_basis: z.string(),
  drone: z.object({
    drone_id: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    speed_mps: z.number().nullable(),
    observed_at: z.string().nullable(),
    stale: z.boolean(),
  }).nullable(),
  destination: z.object({
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    room_number: z.string().nullable(),
    grade: z.number().int().nullable(),
    classroom: z.string().nullable(),
  }),
  estimated_weight_grams: z.number().int().nullable(),
  measured_payload_weight_grams: z.number().int().nullable(),
  measured_at: z.string().nullable(),
  payload_over_capacity: z.boolean().nullable(),
  arrived_at: z.string().nullable(),
  arrival_notification_id: z.string().uuid().nullable(),
  events: z.array(trackingEventSchema),
})

export type OrderTracking = z.infer<typeof orderTrackingSchema>

export const merchantProfileSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  cover_url: z.string(),
})

export type MerchantProfile = z.infer<typeof merchantProfileSchema>

export const merchantSummarySchema = merchantProfileSchema.pick({ id: true, name: true, description: true, cover_url: true })
export const merchantListSchema = z.array(merchantSummarySchema)
export type MerchantSummary = z.infer<typeof merchantSummarySchema>

export const merchantCategorySchema = z.object({
  id: z.string().uuid(),
  merchant_id: z.string().uuid(),
  name: z.string(),
})

export const merchantCategoryListSchema = z.array(merchantCategorySchema)
export type MerchantCategory = z.infer<typeof merchantCategorySchema>

export const merchantProductSchema = z.object({
  id: z.string().uuid(),
  merchant_id: z.string().uuid(),
  category_id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  unit_price: z.number().int().nonnegative(),
  currency: z.string(),
  stock_quantity: z.number().int().nonnegative(),
  active: z.boolean(),
  image_url: z.string(),
  weight_grams: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const merchantProductListSchema = z.array(merchantProductSchema)
export type MerchantProduct = z.infer<typeof merchantProductSchema>

export function isDisplayableImageUrl(value: string | null | undefined): value is string {
  if (!value) return false
  if (value.startsWith('/')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch (error) {
    if (error instanceof TypeError) return false
    throw error
  }
}
