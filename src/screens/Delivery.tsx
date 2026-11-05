import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Footer, Header, Screen } from '../components/Layout.tsx'
import { RouteMap } from '../components/RouteMap.tsx'
import { CameraIcon, CheckIcon, DroneIcon, InfoIcon, PhoneIcon } from '../components/Icons.tsx'
import { STORE, won } from '../data.ts'
import { useRouter } from '../router.tsx'
import { useAppState, type Order } from '../store.tsx'
import './Delivery.css'
import { LiveCamera } from '../components/LiveCamera.tsx'
import { api, ApiError, type Review } from '../api.ts'
import { useOrderFlightProgress } from '../useOrderFlightProgress.ts'
import { flightDistance, flightEta, flightStep } from '../flightProgress.ts'
import { MissionMap } from '../components/MissionMap.tsx'

export function useOrder() {
  const order = useAppState().order
  if (!order) throw new Error('주문을 먼저 선택해 주세요.')
  return order
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
  const progress = useOrderFlightProgress(order)

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
        <span className="done-eta">{progress.completed || progress.mission?.arrived ? '목적지 도착 완료' : progress.mission ? `예상 도착 ${flightEta(progress.mission.delivery_eta_seconds)}` : '예상 도착 · 출발 후 안내'}</span>
        <p className="desc">목적지까지 {flightDistance(progress.completed ? 0 : progress.mission?.delivery_distance_m ?? null)}</p>
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
      <p className="done-number">주문번호 {order.pickupCode}</p>
      <p className="desc done-pickup-hint">이 4자리 번호가 상품 수령 시 사용하는 비밀번호입니다. 계정 비밀번호와 다릅니다.</p>
    </Screen>
  )
}

/* ───────────── 13 배달 현황 ───────────── */

const STEPS = ['주문 접수', '준비 중', '비행 중', '비행 완료'] as const

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

  const { simulation, fresh, active, completed, error, mission } = useOrderFlightProgress(order)
  const mode = simulation?.mode ?? 'waiting_for_order'
  const position = fresh ? simulation?.position_enu : null
  const moving = active && (mode === 'flying' || mode === 'landing')
  const current = flightStep(order.status, completed, active, moving || simulation?.armed === true || mission?.arrived === true)
  const status = completed ? '시뮬레이션 비행 완료' : !fresh ? '비행 상태 확인 중' : active && mode.startsWith('hold_') ? (mode === 'hold_route_unavailable' ? '수령 장소의 비행 경로를 확인해 주세요' : '안전 확인을 위해 대기 중') : mission?.phase === 'arrival_hold' ? '목적지 도착 · 수령 지점 확인 중' : mission?.phase === 'returning' || mission?.phase === 'landing' ? '목적지 도착 · 출발지로 귀환 중' : moving ? '주문을 받아 비행 중' : '출발 대기 중'

  return (
    <Screen
      header={<Header title="배달 현황" />}
      footer={
        <Footer>
          <Button disabled={!completed} onClick={() => navigate('arriving')}>비행 완료 확인</Button>
        </Footer>
      }
    >
      <section className="track-head">
        <p className="eyebrow">학교 드론 시뮬레이션</p>
        <h1 className="track-title">주문 비행 현황</h1>
        <p className="desc track-desc" role="status">{status}</p>{error && <p role="alert">{error}</p>}
      </section>
      <DeliverySteps current={current} />
      <dl className="track-metrics" aria-label="배달 거리와 예상 도착">
        <div><dt>목적지까지 남은 거리</dt><dd>{flightDistance(completed ? 0 : mission?.delivery_distance_m ?? null)}</dd></div>
        <div><dt>예상 도착</dt><dd>{completed || mission?.arrived ? '도착 완료' : mission ? flightEta(mission.delivery_eta_seconds) : '출발 후 안내'}</dd></div>
        {mission && !completed && <div><dt>귀환 포함 남은 비행거리</dt><dd>{flightDistance(mission.remaining_distance_m)}</dd></div>}
      </dl>
      {mission && <MissionMap mission={mission} position={fresh ? simulation?.position_enu ?? null : null} />}

      {active && !completed && <dl className="track-place track-telemetry" aria-label="실시간 드론 위치">
        <div><dt>고도</dt><dd>{position ? `${Math.max(0, position[2]).toFixed(1)} m` : '확인 중'}</dd></div>
        <div><dt>현재 위치 (동 / 북)</dt><dd>{position ? `${position[0].toFixed(1)} / ${position[1].toFixed(1)} m` : '확인 중'}</dd></div>
      </dl>}
      <div className="track-monitor"><p className="desc">주문한 가상 수령 지점에 도착한 뒤 출발지로 귀환합니다. 거리와 도착 예상은 실시간 경로를 기준으로 갱신됩니다.</p>
      <a className="desc" href="/monitor/#camera" target="_blank" rel="noreferrer">실시간 영상과 드론 모니터 열기</a></div>
      {active && !completed && <LiveCamera />}
      <div className="track-drone">
        <span className="track-drone-icon">
          <DroneIcon />
        </span>
        <div className="track-drone-text">
          <strong>교내 드론 배달</strong>
          <small>{simulation?.drone_id ?? '연결 확인 중'}</small>
        </div>
        <a className="icon-button track-call" href="tel:0000" aria-label="배달 문의">
          <PhoneIcon />
        </a>
      </div>
      <div className="track-place">
        <span className="desc">받을 장소</span>
        <strong>{order.placeName}</strong>
        <p>주문번호 {order.pickupCode}</p>
        <p className="desc">이 4자리 번호가 상품 수령 시 사용하는 비밀번호입니다. 계정 비밀번호와 다릅니다.</p>
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
          <Button onClick={() => navigate('tracking')}>실시간 비행 상태 보기</Button>
        </Footer>
      }
    >
      <section className="arrive-hero">
        <p className="eyebrow">수령 준비</p>
        <h1 className="arrive-title">
          시뮬레이션 비행을
          <br />
          확인해 주세요.
        </h1>
        <p className="arrive-desc">
          수령 요청 장소: {order.placeName}
          <br />
          실제 배송지 도착 알림은 제공하지 않습니다.
        </p>
      </section>
      <RouteMap />
      <section className="arrive-place">
        <div className="arrive-place-row">
          <h3>{order.placeName}</h3>
          <span>수령 요청 정보</span>
        </div>
        <p className="notice-box arrive-notice">
          <InfoIcon />
          <span>
            아래 화면의 지도는 수령 장소 안내 예시입니다.
            <br />
            실제 위치는 실시간 드론 모니터에서 확인해 주세요.
          </span>
        </p>
      </section>
    </Screen>
  )
}

/* ───────────── 15 수령 확인 ───────────── */

export function ReceivedScreen() {
  const order = useOrder()
  const { pickupCode } = order

  return (
    <Screen
      header={<Header title="주문 확인" />}
      footer={
        <Footer>
          <Button disabled>수령 확인 준비 중</Button>
        </Footer>
      }
    >
      <RouteMap />
      <section className="recv-head">
        <p className="eyebrow">주문 정보</p>
        <h1 className="title-xl recv-title">주문번호를 확인해 주세요</h1>
        <p className="desc recv-desc">시뮬레이션에서는 실물 수령을 확인하지 않습니다.</p>
      </section>
      <div className="recv-card-wrap">
        <div className="recv-card">
          <p className="recv-label">주문번호</p>
          <p className="recv-code">{pickupCode}</p>
          <p className="recv-hint">이 4자리 번호가 상품 수령 시 사용하는 비밀번호입니다. 계정 비밀번호와 다릅니다.</p>
        </div>
      </div>
      <section className="recv-check">
        <h3>수령 전 확인해 주세요</h3>
        <ol>
          <li>주문한 메뉴와 수량을 확인해 주세요.</li>
          <li>실물 수령 확인 기능은 준비 중입니다.</li>
        </ol>
      </section>
    </Screen>
  )
}

/* ───────────── 16 리뷰 작성 ───────────── */

const REVIEW_TAGS = ['맛있어요', '배달이 빨라요', '포장이 깔끔해요'] as const
const REVIEW_MAX = 500

export function ReviewScreen() {
  const order = useOrder()
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [photo, setPhoto] = useState<string | null>(null)

  const [saved, setSaved] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const savingRef = useRef(false)
  const photoReader = useRef<FileReader | null>(null)
  const showSaved = useCallback((review: Review) => {
    setSaved(review); setRating(review.rating); setText(review.content); setTags(review.tags); setPhoto(null)
  }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    api.review(order.id).then(review => { if (active) showSaved(review) }).catch((cause: unknown) => {
      if (active && !(cause instanceof ApiError && cause.status === 404)) setError(cause instanceof Error ? cause.message : '리뷰를 불러오지 못했습니다.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [order.id, showSaved])
  useEffect(() => () => { const reader = photoReader.current; photoReader.current = null; reader?.abort() }, [])

  function readPhoto(file: File | undefined) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setError('사진은 JPG·PNG·WebP 형식, 1MB 이하만 등록할 수 있습니다.'); return
    }
    photoReader.current?.abort()
    const reader = new FileReader()
    photoReader.current = reader
    setReadingPhoto(true); setError(null)
    reader.onload = () => {
      if (photoReader.current !== reader) return
      if (typeof reader.result === 'string') setPhoto(reader.result)
      setReadingPhoto(false)
    }
    reader.onerror = () => { if (photoReader.current === reader) { setError('사진을 읽지 못했습니다. 다시 선택해 주세요.'); setReadingPhoto(false) } }
    reader.readAsDataURL(file)
  }

  async function saveReview() {
    if (savingRef.current || saved || loading || readingPhoto) return
    savingRef.current = true
    setSaving(true); setError(null); setMessage(null)
    try {
      const review = await api.createReview(order.id, { rating, content: text.trim(), tags, photo_data_url: photo })
      showSaved(review); setMessage('리뷰가 등록됐습니다.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '리뷰를 저장하지 못했습니다.')
      if (cause instanceof ApiError && cause.status === 409) {
        try {
          const existing = await api.review(order.id)
          showSaved(existing); setError(null); setMessage('이미 등록된 리뷰를 불러왔습니다.')
        } catch (lookup) {
          setError(lookup instanceof ApiError && lookup.status === 404 ? cause.message : lookup instanceof Error ? lookup.message : '리뷰를 확인하지 못했습니다.')
        }
      }
    } finally { savingRef.current = false; setSaving(false) }
  }

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  return (
    <Screen
      header={<Header title="리뷰 작성" />}
      footer={
        <Footer>
          <Button disabled={loading || saving || readingPhoto || saved !== null || !text.trim()} onClick={() => void saveReview()}>
            {loading ? '리뷰 확인 중…' : saved ? '등록된 리뷰입니다' : saving ? '저장 중…' : '리뷰 등록하기'}
          </Button>
        </Footer>
      }
    >
      {loading && <p className="review-feedback" role="status">등록된 리뷰를 확인하는 중…</p>}
      {error && <p className="review-feedback" role="alert">{error}</p>}
      {message && <p className="review-feedback" role="status">{message}</p>}
      {saved && !message && <p className="review-feedback">등록된 리뷰를 불러왔습니다.</p>}
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
              disabled={loading || saving || saved !== null}
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
            readOnly={loading || saving || saved !== null}
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
              disabled={loading || saving || saved !== null}
              className={`review-tag ${tags.includes(tag) ? 'is-on' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <label className="review-photo">
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={loading || saving || saved !== null} onChange={event => readPhoto(event.target.files?.[0])} />
          {photo || saved?.has_photo ? <img src={photo ?? api.reviewPhotoUrl(saved?.id ?? '')} alt="등록할 리뷰 사진" /> : <><CameraIcon /><span>사진 추가</span></>}
        </label>
        {photo && !saved && <button className="order-btn" type="button" disabled={saving || readingPhoto} onClick={() => setPhoto(null)}>사진 삭제</button>}
        <p className="review-photo-note">JPG·PNG·WebP 사진 1장, 최대 1MB</p>
        {readingPhoto && <p role="status">사진을 읽는 중…</p>}
        <p className="review-note">리뷰에는 연락처 등 개인정보를 적지 말아주세요.</p>
      </section>
    </Screen>
  )
}
