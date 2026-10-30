import { useMemo, useState } from 'react'
import { formatMoney } from '../format'
import { canAddProduct, changeCartQuantity, type Cart } from './cart'
import { ImageWithFallback } from './ImageWithFallback'
import type { CatalogProduct, MerchantSummary } from './models'
import { splitProductProvenance } from './productProvenance'

type Props = {
  products: readonly CatalogProduct[]
  merchants: readonly MerchantSummary[]
  cart: Cart
  onCartChanged: (cart: Cart) => void
}

function stockClass(quantity: number): string {
  if (quantity <= 0) return 'badge badge-danger'
  if (quantity <= 5) return 'badge badge-warn'
  return 'badge badge-ok'
}

export function ProductCatalog({ products, merchants, cart, onCartChanged }: Props) {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [merchantFilter, setMerchantFilter] = useState('all')
  const [cartError, setCartError] = useState<string | null>(null)

  const categories = useMemo(() => {
    const items = new Map<string, string>()
    for (const product of products) {
      if (product.category_id && product.category_name) items.set(product.category_id, product.category_name)
    }
    return Array.from(items, ([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name, 'ko'))
  }, [products])

  const filtered = products.filter((product) =>
    (categoryFilter === 'all' || product.category_id === categoryFilter) &&
    (merchantFilter === 'all' || product.merchant_id === merchantFilter),
  )
  const selectedMerchant = merchants.find((merchant) => merchant.id === merchantFilter)

  function changeQuantity(product: CatalogProduct, delta: number) {
    if (delta > 0 && !canAddProduct(product, cart, products)) {
      setCartError('장바구니에는 같은 판매자와 통화의 상품만 담을 수 있습니다.')
      return
    }
    setCartError(null)
    onCartChanged(changeCartQuantity(cart, product, delta))
  }

  return (
    <section className="product-catalog" aria-labelledby="catalog-title">
      <div className="panel catalog-filters">
        <div className="panel-head">
          <div><h2 id="catalog-title">상품 둘러보기</h2><p className="muted small">판매자와 분류를 선택해 상품을 찾으세요.</p></div>
        </div>
        <div className="catalog-filter-row">
          <label className="field"><span>상품 분류</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">모든 분류</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="field"><span>판매자</span><select value={merchantFilter} onChange={(event) => setMerchantFilter(event.target.value)}><option value="all">모든 판매자</option>{merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>)}</select></label>
        </div>
      </div>

      {selectedMerchant && (
        <article className="merchant-cover-card" aria-label={`${selectedMerchant.name} 매장 소개`}>
          <ImageWithFallback
            key={selectedMerchant.cover_url ?? 'no-cover'}
            src={selectedMerchant.cover_url}
            alt={`${selectedMerchant.name} 매장 커버`}
            className="merchant-cover-image"
            fallbackClassName="merchant-cover-image-placeholder"
            fallbackLabel={`${selectedMerchant.name} 매장 커버 이미지 없음`}
            fallbackText="커버 이미지를 불러오지 못했습니다."
            loading="eager"
          />
          <div><h2>{selectedMerchant.name}</h2><p className="muted">{selectedMerchant.description || '판매자 소개가 없습니다.'}</p></div>
        </article>
      )}
      {cartError && <p className="error" role="alert">{cartError}</p>}
      {filtered.length === 0 && <p className="panel muted" role="status">선택한 조건에 표시할 상품이 없습니다.</p>}
      <div className="product-grid" aria-label="판매 상품">
        {filtered.map((product) => {
          const quantity = cart[product.id] ?? 0
          const soldOut = product.stock_quantity === 0
          const merchantName = product.merchant_name ?? merchants.find((merchant) => merchant.id === product.merchant_id)?.name ?? 'NeuroVector'
          const imageUrl = product.image_url
          const provenance = splitProductProvenance(product.description ?? '')
          return (
            <article className="product-card" key={product.id}>
              <ImageWithFallback
                key={imageUrl ?? 'no-image'}
                src={imageUrl}
                alt={product.name}
                className="product-image"
                fallbackClassName="product-image-placeholder"
                fallbackLabel={`${product.name} 이미지 없음`}
                fallbackText="이미지 없음"
              />
              <div className="product-card-head">
                <div><h3>{product.name}</h3><p className="muted small">{merchantName} · {product.category_name ?? '분류 없음'}</p></div>
                <span className={stockClass(product.stock_quantity)}>{soldOut ? '품절' : `재고 ${product.stock_quantity}개`}</span>
              </div>
              {provenance.text && <p className="product-description">{provenance.text}</p>}
              {!provenance.text && provenance.sources.length === 0 && <p className="product-description">상품 설명이 없습니다.</p>}
              {provenance.sources.map((source) => source.kind === 'reference' ? <p className="muted small commerce-copy" key={source.url}><a href={source.url} target="_blank" rel="noreferrer">식약처 식품 정보</a> · 기준일 {source.date}</p> : <p className="muted small commerce-copy" key={source.url}>사진: <a href={source.url} target="_blank" rel="noreferrer">Open Food Facts</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA</a></p>)}
              {product.weight_grams !== null && product.weight_grams !== undefined && <p className="muted small product-weight">배송 무게 {product.weight_grams.toLocaleString('ko-KR')}g</p>}
              <div className="product-card-foot">
                <strong className="price">{formatMoney(product.unit_price, product.currency)}</strong>
                {quantity > 0 ? (
                  <div className="quantity-control">
                    <button type="button" aria-label={`${product.name} 수량 줄이기`} onClick={() => changeQuantity(product, -1)}>−</button>
                    <span aria-live="polite">{quantity}</span>
                    <button type="button" aria-label={`${product.name} 수량 늘리기`} onClick={() => changeQuantity(product, 1)} disabled={quantity >= product.stock_quantity}>+</button>
                  </div>
                ) : (
                  <button className="button button-small" type="button" onClick={() => changeQuantity(product, 1)} disabled={soldOut}>{soldOut ? '품절' : '담기'}</button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
