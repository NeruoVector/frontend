export const BASE_URL = (import.meta.env?.VITE_BACKEND_BASE_URL || '').replace(/\/$/, '');

export type Item = { id: string; sku: string; name: string; description: string | null; unit_price: number; currency: string; stock_quantity: number; active: boolean };
export type OrderItem = { item_id: string; quantity: number; unit_price: number; line_total: number };
export type Order = { id: string; order_number: string; customer_name: string; customer_phone: string; status: string; total_amount: number; delivery_address: string; delivery_detail: string | null; notes: string | null; created_at: string; items?: OrderItem[] };
export type Payment = { id: string; order_id: string; status: string; amount: number; method: string; failure_reason: string | null };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers } });
  const body = await response.text();
  let data: unknown;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) {
    const detail = typeof data === 'object' && data !== null ? ('detail' in data ? String((data as { detail: unknown }).detail) : 'message' in data ? String((data as { message: unknown }).message) : `서버 오류 (${response.status})`) : `서버 오류 (${response.status})`;
    throw new Error(detail);
  }
  return data as T;
}

export const api = {
  items: () => request<Item[]>('/api/v1/inventory?active=true&limit=100'),
  item: (id: string) => request<Item>(`/api/v1/inventory/${encodeURIComponent(id)}`),
  orders: (phone: string) => request<Order[]>(`/api/v1/orders?phone=${encodeURIComponent(phone)}&limit=100`),
  order: (id: string) => request<Order>(`/api/v1/orders/${encodeURIComponent(id)}`),
  createOrder: (payload: { customer_name: string; customer_phone: string; items: { item_id: string; quantity: number }[]; delivery_address: string; delivery_detail?: string; notes?: string }) => request<Order>('/api/v1/orders', { method: 'POST', body: JSON.stringify(payload) }),
  pay: (id: string, method: string) => request<Payment>(`/api/v1/orders/${encodeURIComponent(id)}/payments`, { method: 'POST', body: JSON.stringify({ method }) }),
};
