import { useEffect, useState } from 'react'
import { CustomerAccessPanel } from './commerce/CustomerAccessPanel'
import { CustomerStoreWorkspace } from './commerce/CustomerStoreWorkspace'
import { readCartFromStorage, reconcileCart, type Cart } from './commerce/cart'
import { customerJson } from './commerce/client'
import { customerWorkspaceKey } from './commerce/customerWorkspaceKey'
import {
  catalogResponseSchema,
  merchantListSchema,
  type CatalogProduct,
  type MerchantSummary,
} from './commerce/models'
import { useCustomerSession } from './commerce/useCustomerSession'

type Props = {
  onOpenAdmin: () => void
}

type CatalogState = 'loading' | 'error' | 'ready'
const cartStorageKey = 'neurovector.cart.v1'

function readSavedCart(): Cart {
  return readCartFromStorage(() => localStorage.getItem(cartStorageKey))
}

export function StorePage({ onOpenAdmin }: Props) {
  const [products, setProducts] = useState<readonly CatalogProduct[]>([])
  const [merchants, setMerchants] = useState<readonly MerchantSummary[]>([])
  const [catalogState, setCatalogState] = useState<CatalogState>('loading')
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [cart, setCart] = useState<Cart>(readSavedCart)
  const [cartStorageError, setCartStorageError] = useState<string | null>(null)
  const customerSession = useCustomerSession()
  const customerId = customerSession.state.status === 'ready'
    ? customerSession.state.customer?.id ?? null
    : null

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      customerJson('/catalog?limit=500', catalogResponseSchema, { signal: controller.signal }),
      customerJson('/merchants', merchantListSchema, { signal: controller.signal }),
    ])
      .then(([catalog, merchantList]) => {
        if (controller.signal.aborted) return
        setProducts(catalog)
        setMerchants(merchantList)
        setCatalogState('ready')
        setCatalogError(null)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setCatalogState('error')
        setCatalogError(error instanceof Error ? error.message : '스토어를 불러오지 못했습니다.')
      })
    return () => controller.abort()
  }, [reloadKey])

  const safeCart = catalogState === 'ready' ? reconcileCart(cart, products) : cart

  function updateCart(next: Cart) {
    const validated = catalogState === 'ready' ? reconcileCart(next, products) : next
    setCart(validated)
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(validated))
      setCartStorageError(null)
    } catch (error) {
      if (error instanceof DOMException) {
        setCartStorageError('이 브라우저에서는 장바구니를 저장할 수 없습니다.')
        return
      }
      throw error
    }
  }

  function retryCatalog() {
    setCatalogState('loading')
    setReloadKey((key) => key + 1)
  }

  return (
    <main className="page store-page">
      <CustomerAccessPanel
        session={customerSession.state}
        onRefresh={() => void customerSession.refresh()}
        onLogout={customerSession.logout}
      />
      {cartStorageError && <p className="error" role="status">{cartStorageError}</p>}
      <CustomerStoreWorkspace
        key={customerWorkspaceKey(customerId)}
        products={products}
        merchants={merchants}
        loading={catalogState === 'loading'}
        error={catalogState === 'error' ? catalogError : null}
        cart={safeCart}
        customerSession={customerSession.state}
        onCartChanged={updateCart}
        onOpenAdmin={onOpenAdmin}
        onRetry={retryCatalog}
        onOrderCreated={retryCatalog}
      />
    </main>
  )
}
