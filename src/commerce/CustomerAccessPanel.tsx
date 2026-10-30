import { useEffect, useState } from 'react'
import { z } from 'zod'
import { customerApiUrl, customerJson } from './client'
import { providerSchema, type AuthProvider } from './models'
import type { CustomerSessionState } from './useCustomerSession'

const providersSchema = z.array(providerSchema)

const providerNames: Readonly<Record<AuthProvider, string>> = {
  google: 'Google',
  kakao: '카카오',
  naver: '네이버',
}

type Props = {
  session: CustomerSessionState
  onRefresh: () => void
  onLogout: () => Promise<void>
}

export function CustomerAccessPanel({ session, onRefresh, onLogout }: Props) {
  const [providers, setProviders] = useState<readonly AuthProvider[]>([])
  const [providerState, setProviderState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [providerError, setProviderError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function loadProviders() {
      try {
        setProviders(await customerJson('/auth/providers', providersSchema, { signal: controller.signal }))
        setProviderState('ready')
        setProviderError(null)
      } catch (error) {
        if (controller.signal.aborted) return
        setProviderState('error')
        setProviderError(error instanceof Error ? error.message : '로그인 제공자를 불러오지 못했습니다.')
      }
    }
    void loadProviders()
    return () => controller.abort()
  }, [])

  async function logout() {
    setActionError(null)
    setLoggingOut(true)
    try {
      await onLogout()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '로그아웃하지 못했습니다.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <section className="panel customer-access" aria-labelledby="customer-access-title">
      <div className="panel-head">
        <div>
          <h2 id="customer-access-title">고객 계정</h2>
          <p className="muted small">로그인하면 학생 인증, 배송지 저장과 주문 추적을 사용할 수 있습니다.</p>
        </div>
        {session.status === 'error' && (
          <button className="button button-secondary button-small" type="button" onClick={onRefresh}>
            다시 확인
          </button>
        )}
      </div>

      {session.status === 'checking' && <p className="muted" role="status">고객 세션을 확인하고 있습니다.</p>}
      {session.status === 'error' && <p className="error" role="alert">계정을 확인하지 못했습니다: {session.message}</p>}
      {session.status === 'ready' && session.customer && (
        <div className="customer-session-row">
          <p className="muted">로그인됨 · <strong>{session.customer.name}</strong></p>
          <span className="badge badge-ok">고객</span>
          <button className="button button-secondary button-small" type="button" onClick={() => void logout()} disabled={loggingOut}>
            {loggingOut ? '로그아웃 중…' : '로그아웃'}
          </button>
        </div>
      )}
      {session.status === 'ready' && !session.customer && (
        <div>
          <p className="muted">주문과 배송지를 계정에 안전하게 연결하려면 로그인하세요.</p>
          {providerState === 'loading' && <p className="muted small" role="status">로그인 제공자를 확인하고 있습니다.</p>}
          {providerState === 'error' && (
            <div className="inline-error" role="alert">
              <p className="error">로그인 제공자 목록을 불러오지 못했습니다: {providerError}</p>
              <button className="button button-secondary button-small" type="button" onClick={() => window.location.reload()}>
                다시 불러오기
              </button>
            </div>
          )}
          {providerState === 'ready' && providers.length === 0 && (
            <p className="muted small oauth-unavailable" role="status">
              소셜 로그인을 사용할 수 없습니다. 서버에 OAuth client ID, secret 및 callback 주소를 설정하세요.
            </p>
          )}
          {providers.length > 0 && (
            <div className="provider-actions" aria-label="소셜 로그인">
              {providers.map((provider) => (
                <a className="button button-secondary" href={customerApiUrl(`/auth/${provider}/login`)} key={provider}>
                  {providerNames[provider]}로 로그인
                </a>
              ))}
            </div>
          )}
        </div>
      )}
      {actionError && <p className="error action-error" role="alert">{actionError}</p>}
    </section>
  )
}
