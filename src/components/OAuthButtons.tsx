import { useEffect, useState, type ReactNode } from 'react'
import { oauthProviders, oauthStartUrl, type OAuthAvailability, type OAuthProvider } from '../oauth.ts'

type Props = {
  readonly icons: Readonly<Record<OAuthProvider, ReactNode>>
  readonly disabled: boolean
  readonly onStart: () => void
  readonly onReturn: () => void
}
const providers = [
  { id: 'naver', name: '네이버' },
  { id: 'kakao', name: '카카오' },
  { id: 'google', name: '구글' },
] as const

export function OAuthButtons({ icons, disabled, onStart, onReturn }: Props) {
  const [available, setAvailable] = useState<OAuthAvailability>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    void oauthProviders(controller.signal).then(value => {
      if (!controller.signal.aborted) setAvailable(value)
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      if (cause instanceof Error) setAvailable([])
      else throw cause
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const url = new URL(location.href)
    if (url.searchParams.has('oauth_error')) {
      url.searchParams.delete('oauth_error')
      history.replaceState(null, '', url)
    }
  }, [])
  useEffect(() => {
    window.addEventListener('pageshow', onReturn)
    return () => window.removeEventListener('pageshow', onReturn)
  }, [onReturn])
  const enabledProviders = providers.filter(provider => available.some(value => value.provider === provider.id && value.enabled))
  if (enabledProviders.length === 0) return null
  return <>
    <div className="oauth-row" aria-label="소셜 로그인">
      {enabledProviders.map(provider => <button key={provider.id} type="button"
        disabled={disabled || loading}
        onClick={() => { onStart(); location.assign(oauthStartUrl(provider.id)) }}
        className={`oauth oauth-${provider.id}`} aria-label={`${provider.name}로 로그인`} title={`${provider.name}로 로그인`}>
        {icons[provider.id]}
      </button>)}
    </div>
  </>
}
