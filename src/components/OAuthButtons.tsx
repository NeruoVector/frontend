import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './Layout.tsx'
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
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    void oauthProviders(controller.signal).then(setAvailable).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      if (cause instanceof Error) setError('소셜 로그인을 불러오지 못했습니다.')
      else throw cause
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])
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
  return <>
    <div className="oauth-row" aria-label="소셜 로그인">
      {providers.map(provider => <button key={provider.id} type="button"
        disabled={disabled || loading || !available.some(value => value.provider === provider.id && value.enabled)}
        onClick={() => { onStart(); location.assign(oauthStartUrl(provider.id)) }}
        className={`oauth oauth-${provider.id}`} aria-label={`${provider.name}로 로그인`} title={`${provider.name}로 로그인`}>
        {icons[provider.id]}
      </button>)}
    </div>
    {error ? <div><p className="auth-error oauth-feedback" role="alert">{error}</p>
      <Button variant="text" onClick={() => { setError(null); setLoading(true); setReload(value => value + 1) }}>다시 불러오기</Button></div>
      : loading ? <p className="desc oauth-feedback" role="status">소셜 로그인을 확인하는 중…</p>
      : available.length > 0 && !available.some(provider => provider.enabled)
        ? <p className="desc oauth-feedback">현재 소셜 로그인을 사용할 수 없습니다. 아이디로 로그인해 주세요.</p> : null}
  </>
}
