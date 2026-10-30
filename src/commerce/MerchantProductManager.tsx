import { useState, type FormEvent } from 'react'
import { formatMoney } from '../format'
import { customerJson, customerRequest } from './client'
import { FoodDatabasePicker } from './FoodDatabasePicker'
import { foodProductDescription, type FoodProduct, type FoodResults } from './foodDatabase'
import { PhotoLookup } from './PhotoLookup'
import { photoDescription } from './photoLookup'
import { merchantProductSchema, type MerchantCategory, type MerchantProduct } from './models'

type Props = {
  categories: readonly MerchantCategory[]
  products: readonly MerchantProduct[]
  onChanged: (products: readonly MerchantProduct[]) => void
}

type ProductForm = {
  sku: string
  name: string
  description: string
  unit_price: string
  currency: string
  stock_quantity: string
  active: boolean
  category_id: string
  image_url: string
  weight_grams: string
}

function emptyForm(categoryId: string): ProductForm {
  return { sku: '', name: '', description: '', unit_price: '0', currency: 'KRW', stock_quantity: '0', active: true, category_id: categoryId, image_url: '', weight_grams: '0' }
}

function imageUrlError(value: string): string | null {
  if (!value.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : '상품 이미지는 HTTP 또는 HTTPS URL로 입력하세요.'
  } catch (error) {
    if (error instanceof TypeError) return '상품 이미지는 HTTP 또는 HTTPS URL로 입력하세요.'
    throw error
  }
}

export function MerchantProductManager({ categories, products, onChanged }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MerchantProduct | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm(categories[0]?.id ?? ''))
  const [saving, setSaving] = useState(false)
  const [formSession, setFormSession] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [databaseOpen, setDatabaseOpen] = useState(false)
  const [importedProduct, setImportedProduct] = useState<FoodProduct | null>(null)

  function startCreate() {
    setFormSession((value) => value + 1)
    setDatabaseOpen(false)
    setImportedProduct(null)
    setEditing(null)
    setForm(emptyForm(categories[0]?.id ?? ''))
    setFormOpen(true)
    setError(null)
    setNotice(null)
  }

  function startEdit(product: MerchantProduct) {
    setFormSession((value) => value + 1)
    setDatabaseOpen(false)
    setImportedProduct(null)
    setEditing(product)
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description ?? '',
      unit_price: String(product.unit_price),
      currency: product.currency,
      stock_quantity: String(product.stock_quantity),
      active: product.active,
      category_id: product.category_id,
      image_url: product.image_url,
      weight_grams: String(product.weight_grams),
    })
    setFormOpen(true)
    setError(null)
    setNotice(null)
  }

  function importProduct(product: FoodProduct, dataset: FoodResults['dataset']) {
    setFormSession((value) => value + 1)
    const category = categories[0]
    if (!category) return
    setEditing(null)
    setForm({
      ...emptyForm(category.id),
      sku: `MFDS-${category.merchant_id}-${product.food_code}`,
      name: product.name.slice(0, 160),
      description: foodProductDescription(product, dataset),
      image_url: '',
      weight_grams: product.weight_grams === null ? '' : String(product.weight_grams),
      unit_price: '',
      stock_quantity: '',
      active: false,
    })
    setImportedProduct(product)
    setDatabaseOpen(false)
    setFormOpen(true)
    setError(null)
    setNotice('상품 정보를 불러왔습니다. 가격·재고·배송 무게와 판매 여부를 확인한 뒤 저장하세요.')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    const price = Number(form.unit_price)
    const stock = Number(form.stock_quantity)
    const weight = Number(form.weight_grams)
    const sku = form.sku.trim()
    const name = form.name.trim()
    if (!editing && (!sku || sku.length > 160)) return setError('SKU를 1~160자로 입력하세요.')
    if (!name || name.length > 160) return setError('상품 이름을 1~160자로 입력하세요.')
    if (!form.unit_price.trim() || !Number.isInteger(price) || price < 0) return setError('가격은 0 이상의 정수여야 합니다.')
    if (!form.stock_quantity.trim() || !Number.isInteger(stock) || stock < 0) return setError('재고는 0 이상의 정수여야 합니다.')
    if (!form.weight_grams.trim() || !Number.isInteger(weight) || weight < 0) return setError('무게는 0 이상의 정수(g)여야 합니다.')
    if (!form.category_id) return setError('상품 분류를 선택하세요.')
    const invalidImageUrl = imageUrlError(form.image_url)
    if (invalidImageUrl) return setError(invalidImageUrl)

    const common = {
      name,
      description: form.description.trim() || null,
      unit_price: price,
      currency: form.currency,
      stock_quantity: stock,
      active: form.active,
      category_id: form.category_id,
      image_url: form.image_url.trim(),
      weight_grams: weight,
    }
    const body = editing ? common : { ...common, sku }
    setSaving(true)
    try {
      const saved = await customerJson(
        editing ? `/merchant/products/${editing.id}` : '/merchant/products',
        merchantProductSchema,
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      onChanged(editing ? products.map((item) => item.id === saved.id ? saved : item) : [...products, saved])
      setFormOpen(false)
      setEditing(null)
      setNotice(editing ? '상품을 수정했습니다.' : '상품을 추가했습니다.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '상품을 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(product: MerchantProduct) {
    setError(null)
    setNotice(null)
    try {
      await customerRequest(`/merchant/products/${product.id}`, { method: 'DELETE' })
      onChanged(products.filter((item) => item.id !== product.id))
      setNotice('상품을 삭제했습니다.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '상품을 삭제하지 못했습니다.')
    }
  }

  return (
    <section className="panel" aria-labelledby="merchant-products-title">
      <div className="panel-head">
        <div><h2 id="merchant-products-title">상품 관리</h2><p className="muted small">가격, 재고, 이미지와 배송 무게를 관리합니다.</p></div>
        <div className="row-actions"><button className="button button-secondary button-small" type="button" onClick={() => { setDatabaseOpen(true); setFormOpen(false); setError(null); setNotice(null) }} disabled={categories.length === 0}>식품 DB에서 가져오기</button><button className="button button-small" type="button" onClick={startCreate} disabled={categories.length === 0}>상품 추가</button></div>
      </div>
      {categories.length === 0 && <p className="muted">상품을 추가하려면 먼저 상품 분류를 만드세요.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {databaseOpen && <FoodDatabasePicker onChoose={importProduct} onClose={() => setDatabaseOpen(false)} />}
      {products.length === 0 && <p className="muted">등록된 상품이 없습니다.</p>}
      {products.length > 0 && (
        <div className="scroll">
          <table className="table admin-table merchant-product-table">
            <thead><tr><th>상품</th><th>분류</th><th>가격 / 재고</th><th>무게</th><th>상태</th><th>관리</th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td><strong>{product.name}</strong><span className="muted small product-sku">{product.sku}</span></td>
                  <td>{categories.find((category) => category.id === product.category_id)?.name ?? '분류 없음'}</td>
                  <td className="nowrap">{formatMoney(product.unit_price, product.currency)}<span className="muted small product-sku">재고 {product.stock_quantity}개</span></td>
                  <td className="nowrap">{product.weight_grams.toLocaleString('ko-KR')}g</td>
                  <td><span className={product.active ? 'badge badge-online' : 'badge badge-offline'}>{product.active ? '판매 중' : '중지'}</span></td>
                  <td><div className="row-actions"><button className="button button-secondary button-small" type="button" onClick={() => startEdit(product)}>수정</button><button className="link-button" type="button" onClick={() => void remove(product)}>삭제</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {formOpen && (
        <form className="form-grid merchant-product-form" onSubmit={(event) => void submit(event)}>
          <div className="panel-head field-wide"><h3>{editing ? '상품 수정' : '상품 추가'}</h3><button className="button button-secondary button-small" type="button" onClick={() => setFormOpen(false)}>닫기</button></div>
          {importedProduct && <p className="muted small field-wide commerce-copy">식약처 식품코드 {importedProduct.food_code}에서 가져왔습니다. 포장 표시 중량은 배송 실측 무게와 다를 수 있습니다. 가격·재고를 입력하고 판매 여부를 선택하세요.</p>}
          <label className="field"><span>SKU *</span><input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} disabled={Boolean(editing)} maxLength={160} required /></label>
          <label className="field"><span>상품 이름 *</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={160} required /></label>
          <label className="field"><span>분류 *</span><select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="field"><span>가격 *</span><input type="number" min="0" step="1" value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: event.target.value })} required /></label>
          <label className="field"><span>통화 *</span><select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>{['KRW', 'USD', 'JPY', 'EUR'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          <label className="field"><span>재고 *</span><input type="number" min="0" step="1" value={form.stock_quantity} onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })} required /></label>
          <label className="field"><span>무게 (g) *</span><input type="number" min="0" step="1" value={form.weight_grams} onChange={(event) => setForm({ ...form, weight_grams: event.target.value })} required /></label>
          <label className="field field-wide"><span>상품 이미지 URL</span><input type="url" value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value, description: form.description.split('\n').filter((line) => !line.startsWith('사진 출처: Open Food Facts ')).join('\n') })} placeholder="https://example.com/product.jpg" /></label>
          <PhotoLookup key={formSession} onApply={(candidate) => setForm((current) => ({ ...current, image_url: candidate.imageUrl, description: [...current.description.split('\n').filter((line) => !line.startsWith('사진 출처: Open Food Facts ')), photoDescription(candidate)].filter(Boolean).join('\n') }))} />
          <label className="field field-wide"><span>상품 설명</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="checkbox field-wide"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> 판매 중</label>
          <div className="form-actions field-wide"><button className="button" type="submit" disabled={saving}>{saving ? '저장 중…' : editing ? '수정 저장' : '상품 추가'}</button><button className="button button-secondary" type="button" onClick={() => setFormOpen(false)}>취소</button></div>
        </form>
      )}
    </section>
  )
}
