import { useCallback, useEffect, useState } from 'react'
import { CustomerApiError, customerJson, customerRequest } from './client'
import { customerSchema, type Customer } from './models'

export type CustomerSessionState =
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | { status: 'ready'; customer: Customer | null }

export function useCustomerSession() {
  const [state, setState] = useState<CustomerSessionState>({ status: 'checking' })

  const refresh = useCallback(async () => {
    setState({ status: 'checking' })
    try {
      const customer = await customerJson('/auth/me', customerSchema)
      setState({ status: 'ready', customer })
    } catch (error) {
      if (error instanceof CustomerApiError && error.status === 401) {
        setState({ status: 'ready', customer: null })
        return
      }
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '계정을 확인하지 못했습니다.',
      })
    }
  }, [])

  useEffect(() => {
    let active = true
    void customerJson('/auth/me', customerSchema)
      .then((customer) => {
        if (active) setState({ status: 'ready', customer })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof CustomerApiError && error.status === 401) {
          setState({ status: 'ready', customer: null })
          return
        }
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '계정을 확인하지 못했습니다.',
        })
      })
    return () => { active = false }
  }, [])

  const logout = useCallback(async () => {
    await customerRequest('/auth/logout', { method: 'POST' })
    setState({ status: 'ready', customer: null })
  }, [])

  return { state, refresh, logout }
}
