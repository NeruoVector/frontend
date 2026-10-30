import { useState, type FormEvent } from 'react'
import { formatMoney } from '../format'
import { changeCartQuantity, type Cart } from './cart'
import { customerJson } from './client'
import { createdOrderSchema, type CatalogProduct, type CreatedOrder, type Spot } from './models'
import type { CustomerSessionState } from './useCustomerSession'

type Props = {
  products: readonly CatalogProduct[]
  cart: Cart
  customerSession: CustomerSessionState
  selectedSpot: Spot | null
  onCartChanged: (cart: Cart) => void
  onOpenAccount: () => void
  onOrderCreated: (order: CreatedOrder) => void
}

export function CheckoutPanel({ products, cart, customerSession, selectedSpot, onCartChanged, onOpenAccount, onOrderCreated }: Props) {
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cartItems = products.flatMap((product) => {
    const quantity = cart[product.id] ?? 0
    return quantity > 0 ? [{ product, quantity }] : []
  })
  const total = cartItems.reduce((sum, line) => sum + line.product.unit_price * line.quantity, 0)
  const currency = cartItems[0]?.product.currency ?? 'KRW'
  const customer = customerSession.status === 'ready' ? customerSession.customer : null
  const readyToSubmit = Boolean(customer && selectedSpot && cartItems.length > 0 && phone.trim() && /^\d{6}$/.test(pin) && !submitting)

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!customer) {
      setError('PIN 배송 주문은 고객 계정으로 로그인해야 합니다.')
      return
    }
    if (!selectedSpot) {
      setError('배송 위치를 저장하고 선택하세요.')
      return
    }
    if (cartItems.length === 0) {
      setError('주문할 상품을 먼저 담아주세요.')
      return
    }
    if (!phone.trim()) {
      setError('연락처를 입력하세요.')
      return
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('수령 PIN은 숫자 6자리여야 합니다.')
      return
    }

    setSubmitting(true)
    try {
      const created = await customerJson('/orders', createdOrderSchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customer.name,
          customer_phone: phone.trim(),
          items: cartItems.map(({ product, quantity }) => ({ item_id: product.id, quantity })),
          delivery_address: selectedSpot.delivery_address,
          delivery_detail: selectedSpot.delivery_detail,
          latitude: selectedSpot.latitude,
          longitude: selectedSpot.longitude,
          notes: notes.trim() || '웹 스토어 주문',
          spot_id: selectedSpot.id,
          room_number: selectedSpot.room_number,
          grade: selectedSpot.grade,
          classroom: selectedSpot.classroom,
          handoff_pin: pin,
        }),
      })
      onCartChanged({})
      setPhone('')
      setNotes('')
      setPin('')
      onOrderCreated(created)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '주문을 제출하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <aside className="panel cart-panel" aria-label="주문서">
      <div className="panel-head">
        <div><h2>주문서</h2><p className="muted small">상품은 한 판매자와 한 통화로 주문됩니다.</p></div>
        <span className="badge badge-ok">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}개</span>
      </div>
      {cartItems.length === 0 && <p className="muted">상품을 골라 장바구니에 담아주세요.</p>}
      {cartItems.map(({ product, quantity }) => (
        <div className="cart-line" key={product.id}>
          <div><strong>{product.name}</strong><div className="muted small">{formatMoney(product.unit_price, product.currency)} × {quantity}</div></div>
          <div className="cart-line-end">
            <span>{formatMoney(product.unit_price * quantity, product.currency)}</span>
            <div className="quantity-control" aria-label={`${product.name} 수량`}>
              <button type="button" aria-label={`${product.name} 수량 줄이기`} onClick={() => onCartChanged(changeCartQuantity(cart, product, -1))}>−</button>
              <span>{quantity}</span>
              <button type="button" aria-label={`${product.name} 수량 늘리기`} onClick={() => onCartChanged(changeCartQuantity(cart, product, 1))} disabled={quantity >= product.stock_quantity}>+</button>
            </div>
          </div>
        </div>
      ))}
      {cartItems.length > 0 && <div className="cart-total"><span>합계</span><strong>{formatMoney(total, currency)}</strong></div>}

      <section className="checkout-destination" aria-labelledby="checkout-destination-title">
        <div className="panel-head checkout-destination-head"><div><h3 id="checkout-destination-title">배송 위치</h3><p className="muted small">실내는 호수 또는 학년과 반, 야외는 주소와 지도 좌표로 지정합니다.</p></div><button className="link-button" type="button" onClick={onOpenAccount}>위치 관리</button></div>
        {selectedSpot ? (
          <div className="selected-spot">
            <strong>{selectedSpot.label}</strong>
            <span>{selectedSpot.delivery_address}{selectedSpot.delivery_detail ? ` · ${selectedSpot.delivery_detail}` : ''}</span>
            <span className="muted small">{selectedSpot.room_number ? `호수 ${selectedSpot.room_number}` : selectedSpot.grade !== null && selectedSpot.classroom ? `${selectedSpot.grade}학년 ${selectedSpot.classroom}반` : selectedSpot.grade === null && selectedSpot.classroom === null ? '야외 배송 위치' : '위치 정보 확인 필요'} · {selectedSpot.latitude.toFixed(5)}, {selectedSpot.longitude.toFixed(5)}</span>
          </div>
        ) : <p className="muted">배송/계정 탭에서 저장 위치를 추가하고 선택하세요.</p>}
      </section>

      {customerSession.status === 'error' && <p className="error" role="alert">로그인 상태 확인 실패: {customerSession.message}</p>}
      {customerSession.status === 'ready' && !customer && (
        <div className="checkout-login"><p className="muted">안전한 PIN 배송 주문은 로그인 후 이용할 수 있습니다.</p><button className="button button-secondary" type="button" onClick={onOpenAccount}>로그인 / 배송 위치 확인</button></div>
      )}
      <form className="checkout-form" onSubmit={(event) => void checkout(event)}>
        <label className="field"><span>연락처 *</span><input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-1234-5678" required /></label>
        <label className="field"><span>배송 요청</span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="전달할 내용을 입력하세요." /></label>
        <label className="field"><span>수령 PIN 6자리 *</span><input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} required aria-describedby="handoff-pin-hint" /></label>
        <p id="handoff-pin-hint" className="muted small">이 PIN은 수령 확인에 사용됩니다. 안전하게 기억해 두세요.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button checkout-button" type="submit" disabled={!readyToSubmit}>{submitting ? '주문 처리 중…' : 'PIN 배송 주문'}</button>
        <p className="muted small">주문 접수 후 배송 상태와 예상 도착 시간은 내 배송 화면에서 확인할 수 있습니다.</p>
      </form>
    </aside>
  )
}
