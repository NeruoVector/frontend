import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export const ROUTES = [
  'terms',
  'login',
  'phone',
  'school',
  'place',
  'home',
  'store',
  'menu',
  'cart',
  'payment',
  'change-place',
  'order-complete',
  'tracking',
  'camera',
  'arriving',
  'received',
  'review',
  'reviews',
  'orders',
  'my',
  'settings',
  'payment-methods',
] as const

export type Route = (typeof ROUTES)[number]

function routeFromHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as readonly string[]).includes(hash) ? (hash as Route) : 'terms'
}

type RouterValue = {
  route: Route
  loginReturnTo: Route
  navigate: (to: Route, options?: { readonly replace?: boolean; readonly returnTo?: Route }) => void
  back: () => void
}

const RouterContext = createContext<RouterValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [loginReturnTo, setLoginReturnTo] = useState<Route>('home')

  useEffect(() => {
    const sync = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const navigate = useCallback((to: Route, options?: { readonly replace?: boolean; readonly returnTo?: Route }) => {
    if (to === 'login') setLoginReturnTo(options?.returnTo ?? 'home')
    if (options?.replace) {
      window.location.replace(`#/${to}`)
    } else {
      window.location.hash = `/${to}`
    }
  }, [])

  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back()
    else navigate('home', { replace: true })
  }, [navigate])

  return <RouterContext.Provider value={{ route, loginReturnTo, navigate, back }}>{children}</RouterContext.Provider>
}

export function useRouter() {
  const value = useContext(RouterContext)
  if (!value) throw new Error('useRouter must be used inside RouterProvider')
  return value
}
