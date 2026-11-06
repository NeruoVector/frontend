import { useEffect, useState, type ReactNode } from 'react'
import { Header, Screen } from '../components/Layout.tsx'
import { BottomNav } from '../components/BottomNav.tsx'
import {
  CardIcon,
  ChevronRightIcon,
  LogoutIcon,
  PinIcon,
  ReceiptIcon,
  SettingsIcon,
  UserIcon,
} from '../components/Icons.tsx'
import { STORE, won } from '../data.ts'
import { useRouter, type Route } from '../router.tsx'
import { useAuth } from '../auth.tsx'
import { useAppState } from '../store.tsx'
import { api, type Order as ApiOrder } from '../api.ts'
import { canHaveFlightCompletion, checkFlightCompletions, historyCompletion } from '../orderFlightCompletion.ts'
import './Account.css'
import { ReviewEntries, useReviews } from '../components/Reviews.tsx'

/* ───────────── 17 주문 내역 ───────────── */

const ORDER_LABELS: Readonly<Record<string, string>> = { pending_payment: '미결제', paid: '결제 완료', preparing: '준비 중', ready: '준비 완료', assigned: '배차 완료', in_transit: '배송 중', delivered: '수령 완료', cancelled: '취소', failed: '처리 실패' }

const ORDER_TABS = ['전체', '진행 중', '완료'] as const

export function OrdersScreen() {
  const { navigate } = useRouter()
  const { loadOrder } = useAppState()
  const { customer } = useAuth()
  const [tab, setTab] = useState<(typeof ORDER_TABS)[number]>('전체')
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [flightCompletions, setFlightCompletions] = useState<ReadonlySet<string>>(new Set())
  const [flightWarning, setFlightWarning] = useState(false)
  useEffect(() => {
    let active = true
    setOrders([])
    setError(null)
    setLoading(Boolean(customer))
    if (customer) api.myOrders().then(value => { if (active) setOrders(value.items) }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : '주문 내역 조회 실패') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [customer?.id])
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const confirmed = new Set<string>()
    setFlightCompletions(new Set())
    setFlightWarning(false)
    async function poll() {
      const ids = orders.filter(order => canHaveFlightCompletion(order.status) && !confirmed.has(order.id)).map(order => order.id)
      const result = await checkFlightCompletions(ids, api.simulationResult, controller.signal)
      if (controller.signal.aborted) return
      for (const id of result.confirmed) confirmed.add(id)
      if (result.confirmed.length) setFlightCompletions(new Set(confirmed))
      setFlightWarning(result.failed)
      if (ids.some(id => !confirmed.has(id))) timer = setTimeout(() => void poll(), 5000)
    }
    void poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [orders])
  const items = orders.map(order => ({ order, ...historyCompletion(order, flightCompletions) }))
    .filter(({ completed }) => tab === '전체' || (tab === '완료' ? completed : !completed))
    .map(({ order, flightCompleted, completed }) => ({
      id: order.id, date: new Date(order.created_at).toLocaleDateString('ko-KR'), number: order.pickup_code ?? order.order_number,
      summary: order.delivery_detail ?? order.delivery_address, total: order.total_amount,
      status: flightCompleted ? '비행 완료' : ORDER_LABELS[order.status] ?? '상태 확인 중',
      active: !completed,
      canTrack: !completed || flightCompleted,
      canReview: ['paid','preparing','ready','assigned','in_transit','delivered'].includes(order.status),
    }))
  async function openOrder(id: string, target: Route) {
    try { await loadOrder(id); navigate(target) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '주문 조회 실패') }
  }

  return (
    <Screen header={<Header title="주문 내역" />} nav={<BottomNav active="orders" />}>
        <div className="store-tabs orders-tabs" role="tablist">
          {ORDER_TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === tab}
              className={`store-tab ${t === tab ? 'is-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="orders-list">{error && <p role="alert">{error}</p>}{flightWarning && <p className="desc" role="status">일부 비행 기록을 확인하지 못했습니다. 자동으로 다시 확인합니다.</p>}{!customer && <p className="desc">로그인하면 내 주문 내역을 확인할 수 있습니다.</p>}
          {items.map((o) => (
            <article key={o.id} className="order-card">
              <div className="order-card-top">
                <span>
                  {o.date}
                  {o.number && ` · 주문번호 ${o.number}`}
                </span>
                <span className={o.active ? 'order-status is-live' : 'order-status'}>{o.status}</span>
              </div>
              <h3>{STORE.name}</h3>
              <p>{o.summary}</p>
              <strong>{won(o.total)}</strong>
              <div className="order-actions">
                {o.canTrack ? (
                  <>
                    <button type="button" className="order-btn is-soft" onClick={() => void openOrder(o.id, 'tracking')}>
                      배달 현황
                    </button>
                    <button type="button" className="order-btn" onClick={() => void openOrder(o.id, 'order-complete')}>
                      주문 정보
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="order-btn" onClick={() => void openOrder(o.id, 'order-complete')}>주문 정보</button>
                  </>
                )}
                {o.canReview && <button type="button" className="order-btn" onClick={() => void openOrder(o.id, 'review')}>리뷰 쓰기 / 보기</button>}
              </div>
            </article>
          ))}
          {loading && <p className="desc" role="status">주문 내역을 불러오는 중…</p>}
          {!loading && !error && customer && items.length === 0 && <p className="desc">주문 내역이 없어요.</p>}
        </div>
    </Screen>
  )
}

/* ───────────── 18 마이 ───────────── */

function MenuItem({
  icon,
  label,
  value,
  onClick,
}: {
  icon?: ReactNode
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button type="button" className="menu-item" onClick={onClick}>
      {icon && <span className="menu-item-icon">{icon}</span>}
      <span className="menu-item-label">{label}</span>
      {value && <span className="menu-item-value">{value}</span>}
      <ChevronRightIcon className="menu-item-chevron" />
    </button>
  )
}

export function MyScreen() {
  const { navigate } = useRouter()
  const { place } = useAppState()
  const { customer } = useAuth()
  const go = (route: Route) => () => navigate(route)

  return (
      <Screen
        nav={<BottomNav active="my" />}
        header={
          <Header
            title="마이"
            right={
              <button type="button" className="icon-button" aria-label="설정" onClick={go('settings')}>
                <SettingsIcon />
              </button>
            }
          />
        }
      >
        <section className="my-profile">
          <span className="my-avatar">
            <UserIcon size={29} />
          </span>
          <div>
            <h2>{customer ? `${customer.name}님` : '로그인이 필요해요'}</h2>
            <p>{customer?.username ?? '계정으로 주문 내역을 관리하세요'}</p>
            {!customer && <button type="button" className="order-btn" onClick={go('login')}>로그인</button>}
          </div>
        </section>
        <div className="section-gap" />
        <MenuItem icon={<ReceiptIcon size={18} />} label="주문 내역" onClick={go('orders')} />
        <MenuItem icon={<ReceiptIcon size={18} />} label="내 리뷰" onClick={go('reviews')} />
        <MenuItem icon={<CardIcon size={18} />} label="결제 안내" onClick={go('payment-methods')} />
        <MenuItem icon={<PinIcon size={18} />} label="기본 수령 장소" value={place.name} onClick={go('change-place')} />
        <div className="section-gap" />
        <MenuItem icon={<SettingsIcon size={18} />} label="설정" onClick={go('settings')} />
      </Screen>
  )
}

/* ───────────── 19 설정 ───────────── */

export function SettingsScreen() {
  const { navigate } = useRouter()
  const { place } = useAppState()
  const { logout, customer } = useAuth()
  const [logoutError, setLogoutError] = useState<string | null>(null)
  async function endSession() {
    try { await logout(); navigate('login', { replace: true }) }
    catch (cause) { setLogoutError(cause instanceof Error ? cause.message : '로그아웃하지 못했습니다.') }
  }

  return (
    <Screen header={<Header title="설정" />}>
      <p className="settings-group">주문 설정</p>
      <div className="settings-list">
        <MenuItem icon={<PinIcon size={18} />} label="기본 수령 장소" value={place.name} onClick={() => navigate('change-place')} />
        <MenuItem icon={<CardIcon size={18} />} label="결제 안내" onClick={() => navigate('payment-methods')} />
      </div>
      <p className="settings-group">앱 정보</p>
      <div className="settings-list">
        <MenuItem label="이용안내 · 개인정보" onClick={() => navigate('terms')} />
      </div>
      <p className="settings-group">계정</p>
      <div className="settings-list">
        <MenuItem icon={<LogoutIcon size={18} />} label={customer ? '로그아웃' : '로그인'} onClick={() => customer ? void endSession() : navigate('login')} />
      </div>
      {logoutError && <p role="alert">{logoutError}</p>}
      <p className="settings-footer">{STORE.name.replace(' 매점', '')} 교내 배달</p>
    </Screen>
  )
}

/* ───────────── 20 결제수단 관리 ───────────── */

export { PaymentMethodsScreen } from './PaymentMethods.tsx'

export function MyReviewsScreen() {
  const { customer } = useAuth()
  const reviews = useReviews(customer?.id, Boolean(customer), true)
  return <Screen header={<Header title="내 리뷰" />} nav={<BottomNav active="my" />}>
    <section className="reviews-page">{!customer ? <p className="desc">로그인하면 내 리뷰를 확인할 수 있습니다.</p> : <>
      {reviews.state.status === 'ready' && <p className="desc">등록한 리뷰 {reviews.state.data.total}개</p>}
      <ReviewEntries {...reviews} />
    </>}</section>
  </Screen>
}
