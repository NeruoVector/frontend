import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { customerJson, customerRequest } from './client'
import { GoogleMapView, type MapMarker } from './GoogleMapView'
import { accountOrdersSchema, type AccountOrder } from './models'
import { CustomerOrderCard } from './CustomerOrderCard'
import { decodeArrivalIds, rememberArrivalId } from './arrivalNotifications'
import { useOrderTrackingPoller } from './useOrderTrackingPoller'

type OrdersState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orders: readonly AccountOrder[] }

type ArrivalToast = { id: string; text: string }
const EMPTY_ORDERS: readonly AccountOrder[] = []
const notifiedStorageKey = 'neurovector.arrival-notifications.v1'

function readNotifiedIds(): Set<string> {
  try {
    return new Set(decodeArrivalIds(localStorage.getItem(notifiedStorageKey)))
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof DOMException) return new Set()
    throw error
  }
}

export function CustomerOrdersPanel() {
  const [orders, setOrders] = useState<OrdersState>({ status: 'loading' })
  const [ordersReloadKey, setOrdersReloadKey] = useState(0)
  const [toasts, setToasts] = useState<readonly ArrivalToast[]>([])
  const seenIds = useRef<Set<string>>(new Set())
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [pins, setPins] = useState<Record<string, string>>({})
  const [handoffState, setHandoffState] = useState<Record<string, string>>({})
  const [savingOrder, setSavingOrder] = useState<string | null>(null)

  const announceArrival = useCallback((id: string, orderNumber: string) => {
    const remembered = rememberArrivalId(Array.from(seenIds.current), id)
    if (!remembered.isNew) return
    seenIds.current = new Set(remembered.seenIds)
    try {
      localStorage.setItem(notifiedStorageKey, JSON.stringify(remembered.seenIds))
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
    }
    const text = `주문 ${orderNumber}이(가) 도착했습니다.`
    setToasts((current) => [...current, { id, text }].slice(-3))
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('배송 도착', { body: text })
      } catch (error) {
        setNotificationError(error instanceof Error ? error.message : '브라우저 알림을 표시하지 못했습니다.')
      }
    }
  }, [])

  useEffect(() => {
    seenIds.current = readNotifiedIds()
  }, [])

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    let active = true
    let permissionStatus: PermissionStatus | null = null
    const syncPermission = () => setNotificationPermission(Notification.permission)
    window.addEventListener('focus', syncPermission)
    document.addEventListener('visibilitychange', syncPermission)
    if (navigator.permissions?.query) {
      void navigator.permissions.query({ name: 'notifications' })
        .then((status) => {
          if (!active) return
          permissionStatus = status
          permissionStatus.addEventListener('change', syncPermission)
          syncPermission()
        })
        .catch((error: unknown) => {
          if (!active) return
          if (error instanceof TypeError || (error instanceof DOMException && error.name === 'NotSupportedError')) return
          setNotificationError(error instanceof Error ? error.message : '알림 상태를 확인하지 못했습니다.')
        })
    }
    return () => {
      active = false
      window.removeEventListener('focus', syncPermission)
      document.removeEventListener('visibilitychange', syncPermission)
      permissionStatus?.removeEventListener('change', syncPermission)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void customerJson('/account/orders', accountOrdersSchema, { signal: controller.signal })
      .then((data) => setOrders({ status: 'ready', orders: data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setOrders({
          status: 'error',
          message: error instanceof Error ? error.message : '주문을 불러오지 못했습니다.',
        })
      })
    return () => controller.abort()
  }, [ordersReloadKey])

  const trackingOrders = orders.status === 'ready' ? orders.orders : EMPTY_ORDERS
  const tracking = useOrderTrackingPoller({ orders: trackingOrders, onArrival: announceArrival })

  useEffect(() => {
    if (toasts.length === 0) return
    const timeout = window.setTimeout(() => setToasts((current) => current.slice(1)), 8_000)
    return () => window.clearTimeout(timeout)
  }, [toasts])

  async function requestNotifications() {
    setNotificationError(null)
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      return
    }
    try {
      setNotificationPermission(await Notification.requestPermission())
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : '알림 권한을 요청하지 못했습니다.')
    }
  }

  async function submitHandoff(event: FormEvent<HTMLFormElement>, order: AccountOrder) {
    event.preventDefault()
    const pin = pins[order.id] ?? ''
    if (!/^\d{6}$/.test(pin)) {
      setHandoffState((current) => ({ ...current, [order.id]: '수령 PIN은 숫자 6자리여야 합니다.' }))
      return
    }
    setSavingOrder(order.id)
    setHandoffState((current) => ({ ...current, [order.id]: '' }))
    try {
      await customerRequest(`/orders/${order.id}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      setHandoffState((current) => ({ ...current, [order.id]: '배송 인도를 완료했습니다.' }))
      setPins((current) => ({ ...current, [order.id]: '' }))
      setOrders({ status: 'loading' })
      setOrdersReloadKey((current) => current + 1)
    } catch (error) {
      setHandoffState((current) => ({
        ...current,
        [order.id]: error instanceof Error ? error.message : '인도를 완료하지 못했습니다.',
      }))
    } finally {
      setSavingOrder(null)
    }
  }

  const markers: MapMarker[] = Object.entries(tracking).flatMap(([orderId, entry]) => {
    const data = entry.data
    if (!data) return []
    const order = orders.status === 'ready' ? orders.orders.find((item) => item.id === orderId) : undefined
    const items: MapMarker[] = []
    const destination = data.destination
    if (destination.latitude !== null && destination.longitude !== null) {
      items.push({ id: `${orderId}-destination`, latitude: destination.latitude, longitude: destination.longitude, label: `주문 ${order?.order_number ?? ''} 배송지` })
    }
    if (data.drone && !data.drone.stale && data.drone.latitude !== null && data.drone.longitude !== null) {
      items.push({ id: `${orderId}-drone`, latitude: data.drone.latitude, longitude: data.drone.longitude, label: `드론 ${data.drone.drone_id}` })
    }
    return items
  })

  return (
    <section className="panel" aria-labelledby="customer-orders-title">
      <div className="panel-head">
        <div>
          <h2 id="customer-orders-title">내 배송</h2>
          <p className="muted small commerce-copy">상태와 ETA는 서버 일정 및 최근 드론 텔레메트리를 기준으로 갱신됩니다.</p>
        </div>
        <button className="button button-secondary button-small" type="button" onClick={() => void requestNotifications()} disabled={notificationPermission === 'unsupported' || notificationPermission === 'granted'}>
          {notificationPermission === 'granted' ? '브라우저 알림 허용됨' : notificationPermission === 'denied' ? '브라우저 설정에서 알림 허용' : notificationPermission === 'unsupported' ? '알림 미지원' : '도착 알림 허용'}
        </button>
      </div>
      {notificationError && <p className="error" role="alert">알림 권한 요청 실패: {notificationError}</p>}
      {notificationPermission === 'denied' && <p className="muted small">브라우저 설정에서 이 사이트의 알림 권한을 켜면 도착 알림을 받을 수 있습니다.</p>}
      {toasts.length > 0 && (
        <div className="arrival-toast-stack" aria-live="polite" aria-relevant="additions">
          {toasts.map((toast) => <p className="notice" key={toast.id} role="status">{toast.text}</p>)}
        </div>
      )}
      {orders.status === 'loading' && <p className="muted" role="status">주문을 불러오고 있습니다.</p>}
      {orders.status === 'error' && <div className="inline-error"><p className="error" role="alert">주문 조회 실패: {orders.message}</p><button className="button button-secondary button-small" type="button" onClick={() => { setOrders({ status: 'loading' }); setOrdersReloadKey((current) => current + 1) }}>주문 다시 불러오기</button></div>}
      {orders.status === 'ready' && orders.orders.length === 0 && <p className="muted">아직 PIN 배송 주문이 없습니다.</p>}
      {orders.status === 'ready' && orders.orders.length > 0 && (
        <>
          {markers.length > 0 ? (
            <div className="tracking-map">
              <GoogleMapView markers={markers} label="주문 배송 위치 및 드론 지도" />
              <ul className="map-marker-list" aria-label="지도 표식 설명">
                <li><span className="map-marker-dot destination" />배송지</li>
                <li className="commerce-copy"><span className="map-marker-dot" />최근 드론 위치 (오래된 위치는 표시하지 않음)</li>
              </ul>
            </div>
          ) : <p className="muted small">지도 표시는 배송지 좌표와 최신 드론 텔레메트리가 준비되면 나타납니다.</p>}
          <div className="customer-order-list">
            {orders.orders.map((order) => {
              const entry = tracking[order.id]
              return (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  entry={entry}
                  pin={pins[order.id] ?? ''}
                  handoffMessage={handoffState[order.id]}
                  saving={savingOrder === order.id}
                  onPinChange={(value) => setPins((current) => ({ ...current, [order.id]: value }))}
                  onHandoff={(event, target) => void submitHandoff(event, target)}
                />
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
