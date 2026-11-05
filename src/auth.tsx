import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, type Customer, type LoginInput, type RegisterInput } from './api.ts'

type Auth = {
  readonly customer: Customer | null
  readonly loading: boolean
  readonly error: string | null
  readonly login: (input: LoginInput) => Promise<void>
  readonly register: (input: RegisterInput) => Promise<void>
  readonly logout: () => Promise<void>
}
const AuthContext = createContext<Auth | null>(null)
export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  useEffect(() => {
    const version = ++generation.current
    api.me().then(value => { if (generation.current === version) setCustomer(value) }).catch((cause: unknown) => {
      if (generation.current !== version) return
      if (cause instanceof ApiError && cause.status === 401) return
      setError(cause instanceof Error ? cause.message : '로그인 상태를 확인하지 못했습니다.')
    }).finally(() => { if (generation.current === version) setLoading(false) })
    return () => { generation.current++ }
  }, [])
  async function authenticate(input: LoginInput | RegisterInput, signup: boolean) {
    const version = ++generation.current
    const value = signup && 'name' in input ? await api.register(input) : await api.login(input)
    if (version === generation.current) { setCustomer(value); setError(null); setLoading(false) }
  }
  async function logout() {
    await api.logout()
    generation.current++
    setCustomer(null)
    setError(null)
  }
  return <AuthContext.Provider value={{ customer, loading, error, login: input => authenticate(input, false), register: input => authenticate(input, true), logout }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth requires AuthProvider')
  return value
}
