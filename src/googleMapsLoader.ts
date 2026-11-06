import type { GoogleMapsApi, GoogleMapsWindow } from './googleMapsTypes.ts'

export class GoogleMapsLoadError extends Error {
  readonly reason: 'missing-key' | 'network' | 'timeout' | 'authentication' | 'unavailable'
  constructor(reason: GoogleMapsLoadError['reason']) {
    super(`Google Maps unavailable: ${reason}`)
    this.reason = reason
  }
}

type LoaderEnvironment = {
  readonly window: GoogleMapsWindow
  readonly document: Pick<Document, 'createElement' | 'head'>
  readonly timeoutMs?: number
}

export function createGoogleMapsLoader(environment: LoaderEnvironment) {
  let pending: Promise<GoogleMapsApi> | undefined
  let authenticationFailed = false
  const authListeners = new Set<() => void>()

  return {
    onAuthenticationFailure(listener: () => void) {
      authListeners.add(listener)
      if (authenticationFailed) listener()
      return () => { authListeners.delete(listener) }
    },
    load(key: string): Promise<GoogleMapsApi> {
      if (!key.trim()) return Promise.reject(new GoogleMapsLoadError('missing-key'))
      if (authenticationFailed) return Promise.reject(new GoogleMapsLoadError('authentication'))
      if (pending) return pending
      pending = new Promise<GoogleMapsApi>((resolve, reject) => {
        const script = environment.document.createElement('script')
        const previousAuthFailure = environment.window.gm_authFailure
        const timer = setTimeout(() => fail('timeout'), environment.timeoutMs ?? 15000)
        const cleanup = () => {
          clearTimeout(timer)
          script.onerror = null
          delete environment.window.__nvGoogleMapsReady
        }
        const fail = (reason: GoogleMapsLoadError['reason']) => {
          cleanup()
          script.remove()
          reject(new GoogleMapsLoadError(reason))
        }
        environment.window.gm_authFailure = () => {
          authenticationFailed = true
          fail('authentication')
          for (const listener of authListeners) listener()
          previousAuthFailure?.()
        }
        environment.window.__nvGoogleMapsReady = () => {
          const maps = environment.window.google?.maps
          if (!maps?.marker?.AdvancedMarkerElement) { fail('unavailable'); return }
          cleanup()
          resolve(maps)
        }
        script.async = true
        script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({
          key: key.trim(), loading: 'async', callback: '__nvGoogleMapsReady', libraries: 'marker', v: 'weekly', language: 'ko', region: 'KR',
        })}`
        script.onerror = () => fail('network')
        environment.document.head.append(script)
      })
      return pending
    },
  }
}

let browserLoader: ReturnType<typeof createGoogleMapsLoader> | undefined
export function googleMapsLoader() {
  browserLoader ??= createGoogleMapsLoader({ window, document })
  return browserLoader
}
