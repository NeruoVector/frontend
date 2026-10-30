import { CheckoutPanel } from './CheckoutPanel'
import { ProductCatalog } from './ProductCatalog'
import type { Cart } from './cart'
import type { CatalogProduct, CreatedOrder, MerchantSummary, Spot } from './models'
import type { CustomerSessionState } from './useCustomerSession'

type Props = {
  products: readonly CatalogProduct[]
  merchants: readonly MerchantSummary[]
  loading: boolean
  error: string | null
  cart: Cart
  customerSession: CustomerSessionState
  selectedSpot: Spot | null
  onCartChanged: (cart: Cart) => void
  onOpenAdmin: () => void
  onOpenAccount: () => void
  onRetry: () => void
  onOrderCreated: (order: CreatedOrder) => void
}

export function Storefront({ products, merchants, loading, error, cart, customerSession, selectedSpot, onCartChanged, onOpenAdmin, onOpenAccount, onRetry, onOrderCreated }: Props) {
  return (
    <section className="page" aria-labelledby="store-title">
      <div className="page-head">
        <div><h2 id="store-title" className="page-title">스토어</h2><p className="muted commerce-copy">판매자별 상품을 둘러보고 PIN 배송 주문을 접수합니다.</p></div>
        <button className="button button-secondary" type="button" onClick={onOpenAdmin}>관리자 콘솔</button>
      </div>
      {loading && <p className="muted" role="status">판매 상품을 불러오고 있습니다.</p>}
      {error && <div className="panel"><p className="error" role="alert">스토어 조회 실패: {error}</p><button className="button button-secondary" type="button" onClick={onRetry}>다시 시도</button></div>}
      {!loading && !error && products.length === 0 && <p className="panel muted">아직 스토어에 판매 중인 상품이 없습니다.</p>}
      <div className="store-layout">
        <ProductCatalog products={products} merchants={merchants} cart={cart} onCartChanged={onCartChanged} />
        <CheckoutPanel
          products={products}
          cart={cart}
          customerSession={customerSession}
          selectedSpot={selectedSpot}
          onCartChanged={onCartChanged}
          onOpenAccount={onOpenAccount}
          onOrderCreated={onOrderCreated}
        />
      </div>
    </section>
  )
}
