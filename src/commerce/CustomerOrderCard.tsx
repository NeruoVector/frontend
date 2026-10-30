import type { FormEvent } from 'react'
import { formatMoney } from '../format'
import type { AccountOrder, OrderTracking } from './models'
import { canCompleteHandoff, trackingDisplayStatus, trackingStatusBadgeClass } from './trackingPolling'

export type TrackingEntry = { data: OrderTracking | null; error: string | null }

type Props = {
  order: AccountOrder
  entry?: TrackingEntry
  pin: string
  handoffMessage?: string
  saving: boolean
  onPinChange: (value: string) => void
  onHandoff: (event: FormEvent<HTMLFormElement>, order: AccountOrder) => void
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending_payment': return '결제 대기'
    case 'paid': return '결제 완료'
    case 'scheduled': return '배송 준비'
    case 'dispatched': return '배송 출발'
    case 'in_flight': return '비행 중'
    case 'in_transit': return '배송 중'
    case 'arrived': return '도착'
    case 'completed': return '배송 완료'
    case 'failed': return '배송 실패'
    case 'delivered': return '인도 완료'
    case 'cancelled': return '취소'
    default: return status
  }
}

function indoorLabel(tracking: OrderTracking): string {
  if (tracking.destination.room_number) return `호수 ${tracking.destination.room_number}`
  if (tracking.destination.grade !== null && tracking.destination.classroom) {
    return `${tracking.destination.grade}학년 ${tracking.destination.classroom}반`
  }
  if (tracking.destination.grade === null && tracking.destination.classroom === null) return '야외 배송 위치'
  return '실내 위치 정보 확인 필요'
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('ko-KR') : '예정 정보 없음'
}

export function CustomerOrderCard({ order, entry, pin, handoffMessage, saving, onPinChange, onHandoff }: Props) {
  const details = entry?.data
  const canHandoff = details && canCompleteHandoff(details.order_status, details.arrived_at)
  const currentStatus = details
    ? trackingDisplayStatus(details.order_status, details.delivery_status, details.arrived_at)
    : order.status

  return (
    <article className="customer-order-card">
      <div className="order-card-head">
        <div>
          <h3>주문 {order.order_number}</h3>
        <p className="muted small">{new Date(order.created_at).toLocaleString('ko-KR')} · {order.delivery_address}</p>
        </div>
        <span className={trackingStatusBadgeClass(currentStatus)}>{statusLabel(currentStatus)}</span>
      </div>
      <p className="order-total">{formatMoney(order.total_amount, order.currency)}</p>
      {!entry && <p className="muted" role="status">배송 상태를 확인하고 있습니다.</p>}
      {entry?.error && <p className="error" role="alert">배송 정보 조회 실패: {entry.error}</p>}
      {details && (
        <div className="tracking-details">
          <p><strong>배송 상태</strong> {statusLabel(currentStatus)}</p>
          <p><strong>예상 도착</strong> {formatDate(details.eta_at)} <span className="muted small">({details.eta_basis === 'telemetry' ? '최근 위치 기준' : details.eta_basis === 'scheduled_route' ? '계획 경로 기준' : '예정 정보 없음'})</span></p>
          <p><strong>받는 위치</strong> {indoorLabel(details)}</p>
          {details.drone?.stale && <p className="muted small">드론 위치가 오래되어 지도에서 숨겼습니다. 일정 정보는 계속 표시됩니다.</p>}
          <p><strong>예상 상품 무게</strong> {details.estimated_weight_grams === null ? '예상 정보 없음' : `${details.estimated_weight_grams.toLocaleString('ko-KR')}g`}</p>
          <p><strong>실측 적재 무게</strong> {details.measured_payload_weight_grams === null ? '미측정' : `${details.measured_payload_weight_grams.toLocaleString('ko-KR')}g`}</p>
          {details.payload_over_capacity !== null && <p><strong>용량 확인</strong> {details.payload_over_capacity ? '실측 용량 초과' : '실측 용량 이내'}</p>}
          {details.arrived_at && <p className="notice">도착 확인 · {formatDate(details.arrived_at)}</p>}
        </div>
      )}
      {canHandoff && (
        <form className="handoff-form" onSubmit={(event) => onHandoff(event, order)}>
          <label className="field">
            <span>수령 PIN 6자리</span>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={pin} onChange={(event) => onPinChange(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
          </label>
          <button className="button button-small" type="submit" disabled={saving}>{saving ? '확인 중…' : '배송 인도 완료'}</button>
        </form>
      )}
      {handoffMessage && <p className={handoffMessage.includes('완료') ? 'notice' : 'error'} role="status">{handoffMessage}</p>}
    </article>
  )
}
