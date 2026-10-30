import { useEffect, useState } from 'react'
import { customerJson } from './client'
import { MerchantCatalogManager } from './MerchantCatalogManager'
import { MerchantProfilePanel } from './MerchantProfilePanel'
import {
  merchantCategoryListSchema,
  merchantProductListSchema,
  merchantProfileSchema,
  type Customer,
  type MerchantCategory,
  type MerchantProduct,
  type MerchantProfile,
} from './models'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

export function MerchantWorkspace({ customer }: { customer: Customer }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [profile, setProfile] = useState<MerchantProfile | null>(null)
  const [categories, setCategories] = useState<readonly MerchantCategory[]>([])
  const [products, setProducts] = useState<readonly MerchantProduct[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      customerJson('/merchant/profile', merchantProfileSchema, { signal: controller.signal }),
      customerJson('/merchant/categories', merchantCategoryListSchema, { signal: controller.signal }),
      customerJson('/merchant/products', merchantProductListSchema, { signal: controller.signal }),
    ])
      .then(([merchant, merchantCategories, merchantProducts]) => {
        if (controller.signal.aborted) return
        setProfile(merchant)
        setCategories(merchantCategories)
        setProducts(merchantProducts)
        setState({ status: 'ready' })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: error instanceof Error ? error.message : '판매자 정보를 불러오지 못했습니다.' })
      })
    return () => controller.abort()
  }, [customer.id, reloadKey])

  if (!customer.merchant_enabled) {
    return (
      <section className="panel" aria-labelledby="merchant-gate-title">
        <h2 id="merchant-gate-title">판매자 권한이 필요합니다</h2>
        <p className="muted">이 계정에는 판매자 권한이 없습니다. 관리자에게 판매자 권한 승인을 요청하세요.</p>
      </section>
    )
  }

  if (state.status === 'loading') {
    return <section className="panel"><h2>판매자 관리</h2><p className="muted" role="status">매장 정보를 불러오고 있습니다.</p></section>
  }

  if (state.status === 'error' || !profile) {
    return (
      <section className="panel" aria-labelledby="merchant-error-title">
        <div className="panel-head">
          <div><h2 id="merchant-error-title">판매자 관리</h2><p className="error" role="alert">매장 정보를 불러오지 못했습니다: {state.status === 'error' ? state.message : '응답이 없습니다.'}</p></div>
          <button className="button button-secondary" type="button" onClick={() => { setState({ status: 'loading' }); setReloadKey((key) => key + 1) }}>다시 시도</button>
        </div>
      </section>
    )
  }

  return (
    <div className="merchant-workspace">
      <p className="muted small">판매자로 로그인됨 · {customer.name}</p>
      <MerchantProfilePanel profile={profile} onSaved={setProfile} />
      <MerchantCatalogManager
        categories={categories}
        products={products}
        onCategoriesChanged={setCategories}
        onProductsChanged={setProducts}
      />
    </div>
  )
}
