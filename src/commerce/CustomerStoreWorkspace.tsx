import { lazy, Suspense, useState } from 'react'
import { CustomerOrdersPanel } from './CustomerOrdersPanel'
import { SpotsPanel } from './SpotsPanel'
import { Storefront } from './Storefront'
import { StudentVerificationPanel } from './StudentVerificationPanel'
import type { Cart } from './cart'
import type { CustomerSessionState } from './useCustomerSession'
import type { CatalogProduct, CreatedOrder, MerchantSummary, Spot } from './models'

const MerchantWorkspace = lazy(() => import('./MerchantWorkspace').then((module) => ({ default: module.MerchantWorkspace })))

type Props = {
  products: readonly CatalogProduct[]
  merchants: readonly MerchantSummary[]
  loading: boolean
  error: string | null
  cart: Cart
  customerSession: CustomerSessionState
  onCartChanged: (cart: Cart) => void
  onOpenAdmin: () => void
  onRetry: () => void
  onOrderCreated: (order: CreatedOrder) => void
}

type StoreTab = 'storefront' | 'account' | 'merchant'

export function CustomerStoreWorkspace({ products, merchants, loading, error, cart, customerSession, onCartChanged, onOpenAdmin, onRetry, onOrderCreated }: Props) {
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)
  const [tab, setTab] = useState<StoreTab>('storefront')
  const [notice, setNotice] = useState<string | null>(null)

  function handleOrderCreated(order: CreatedOrder) {
    setNotice(`주문 ${order.order_number}을 접수했습니다. 수령 PIN은 안전하게 기억해 두세요.`)
    setTab('account')
    onOrderCreated(order)
  }

  return (
    <>
      {notice && <p className="notice" role="status">{notice}</p>}
      <nav className="store-tabs" aria-label="스토어 계정 화면">
        <button className="button button-secondary store-tab" type="button" aria-current={tab === 'storefront' ? 'page' : undefined} onClick={() => { if (tab === 'merchant') onRetry(); setTab('storefront') }}>스토어</button>
        <button className="button button-secondary store-tab" type="button" aria-current={tab === 'account' ? 'page' : undefined} onClick={() => setTab('account')}>배송 / 계정</button>
        <button className="button button-secondary store-tab" type="button" aria-current={tab === 'merchant' ? 'page' : undefined} onClick={() => setTab('merchant')}>판매자</button>
      </nav>

      {tab === 'storefront' && (
        <Storefront
          products={products}
          merchants={merchants}
          loading={loading}
          error={error}
          cart={cart}
          customerSession={customerSession}
          selectedSpot={selectedSpot}
          onCartChanged={onCartChanged}
          onOpenAdmin={onOpenAdmin}
          onOpenAccount={() => setTab('account')}
          onRetry={onRetry}
          onOrderCreated={handleOrderCreated}
        />
      )}
      {tab === 'account' && (
        customerSession.status === 'ready' && customerSession.customer ? (
          <div className="customer-account-workspace">
            <StudentVerificationPanel />
            <SpotsPanel selected={selectedSpot} onSelect={setSelectedSpot} />
            <CustomerOrdersPanel />
          </div>
        ) : (
          <section className="panel" aria-labelledby="account-login-required">
            <h2 id="account-login-required">계정 로그인이 필요합니다</h2>
            <p className="muted">학생 인증, 저장 위치와 내 배송은 고객 계정으로 로그인한 뒤 사용할 수 있습니다.</p>
          </section>
        )
      )}
      {tab === 'merchant' && (
        customerSession.status === 'ready' && customerSession.customer ? (
          <Suspense fallback={<section className="panel"><p className="muted" role="status">판매자 화면을 불러오는 중…</p></section>}><MerchantWorkspace customer={customerSession.customer} /></Suspense>
        ) : (
          <section className="panel"><h2>판매자 관리</h2><p className="muted">판매자 계정을 사용하려면 먼저 로그인하세요.</p></section>
        )
      )}
    </>
  )
}
