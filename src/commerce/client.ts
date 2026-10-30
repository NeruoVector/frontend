import { apiUrl, readApiError } from '../api'

export class CustomerApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CustomerApiError'
    this.status = status
  }
}

export function customerApiUrl(path: string): string {
  return apiUrl(`/api/v1${path}`)
}

export async function customerRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(customerApiUrl(path), {
    ...init,
    credentials: 'include',
    cache: init.cache ?? 'no-store',
  })
  if (!response.ok) {
    throw new CustomerApiError(await readApiError(response), response.status)
  }
  return response
}

export async function customerJson<T>(
  path: string,
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
  init: RequestInit = {},
): Promise<T> {
  const response = await customerRequest(path, init)
  const payload: unknown = await response.json()
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new CustomerApiError('서버 응답 형식이 올바르지 않습니다.', response.status)
  }
  return parsed.data
}
