import { useState, type ReactNode } from 'react'
import { Header, Screen } from '../components/Layout.tsx'
import { BottomNav } from '../components/BottomNav.tsx'
import {
  BellIcon,
  CardIcon,
  ChevronRightIcon,
  LogoutIcon,
  PlusIcon,
  PhoneIcon,
  PinIcon,
  ReceiptIcon,
  SettingsIcon,
  UserIcon,
} from '../components/Icons.tsx'
import { PRODUCTS, STORE, won } from '../data.ts'
import { useRouter, type Route } from '../router.tsx'
import { useAppState } from '../store.tsx'
import { orderSummary, useOrder } from './Delivery.tsx'
import './Account.css'

/* ───────────── 17 주문 내역 ───────────── */

type HistoryItem = {
  id: string
  date: string
  number?: string
  summary: string
  total: number
  status: '배달 중' | '수령 완료'
  reorder: typeof PRODUCTS
}

const PAST_ORDERS: HistoryItem[] = [
  {
    id: 'past-1',
    date: '10.25 (일)',
    summary: '포테이토칩 60g 외 1개',
    total: 3500,
    status: '수령 완료',
    reorder: [PRODUCTS[0], PRODUCTS[1]],
  },
  { id: 'past-2', date: '10.23 (금)', summary: '청포도젤리 50g', total: 2000, status: '수령 완료', reorder: [PRODUCTS[1]] },
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const ORDER_TABS = ['전체', '진행 중', '완료'] as const

export function OrdersScreen() {
  const { navigate } = useRouter()
  const { addToCart } = useAppState()
  const order = useOrder()
  const [tab, setTab] = useState<(typeof ORDER_TABS)[number]>('전체')

  const d = order.createdAt
  const current: HistoryItem = {
    id: order.number,
    date: `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAYS[d.getDay()]})`,
    number: order.number.slice(-4),
    summary: orderSummary(order),
    total: order.total,
    status: '배달 중',
    reorder: order.lines.map((l) => l.product),
  }
  const items = [current, ...PAST_ORDERS].filter(
    (o) => tab === '전체' || (tab === '진행 중' ? o.status === '배달 중' : o.status === '수령 완료'),
  )

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
        <div className="orders-list">
          {items.map((o) => (
            <article key={o.id} className="order-card">
              <div className="order-card-top">
                <span>
                  {o.date}
                  {o.number && ` · 주문번호 ${o.number}`}
                </span>
                <span className={o.status === '배달 중' ? 'order-status is-live' : 'order-status'}>{o.status}</span>
              </div>
              <h3>{STORE.name}</h3>
              <p>{o.summary}</p>
              <strong>{won(o.total)}</strong>
              <div className="order-actions">
                {o.status === '배달 중' ? (
                  <>
                    <button type="button" className="order-btn is-soft" onClick={() => navigate('tracking')}>
                      배달 현황
                    </button>
                    <button type="button" className="order-btn" onClick={() => navigate('order-complete')}>
                      주문 정보
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="order-btn"
                      onClick={() => {
                        o.reorder.forEach((p) => addToCart(p))
                        navigate('cart')
                      }}
                    >
                      다시 담기
                    </button>
                    <button type="button" className="order-btn is-soft" onClick={() => navigate('review')}>
                      리뷰 쓰기
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
          {items.length === 0 && <p className="desc">주문 내역이 없어요.</p>}
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
  onClick?: () => void
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
            <h2>선린님</h2>
            <p>오늘도 맛있는 하루 보내세요</p>
          </div>
          <button type="button" className="icon-button my-profile-more" aria-label="내 정보">
            <ChevronRightIcon />
          </button>
        </section>
        <div className="my-stats-wrap">
          <dl className="my-stats">
            <div>
              <dt>포인트</dt>
              <dd>
                500<small>P</small>
              </dd>
            </div>
            <div>
              <dt>쿠폰</dt>
              <dd>
                2<small>장</small>
              </dd>
            </div>
            <div>
              <dt>내 리뷰</dt>
              <dd>
                3<small>개</small>
              </dd>
            </div>
          </dl>
        </div>
        <div className="section-gap my-gap" />
        <MenuItem icon={<ReceiptIcon size={18} />} label="주문 내역" onClick={go('orders')} />
        <MenuItem icon={<ReceiptIcon size={18} />} label="내 리뷰" />
        <MenuItem icon={<CardIcon size={18} />} label="결제수단 관리" onClick={go('payment-methods')} />
        <MenuItem icon={<PinIcon size={18} />} label="기본 수령 장소" value={place.name} onClick={go('change-place')} />
        <div className="section-gap" />
        <MenuItem icon={<BellIcon size={18} />} label="공지사항" />
        <MenuItem icon={<PhoneIcon size={18} />} label="고객센터" />
        <MenuItem icon={<SettingsIcon size={18} />} label="설정" onClick={go('settings')} />
      </Screen>
  )
}

/* ───────────── 19 설정 ───────────── */

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}

const NOTIFICATIONS = [
  { key: 'order', label: '주문 상태 알림', desc: '주문 접수와 배달 진행을 알려드려요' },
  { key: 'arrive', label: '도착 알림', desc: '수령 장소에 도착하면 알려드려요' },
  { key: 'event', label: '혜택 및 이벤트 알림', desc: '새로운 소식과 혜택을 받아보세요' },
] as const

export function SettingsScreen() {
  const { navigate } = useRouter()
  const { place } = useAppState()
  const [notify, setNotify] = useState<Record<string, boolean>>({ order: true, arrive: true, event: false })

  return (
    <Screen header={<Header title="설정" />}>
      <p className="settings-group">알림 설정</p>
      {NOTIFICATIONS.map((n) => (
        <div key={n.key} className="settings-toggle-row">
          <div>
            <p>{n.label}</p>
            <small>{n.desc}</small>
          </div>
          <Toggle label={n.label} checked={notify[n.key]} onChange={(v) => setNotify({ ...notify, [n.key]: v })} />
        </div>
      ))}
      <p className="settings-group">주문 설정</p>
      <div className="settings-list">
        <MenuItem icon={<PinIcon size={18} />} label="기본 수령 장소" value={place.name} onClick={() => navigate('change-place')} />
        <MenuItem icon={<CardIcon size={18} />} label="결제수단 관리" onClick={() => navigate('payment-methods')} />
      </div>
      <p className="settings-group">앱 정보</p>
      <div className="settings-list">
        <MenuItem label="이용약관" onClick={() => navigate('terms')} />
        <MenuItem label="개인정보 처리방침" />
        <MenuItem label="앱 버전" value="1.0.0" />
      </div>
      <p className="settings-group">계정</p>
      <div className="settings-list">
        <MenuItem icon={<LogoutIcon size={18} />} label="로그아웃" onClick={() => navigate('login', { replace: true })} />
      </div>
      <p className="settings-footer">{STORE.name.replace(' 매점', '')} 교내 배달</p>
    </Screen>
  )
}

/* ───────────── 20 결제수단 관리 ───────────── */

type PayCard = { id: string; name: string; last4: string; theme: 'light' | 'dark' }

export function PaymentMethodsScreen() {
  const [cards, setCards] = useState<PayCard[]>([
    { id: 'shinhan', name: '신한카드', last4: '1234', theme: 'light' },
    { id: 'kb', name: '국민은행', last4: '5678', theme: 'dark' },
  ])
  const [defaultId, setDefaultId] = useState('shinhan')

  return (
    <Screen header={<Header title="결제수단 관리" />}>
      <div className="paym">
        <p className="desc paym-desc">자주 쓰는 결제수단을 등록해 두세요.</p>
        <div className="paym-cards">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`pay-card-item is-${c.theme}`}
              aria-pressed={c.id === defaultId}
              onClick={() => setDefaultId(c.id)}
            >
              <span className="pay-card-top">
                <strong>{c.name}</strong>
                {c.id === defaultId && <span className="pay-card-badge">기본</span>}
              </span>
              <span className="pay-card-chip" />
              <span className="pay-card-number">•••• •••• {c.last4}</span>
              <span className="pay-card-brand">SEONRIN</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="paym-add"
          onClick={() =>
            setCards((prev) => [
              ...prev,
              {
                id: `card-${prev.length + 1}`,
                name: '새 카드',
                last4: String(1000 + prev.length * 1111).slice(-4),
                theme: prev.length % 2 === 0 ? 'light' : 'dark',
              },
            ])
          }
        >
          <PlusIcon />
          <span>결제수단 추가</span>
        </button>
        <p className="paym-note">
          결제수단을 누르면 기본 결제수단으로 설정돼요.
          <br />
          등록된 정보는 이 시안 안에서만 사용됩니다.
        </p>
      </div>
    </Screen>
  )
}
