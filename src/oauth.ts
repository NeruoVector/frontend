import ky from 'ky'
import { z } from 'zod'
import { BASE_URL } from './api.ts'

export const oauthProviderSchema = z.enum(['kakao', 'naver', 'google'])
export type OAuthProvider = z.infer<typeof oauthProviderSchema>
export const oauthProvidersSchema = z.array(z.object({ provider: oauthProviderSchema, enabled: z.boolean() }))
export type OAuthAvailability = z.infer<typeof oauthProvidersSchema>
const http = ky.create({ timeout: 8000, retry: 0, credentials: 'same-origin', cache: 'no-store' })

export function oauthStartUrl(provider: OAuthProvider): string {
  return `${BASE_URL}/api/v1/auth/oauth/${provider}/start`
}

export async function oauthProviders(signal: AbortSignal): Promise<OAuthAvailability> {
  const url = new URL(`${BASE_URL}/api/v1/auth/oauth/providers`, location.origin).href
  return oauthProvidersSchema.parse(await http.get(url, { signal }).json())
}

export function oauthError(search: string): string | null {
  const code = new URLSearchParams(search).get('oauth_error')
  if (code === null) return null
  switch (code) {
    case 'cancelled': return '소셜 로그인이 취소되었습니다. 다시 선택해 주세요.'
    case 'unavailable': return '현재 이 소셜 로그인을 사용할 수 없습니다.'
    case 'invalid_state': return '로그인 요청이 만료되었거나 일치하지 않습니다. 다시 시작해 주세요.'
    default: return '소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
