import { useState } from 'react'
import { Button, Footer, Header, Screen } from '../components/Layout.tsx'
import { RouteMap } from '../components/RouteMap.tsx'
import { CameraIcon, CheckIcon, DroneIcon, InfoIcon, PhoneIcon } from '../components/Icons.tsx'
import { PRODUCTS, STORE, won } from '../data.ts'
import { useRouter } from '../router.tsx'
import { useAppState, type Order } from '../store.tsx'
import './Delivery.css'

// 주문 없이 화면을 바로 열었을 때 보여줄 시안 데이터
const SAMPLE_ORDER: Order = {
  number: '20261026-0124',
  pickupCode: '1234',
  lines: [
    { product: PRODUCTS[0], quantity: 1 },
    { product: PRODUCTS[1], quantity: 1 },
  ],
  subtotal: 2500,
  deliveryFee: 1000,
  total: 3500,
  placeName: '1층 현관',
  paymentMethod: '카드 결제',
  createdAt: new Date(2026, 9, 26, 12, 24),
}

export function useOrder() {
  return useAppState().order ?? SAMPLE_ORDER
}

function hhmm(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function etaRange(order: Order) {
  const t = order.createdAt.getTime()
  return `${hhmm(new Date(t + 11 * 60000))} ~ ${hhmm(new Date(t + 16 * 60000))}`
}

export function orderSummary(order: Order) {
  const [first, ...rest] = order.lines
  if (!first) return '-'
  return rest.length > 0 ? `${first.product.name} 외 ${rest.length}개` : first.product.name
}

/* ───────────── 12 주문 완료 ───────────── */

export function OrderCompleteScreen() {
  const { navigate } = useRouter()
  const order = useOrder()

  return (
    <Screen
      header={<Header title="주문 완료" onBack={() => navigate('home', { replace: true })} />}
      footer={
        <Footer>
          <Button onClick={() => navigate('tracking')}>배달 현황 보기</Button>
        </Footer>
      }
    >
      <section className="done-hero">
        <span className="done-icon">
          <CheckIcon size={36} />
        </span>
        <h1 className="done-title">주문이 접수됐어요!</h1>
        <p className="desc done-desc">매점에서 주문한 간식을 준비할게요.</p>
        <span className="done-eta">예상 도착 {etaRange(order)}</span>
      </section>
      <div className="done-card-wrap">
        <dl className="done-card">
          <h3>주문 정보</h3>
          <div>
            <dt>주문 매장</dt>
            <dd>{STORE.name}</dd>
          </div>
          <div>
            <dt>주문 메뉴</dt>
            <dd>{orderSummary(order)}</dd>
          </div>
          <div>
            <dt>받을 장소</dt>
            <dd>{order.placeName}</dd>
          </div>
          <div>
            <dt>결제금액</dt>
            <dd>{won(order.total)}</dd>
          </div>
        </dl>
      </div>
      <p className="done-number">주문번호 {order.number}</p>
    </Screen>
  )
}

/* ───────────── 13 배달 현황 ───────────── */

const STEPS = ['주문 접수', '준비 중', '배달 중', '도착'] as const

function DeliverySteps({ current }: { current: number }) {
  const col = 346 / STEPS.length
  return (
    <div className="steps">
      <svg width="100%" height="24" viewBox="0 0 346 24" aria-hidden="true">
        {STEPS.slice(1).map((_, i) => (
          <line
            key={i}
            x1={col * i + col / 2}
            x2={col * (i + 1) + col / 2}
            y1="12"
            y2="12"
            stroke={i < current ? 'var(--brand)' : '#ece6df'}
            strokeWidth="2"
          />
        ))}
        {STEPS.map((_, i) => {
          const cx = col * i + col / 2
          if (i < current) return <circle key={i} cx={cx} cy="12" r="7.5" fill="var(--brand)" />
          if (i === current)
            return (
              <g key={i}>
                <circle cx={cx} cy="12" r="7.5" fill="var(--brand)" />
                <circle cx={cx} cy="12" r="3.5" fill="#fff" />
              </g>
            )
          return <circle key={i} cx={cx} cy="12" r="7.5" fill="#ece6df" />
        })}
      </svg>
      <ol className="steps-labels">
        {STEPS.map((label, i) => (
          <li key={label} className={i === current ? 'is-current' : ''} aria-current={i === current ? 'step' : undefined}>
            {label}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function TrackingScreen() {
  const { navigate } = useRouter()
  const order = useOrder()

  return (
    <Screen
      header={<Header title="배달 현황" />}
      footer={
        <Footer>
          <Button onClick={() => navigate('arriving')}>도착 안내 확인</Button>
        </Footer>
      }
    >
      <section className="track-head">
        <p className="eyebrow">약속한 곳으로 가는 중</p>
        <h1 className="track-title">{etaRange(order)} 도착 예정</h1>
        <p className="desc track-desc">드론이 간식을 싣고 수령 장소로 이동 중이에요.</p>
      </section>
      <DeliverySteps current={2} />
      <RouteMap height={258} />
      <div className="track-drone">
        <span className="track-drone-icon">
          <DroneIcon />
        </span>
        <div className="track-drone-text">
          <strong>교내 드론 배달</strong>
          <small>{order.placeName}으로 이동 중</small>
        </div>
        <a className="icon-button track-call" href="tel:0000" aria-label="배달 문의">
          <PhoneIcon />
        </a>
      </div>
      <div className="track-place">
        <span className="desc">받을 장소</span>
        <strong>{order.placeName}</strong>
      </div>
    </Screen>
  )
}

/* ───────────── 14 도착 임박 ───────────── */

export function ArrivingScreen() {
  const { navigate } = useRouter()
  const order = useOrder()

  return (
    <Screen
      header={<Header title="도착 안내" />}
      footer={
        <Footer>
          <Button onClick={() => navigate('received')}>수령 번호 확인하기</Button>
        </Footer>
      }
    >
      <section className="arrive-hero">
        <p className="eyebrow">수령 준비</p>
        <h1 className="arrive-title">
          드론이 곧 도착해요.
          <br />
          이제 나와주세요!
        </h1>
        <p className="arrive-desc">
          {order.placeName}에서 만나요.
          <br />
          간식을 빠르게 받을 수 있도록 준비해 주세요.
        </p>
      </section>
      <RouteMap />
      <section className="arrive-place">
        <div className="arrive-place-row">
          <h3>{order.placeName}</h3>
          <span>도보 이동</span>
        </div>
        <p className="notice-box arrive-notice">
          <InfoIcon />
          <span>
            도착하면 주문번호를 확인해 주세요.
            <br />
            다른 사람의 간식과 바뀌지 않도록 주의해 주세요.
          </span>
        </p>
      </section>
    </Screen>
  )
}

/* ───────────── 15 수령 확인 ───────────── */

export function ReceivedScreen() {
  const { navigate } = useRouter()
  const order = useOrder()
  const { pickupCode } = order

  return (
    <Screen
      header={<Header title="간식 수령" />}
      footer={
        <Footer>
          <Button onClick={() => navigate('review')}>간식 받았어요</Button>
        </Footer>
      }
    >
      <RouteMap />
      <section className="recv-head">
        <p className="eyebrow">도착 완료</p>
        <h1 className="title-xl recv-title">{order.placeName}에 도착했어요</h1>
        <p className="desc recv-desc">번호를 확인하고 간식을 받아주세요.</p>
      </section>
      <div className="recv-card-wrap">
        <div className="recv-card">
          <p className="recv-label">내 수령 번호</p>
          <p className="recv-code">{pickupCode}</p>
          <p className="recv-hint">주문하신 간식과 번호가 맞는지 확인해 주세요.</p>
        </div>
      </div>
      <section className="recv-check">
        <h3>수령 전 확인해 주세요</h3>
        <ol>
          <li>주문한 메뉴와 수량을 확인해 주세요.</li>
          <li>간식을 받으신 후 수령 완료를 눌러주세요.</li>
        </ol>
      </section>
    </Screen>
  )
}

/* ───────────── 16 리뷰 작성 ───────────── */

const REVIEW_TAGS = ['맛있어요', '배달이 빨라요', '포장이 깔끔해요'] as const
const REVIEW_MAX = 500

export function ReviewScreen() {
  const { navigate } = useRouter()
  const order = useOrder()
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('깔끔하게 잘 받았어요. 다음에도 주문할게요!')
  const [tags, setTags] = useState<string[]>([])
  const [photo, setPhoto] = useState<string | null>(null)

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  return (
    <Screen
      header={<Header title="리뷰 작성" />}
      footer={
        <Footer>
          <Button disabled={text.trim() === ''} onClick={() => navigate('orders', { replace: true })}>
            리뷰 등록하기
          </Button>
        </Footer>
      }
    >
      <section className="review-head">
        <h3>{STORE.name}</h3>
        <p className="desc">{orderSummary(order)}</p>
        <div className="review-stars" role="radiogroup" aria-label="별점">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n}점`}
              className={n <= rating ? 'is-on' : ''}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          ))}
        </div>
      </section>
      <section className="review-body">
        <label className="review-field">
          <span>어떤 점이 좋았나요?</span>
          <textarea
            value={text}
            maxLength={REVIEW_MAX}
            onChange={(e) => setText(e.target.value)}
            placeholder="간식과 배달은 어떠셨나요?"
          />
        </label>
        <p className="review-count">
          {text.length} / {REVIEW_MAX}
        </p>
        <div className="review-tags">
          {REVIEW_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={tags.includes(tag)}
              className={`review-tag ${tags.includes(tag) ? 'is-on' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <label className="review-photo" style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setPhoto(URL.createObjectURL(file))
            }}
          />
          {!photo && (
            <>
              <CameraIcon />
              <span>사진 추가</span>
            </>
          )}
        </label>
        <p className="review-note">리뷰에는 연락처 등 개인정보를 적지 말아주세요.</p>
      </section>
    </Screen>
  )
}
