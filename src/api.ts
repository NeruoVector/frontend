import ky, { HTTPError } from 'ky';
import { z } from 'zod';

export const BASE_URL = (import.meta.env?.VITE_BACKEND_BASE_URL || '').replace(/\/$/, '');
const http = ky.create({ timeout: 15000, retry: 0, credentials: 'same-origin' });

export const itemSchema = z.object({
  id: z.uuid(), sku: z.string(), name: z.string(), description: z.string().nullable(),
  unit_price: z.number().nonnegative(), currency: z.string(), stock_quantity: z.number().int(), active: z.boolean(),
});
const orderItemSchema = z.object({ item_id: z.uuid(), quantity: z.number().int().positive(), unit_price: z.number(), line_total: z.number() });
const paymentSchema = z.object({ id: z.uuid(), order_id: z.uuid(), status: z.string(), amount: z.number(), method: z.string(), failure_reason: z.string().nullable() });
export const orderSchema = z.object({
  id: z.uuid(), order_number: z.string(), pickup_code: z.string().regex(/^\d{4}$/).optional(), customer_name: z.string(), customer_phone: z.string(), status: z.string(),
  total_amount: z.number(), delivery_address: z.string(), delivery_detail: z.string().nullable(), notes: z.string().nullable(), created_at: z.string(),
});
const orderDetailSchema = orderSchema.extend({ pickup_code: z.string().regex(/^\d{4}$/), items: z.array(orderItemSchema), payment: paymentSchema.nullable() });
const enuPoint = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
export const missionSchema = z.object({
  order_id: z.uuid(), destination_id: z.string(),
  phase: z.enum(['outbound', 'arrival_hold', 'returning', 'landing', 'completed']),
  route_enu: z.array(enuPoint).min(2).max(32), waypoint_index: z.number().int().nonnegative(),
  remaining_distance_m: z.number().finite().nonnegative(), eta_seconds: z.number().finite().nonnegative().nullable(),
  delivery_distance_m: z.number().finite().nonnegative(), delivery_eta_seconds: z.number().finite().nonnegative().nullable(),
  arrived: z.boolean(),
});
const simSchema = z.object({ timestamp: z.number().finite(), mode: z.string(), drone_id: z.string(), position_enu: enuPoint.nullable(), armed: z.boolean(), order_id: z.string().nullable().optional(), completed_order_id: z.string().nullable().optional(), mission: missionSchema.nullable().optional() });
export type Item = z.infer<typeof itemSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderDetail = z.infer<typeof orderDetailSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type SimulationState = z.infer<typeof simSchema>;
export type Mission = z.infer<typeof missionSchema>;
export type CreateOrder = { readonly customer_name: string; readonly customer_phone: string; readonly items: readonly { readonly item_id: string; readonly quantity: number }[]; readonly delivery_address: string; readonly delivery_detail?: string; readonly notes?: string };

const reviewSchema = z.object({
  id: z.uuid(), order_id: z.uuid(), rating: z.number().int().min(1).max(5), content: z.string(),
  tags: z.array(z.string()), has_photo: z.boolean(), created_at: z.string(),
});
const reviewListSchema = z.object({ items: z.array(reviewSchema), total: z.number().int().nonnegative(), average_rating: z.number().nullable() });
export type Review = z.infer<typeof reviewSchema>;
export type ReviewList = z.infer<typeof reviewListSchema>;
export type CreateReview = { readonly rating: number; readonly content: string; readonly tags: readonly string[]; readonly photo_data_url: string | null };

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function request<T>(path: string, schema: z.ZodType<T>, json?: CreateOrder | CreateReview | LoginInput | RegisterInput | { readonly method: string }): Promise<T> {
  try {
    const response = json === undefined ? await http.get(new URL(`${BASE_URL}${path}`, globalThis.location?.origin ?? 'http://localhost').href) : await http.post(new URL(`${BASE_URL}${path}`, globalThis.location?.origin ?? 'http://localhost').href, { json });
    return schema.parse(await response.json());
  } catch (error) {
    if (error instanceof HTTPError) {
      const body = z.object({ message: z.string().optional(), detail: z.string().optional() }).safeParse(error.data);
      throw new ApiError(error.response.status, body.success ? body.data.message ?? body.data.detail ?? `서버 오류 (${error.response.status})` : `서버 오류 (${error.response.status})`);
    }
    throw error;
  }
}

const customerSchema = z.object({ id: z.uuid(), username: z.string(), name: z.string(), phone: z.string() });
export type Customer = z.infer<typeof customerSchema>;
export type LoginInput = { readonly username: string; readonly password: string };
export type RegisterInput = LoginInput & { readonly name: string; readonly phone: string };

export const api = {
  login: (input: LoginInput) => request('/api/v1/auth/login', customerSchema, input),
  register: (input: RegisterInput) => request('/api/v1/auth/register', customerSchema, input),
  me: () => request('/api/v1/auth/me', customerSchema),
  logout: async () => { await http.post(new URL(`${BASE_URL}/api/v1/auth/logout`, globalThis.location?.origin ?? 'http://localhost').href); },
  myOrders: () => request('/api/v1/auth/orders', z.object({ items: z.array(orderSchema), total: z.number() })),
  myOrder: (id: string) => request(`/api/v1/auth/orders/${encodeURIComponent(id)}`, orderDetailSchema),
  myReviews: () => request('/api/v1/auth/reviews', reviewListSchema),
  review: (orderId: string) => request(`/api/v1/orders/${encodeURIComponent(orderId)}/review`, reviewSchema),
  createReview: (orderId: string, payload: CreateReview) => request(`/api/v1/orders/${encodeURIComponent(orderId)}/review`, reviewSchema, payload),
  reviews: (phone?: string) => request(`/api/v1/reviews?limit=20${phone === undefined ? '' : `&phone=${encodeURIComponent(phone)}`}`, reviewListSchema),
  reviewPhotoUrl: (id: string) => `${BASE_URL}/api/v1/reviews/${encodeURIComponent(id)}/photo`,
  items: () => request('/api/v1/inventory?active=true&limit=100', z.array(itemSchema)),
  item: (id: string) => request(`/api/v1/inventory/${encodeURIComponent(id)}`, itemSchema),
  orders: (phone: string) => request(`/api/v1/orders?phone=${encodeURIComponent(phone)}&limit=100`, z.array(orderSchema)),
  order: (id: string) => request(`/api/v1/orders/${encodeURIComponent(id)}`, orderDetailSchema),
  createOrder: (payload: CreateOrder) => request('/api/v1/orders', orderDetailSchema, payload),
  pay: (id: string, method: string) => request(`/api/v1/orders/${encodeURIComponent(id)}/payments`, paymentSchema, { method }),
  simulationResult: async (id: string, signal?: AbortSignal): Promise<boolean> => {
    const response = await http.get(`/simulation/live/orders/${encodeURIComponent(id)}.json`, { signal, cache: 'no-store', timeout: 3000, throwHttpErrors: false });
    if (response.status === 404) return false;
    if (!response.ok) throw new ApiError(response.status, '비행 기록을 조회하지 못했습니다.');
    const result = z.object({ order_id: z.uuid(), timestamp: z.number() }).parse(await response.json());
    return result.order_id === id;
  },
  simulation: async (signal?: AbortSignal): Promise<SimulationState> => simSchema.parse(await http.get('/simulation/live/state.json', { signal, cache: 'no-store', timeout: 3000 }).json()),
};
