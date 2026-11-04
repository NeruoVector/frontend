import { useState } from 'react'
import { Button, Footer, Header, Screen } from '../components/Layout.tsx'
import { BottomNav } from '../components/BottomNav.tsx'
import { RouteMap } from '../components/RouteMap.tsx'
import { BellIcon, CartIcon, CloseIcon, HeartIcon, MinusIcon, PinIcon, PlusIcon, SearchIcon } from '../components/Icons.tsx'
import { CATEGORIES, PLACES, PRODUCTS, STORE, STORE_INFO, won, type Category, type Product } from '../data.ts'
import storeBanner from '../assets/store-banner.png'
import { useRouter } from '../router.tsx'
import { useAppState } from '../store.tsx'
import './Shop.css'

/* ───────────── 수령 장소 선택 목록 (기본 수령 장소 · 수령 장소 변경 공용) ───────────── */

export function PlaceOptions({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="place-options" role="radiogroup" aria-label="수령 장소">
      {PLACES.map((place) => {
        const selected = place.id === value
        return (
          <button
            key={place.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`place-option ${selected ? 'is-selected' : ''}`}
            onClick={() => onChange(place.id)}
          >
            <span className="radio" />
            <span className="place-option-text">
              <strong>{place.name}</strong>
              <small>{place.description}</small>
            </span>
            {place.recommended && <span className="place-tag">추천</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ───────────── 05 기본 수령 장소 ───────────── */

export function PlaceScreen({ mode = 'default' }: { mode?: 'default' | 'change' }) {
  const { navigate, back } = useRouter()
  const { place, setPlace } = useAppState()
  const [selected, setSelected] = useState(place.id)

  return (
    <Screen
      header={<Header title={mode === 'change' ? '수령 장소 변경' : '기본 수령 장소'} />}
      footer={
        <Footer>
          <Button
            onClick={() => {
              setPlace(PLACES.find((p) => p.id === selected) ?? PLACES[0])
              if (mode === 'change') back()
              else navigate('home')
            }}
          >
            이 장소로 설정하기
          </Button>
        </Footer>
      }
    >
      <RouteMap />
      <div className="place">
        <p className="eyebrow">{STORE.school}</p>
        <h1 className="title-xl place-title">어디에서 받으실래요?</h1>
        <p className="desc place-desc">간식이 도착하면 선택한 장소로 알려드려요.</p>
        <PlaceOptions value={selected} onChange={setSelected} />
      </div>
    </Screen>
  )
}

/* ───────────── 상품 카드 (Figma: App / 상품 카드) ───────────── */

export function ProductCard({ product }: { product: Product }) {
  const { navigate } = useRouter()
  const { selectProduct } = useAppState()
  return (
    <button
      type="button"
      className="product-card"
      onClick={() => {
        selectProduct(product)
        navigate('menu')
      }}
    >
      <img className="product-photo" src={product.image} alt="" />
      <span className="product-name">{product.name}</span>
      <span className="product-price">{won(product.price)}</span>
    </button>
  )
}

export function CategoryTabs({ value, onChange }: { value: Category; onChange: (c: Category) => void }) {
  return (
    <div className="category-tabs" role="tablist" aria-label="상품 카테고리">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={c === value}
          className={`category-tab ${c === value ? 'is-active' : ''}`}
          onClick={() => onChange(c)}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

export function CartButton({ light = false }: { light?: boolean }) {
  const { navigate } = useRouter()
  const { cartCount } = useAppState()
  return (
    <button
      type="button"
      className={`icon-button cart-button ${light ? 'is-light' : ''}`}
      aria-label={`장바구니 ${cartCount}개`}
      onClick={() => navigate('cart')}
    >
      <CartIcon />
      {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
    </button>
  )
}

/* ───────────── 06 홈 ───────────── */

export function HomeScreen() {
  const { navigate } = useRouter()
  const { place } = useAppState()
  const [category, setCategory] = useState<Category>('전체')
  const [query, setQuery] = useState('')
  const products = PRODUCTS.filter(
    (p) => (category === '전체' || p.category === category) && p.name.includes(query.trim()),
  )

  return (
    <Screen nav={<BottomNav active="home" />}>
        <section className="home-top">
          <div className="home-top-row">
            <button type="button" className="home-place" onClick={() => navigate('change-place')}>
              <PinIcon size={19} />
              <span>{place.name}</span>
              <svg width="17" height="21" viewBox="0 0 17 21" aria-hidden="true">
                <path d="M4.5 8.5 8.5 12.5 12.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="home-top-actions">
              <button type="button" className="icon-button is-light" aria-label="알림">
                <BellIcon />
              </button>
              <CartButton light />
            </div>
          </div>
          <label className="home-search">
            <SearchIcon />
            <input
              type="search"
              placeholder="오늘은 뭐 먹을까요?"
              aria-label="메뉴 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </section>

        <CategoryTabs value={category} onChange={setCategory} />

        <button type="button" className="home-store" onClick={() => navigate('store')}>
          <strong>{STORE.name}</strong>
          <span>
            지금 주문 가능 · 배달비 {won(STORE.deliveryFee)} · {STORE.eta}
          </span>
        </button>

        <section className="product-section">
          <h2 className="section-title">매점 상품</h2>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {products.length === 0 && <p className="desc">찾는 상품이 없어요.</p>}
        </section>
    </Screen>
  )
}

/* ───────────── 07 매점 상세 ───────────── */

const STORE_TABS = ['메뉴', '가게 정보', '리뷰'] as const

export function StoreScreen() {
  const { navigate } = useRouter()
  const { place, cartCount, subtotal, selectProduct } = useAppState()
  const [tab, setTab] = useState<(typeof STORE_TABS)[number]>('메뉴')
  const menu = PRODUCTS.slice(0, 3)

  return (
    <Screen
      header={<Header title={STORE.name} right={<CartButton />} />}
      footer={
        <Footer>
          <button type="button" className="cart-bar" onClick={() => navigate('cart')} disabled={cartCount === 0}>
            <span className="cart-bar-count">{cartCount}</span>
            <span>장바구니 보기</span>
            <span>{won(subtotal)}</span>
          </button>
        </Footer>
      }
    >
      <img className="store-banner" src={storeBanner} alt="감자칩, 청포도젤리, 초코우유" />
      <section className="store-info">
        <h1 className="store-name">{STORE.name}</h1>
        <p className="store-rating">
          <span className="star">★</span> <strong>{STORE_INFO.rating}</strong> ({STORE_INFO.reviewCount}) ·{' '}
          {STORE_INFO.tagline}
        </p>
        <div className="store-tags">
          <span className="tag tag-brand">교내 배달</span>
          <span className="tag tag-gray">최소주문 {won(STORE_INFO.minOrder)}</span>
        </div>
        <dl className="store-stats">
          <div>
            <dt>배달 예상</dt>
            <dd>{STORE.eta}</dd>
          </div>
          <div>
            <dt>배달비</dt>
            <dd>{won(STORE.deliveryFee)}</dd>
          </div>
          <div>
            <dt>수령 장소</dt>
            <dd>{place.name}</dd>
          </div>
        </dl>
      </section>
      <div className="section-gap" />
      <div className="store-tabs" role="tablist">
        {STORE_TABS.map((t) => (
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

      {tab === '메뉴' ? (
        <section className="menu-list">
          <h3 className="menu-list-title">인기 메뉴</h3>
          {menu.map((p) => (
            <button
              key={p.id}
              type="button"
              className="menu-row"
              onClick={() => {
                selectProduct(p)
                navigate('menu')
              }}
            >
              <span className="menu-row-text">
                {p.popular && <span className="tag tag-brand tag-xs">인기</span>}
                <strong>{p.name}</strong>
                <small>{p.description}</small>
                <b>{won(p.price)}</b>
              </span>
              <img className="menu-row-photo" src={p.image} alt={`${p.name} 사진`} />
            </button>
          ))}
        </section>
      ) : (
        <p className="desc store-tab-empty">{tab} 화면은 준비 중이에요.</p>
      )}
    </Screen>
  )
}

/* ───────────── 08 메뉴 상세 ───────────── */

export function MenuScreen() {
  const { navigate } = useRouter()
  const { selectedProduct: product, addToCart } = useAppState()
  const [liked, setLiked] = useState(false)
  const [bag, setBag] = useState(false)
  const [quantity, setQuantity] = useState(1)

  return (
    <Screen
      header={
        <Header
          title="메뉴 상세"
          right={
            <button
              type="button"
              className={`icon-button like-button ${liked ? 'is-liked' : ''}`}
              aria-label="메뉴 찜하기"
              aria-pressed={liked}
              onClick={() => setLiked(!liked)}
            >
              <HeartIcon filled={liked} />
            </button>
          }
        />
      }
      footer={
        <Footer>
          <Button
            onClick={() => {
              addToCart(product, quantity)
              navigate('cart')
            }}
          >
            {won(product.price * quantity)} 담기
          </Button>
        </Footer>
      }
    >
      <div className="menu-photo">
        <img src={product.detailImage ?? product.image} alt={`${product.name} 사진`} />
      </div>
      <section className="menu-info">
        {product.popular && <span className="tag tag-brand">매점 인기 메뉴</span>}
        <h1 className="menu-name">{product.name}</h1>
        <p className="desc menu-desc">{product.description}</p>
        <div className="menu-price">
          <span className="desc">기본 가격</span>
          <strong>{won(product.price)}</strong>
        </div>
      </section>
      <div className="section-gap" />
      <section className="menu-options">
        <h3 className="menu-options-title">
          추가 옵션 <small>선택</small>
        </h3>
        <label className="menu-option">
          <input type="checkbox" checked={bag} onChange={(e) => setBag(e.target.checked)} />
          <span>봉투 포함</span>
          <span className="menu-option-price">무료</span>
        </label>
        <div className="menu-quantity">
          <strong>수량</strong>
          <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
        </div>
      </section>
    </Screen>
  )
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
}) {
  return (
    <div className="stepper">
      <button type="button" aria-label="수량 줄이기" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <MinusIcon size={14} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="수량 늘리기" onClick={() => onChange(value + 1)}>
        <PlusIcon size={14} />
      </button>
    </div>
  )
}

/* ───────────── 09 장바구니 ───────────── */

function PriceSummary({ subtotal, deliveryFee, total }: { subtotal: number; deliveryFee: number; total: number }) {
  return (
    <dl className="price-summary">
      <div>
        <dt>상품 금액</dt>
        <dd>{won(subtotal)}</dd>
      </div>
      <div>
        <dt>배달비</dt>
        <dd>{won(deliveryFee)}</dd>
      </div>
      <div className="price-total">
        <dt>총 결제금액</dt>
        <dd>{won(total)}</dd>
      </div>
    </dl>
  )
}

export function CartScreen() {
  const { navigate } = useRouter()
  const { cart, setQuantity, subtotal, deliveryFee, total } = useAppState()
  const [note, setNote] = useState('')

  return (
    <Screen
      header={<Header title="장바구니" />}
      footer={
        <Footer>
          <Button disabled={cart.length === 0} onClick={() => navigate('payment')}>
            {won(total)} 주문하기
          </Button>
        </Footer>
      }
    >
      <h3 className="cart-store">{STORE.name}</h3>
      <div className="section-gap" />
      {cart.length === 0 && <p className="desc cart-empty">장바구니가 비어 있어요.</p>}
      {cart.map(({ product, quantity }) => (
        <div key={product.id} className="cart-line">
          <img className="cart-line-photo" src={product.image} alt={`${product.name} 사진`} />
          <div className="cart-line-info">
            <strong>{product.name}</strong>
            <small>기본 상품</small>
            <b>{won(product.price * quantity)}</b>
            <QuantityStepper value={quantity} onChange={(q) => setQuantity(product.id, q)} min={1} />
          </div>
          <button
            type="button"
            className="cart-line-remove"
            aria-label={`${product.name} 삭제`}
            onClick={() => setQuantity(product.id, 0)}
          >
            <CloseIcon size={15} />
          </button>
        </div>
      ))}
      <div className="cart-more">
        <Button variant="secondary" size="medium" className="btn-more" onClick={() => navigate('store')}>
          <PlusIcon />
          <span>메뉴 더 담기</span>
        </Button>
      </div>
      <div className="section-gap" />
      <section className="cart-section">
        <h3 className="cart-section-title">매장 요청사항</h3>
        <label className="cart-note">
          <span>필요한 내용을 알려주세요</span>
          <textarea
            rows={1}
            placeholder="예: 봉투는 한 장만 주세요"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </section>
      <div className="section-gap" />
      <section className="cart-section">
        <PriceSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} />
      </section>
    </Screen>
  )
}

/* ───────────── 10 주문 / 결제 ───────────── */

const PAYMENT_METHODS = ['카드 결제', '간편 결제', '계좌 이체', '휴대폰 결제'] as const

export function PaymentScreen() {
  const { navigate } = useRouter()
  const { place, cart, cartCount, subtotal, deliveryFee, total, placeOrder } = useAppState()
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('카드 결제')

  return (
    <Screen
      header={<Header title="주문 / 결제" />}
      footer={
        <Footer>
          <Button
            disabled={cart.length === 0}
            onClick={() => {
              placeOrder(method)
              navigate('order-complete', { replace: true })
            }}
          >
            {won(total)} 결제하기
          </Button>
        </Footer>
      }
    >
      <section className="pay-section">
        <h3 className="cart-section-title">받을 장소</h3>
        <div className="pay-place">
          <div>
            <strong>{place.name}</strong>
            <small>{STORE.school} · 교내 수령</small>
          </div>
          <button type="button" className="pay-change" onClick={() => navigate('change-place')}>
            변경
          </button>
        </div>
        <p className="pay-notice">도착 알림을 받으면 수령 장소로 나와주세요.</p>
      </section>
      <div className="section-gap" />
      <section className="pay-section">
        <h3 className="cart-section-title">
          주문 메뉴 <small>{cartCount}개</small>
        </h3>
        <dl className="pay-items">
          {cart.map(({ product, quantity }) => (
            <div key={product.id}>
              <dt>
                {product.name} × {quantity}
              </dt>
              <dd>{won(product.price * quantity)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="section-gap" />
      <section className="pay-section">
        <h3 className="cart-section-title">결제수단</h3>
        <div className="pay-methods" role="radiogroup" aria-label="결제수단">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={m === method}
              className={`pay-method ${m === method ? 'is-selected' : ''}`}
              onClick={() => setMethod(m)}
            >
              {m}
            </button>
          ))}
        </div>
        {method === '카드 결제' && <p className="pay-card">신한카드 · •••• 1234</p>}
      </section>
      <div className="section-gap" />
      <section className="pay-section">
        <PriceSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} />
        <p className="pay-agree">주문 내용을 확인했으며 결제에 동의합니다.</p>
      </section>
    </Screen>
  )
}
