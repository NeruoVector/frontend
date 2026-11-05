import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PLACES, PRODUCTS, type Place, type Product } from './data.ts'
import { useAuth } from './auth.tsx'
import { api, type Item, type OrderDetail } from './api.ts'

export type CartLine = { product: Product; quantity: number }
export type Order = {
  id: string; number: string; pickupCode: string; lines: CartLine[]; subtotal: number; deliveryFee: number;
  total: number; placeName: string; paymentMethod: string; createdAt: Date; status: string;
}

type AppState = {
  place: Place; setPlace: (place: Place) => void;
  products: Product[]; catalogError: string | null; loading: boolean;
  orderNote: string; setOrderNote: (note: string) => void;
  cart: CartLine[]; cartCount: number; subtotal: number; deliveryFee: number; total: number;
  addToCart: (product: Product, quantity?: number) => void; setQuantity: (id: string, quantity: number) => void;
  clearCart: () => void; selectedProduct: Product | null; selectProduct: (product: Product) => void;
  order: Order | null; customerName: string; setCustomerName: (name: string) => void;
  customerPhone: string; setCustomerPhone: (phone: string) => void;
  placeOrder: (method: string) => Promise<void>; loadOrder: (id: string) => Promise<void>;
}

function productFromItem(item: Item): Product {
  const artwork = PRODUCTS.find(product => product.name === item.name)
  return { id: item.id, name: item.name, price: item.unit_price, description: item.description ?? '',
    category: artwork?.category ?? '과자', image: artwork?.image ?? '', detailImage: artwork?.detailImage,
    stock: item.stock_quantity, popular: artwork?.popular }
}

export function displayOrder(detail: OrderDetail, products: readonly Product[]): Order {
  return {
    id: detail.id, number: detail.order_number, pickupCode: detail.pickup_code,
    lines: detail.items.map(item => ({ product: products.find(product => product.id === item.item_id) ?? {
      id: item.item_id, name: '판매 종료 상품', price: item.unit_price, category: '과자', image: '', description: '', stock: 0,
    }, quantity: item.quantity })),
    subtotal: detail.total_amount, deliveryFee: 0, total: detail.total_amount,
    placeName: detail.delivery_detail ?? detail.delivery_address, paymentMethod: detail.payment?.method ?? '미결제',
    createdAt: new Date(detail.created_at), status: detail.status,
  }
}

const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth()
  const identity = useRef<string | null>(null)
  const [place, setPlace] = useState<Place>(PLACES[0])
  const [cart, setCart] = useState<CartLine[]>([])
  const [orderNote, setOrderNote] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProduct, selectProduct] = useState<Product | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const checkoutBusy = useRef(false)
  const pendingOrder = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    api.items().then(async items => {
      if (!active) return
      const catalog = items.filter(item => item.active && item.currency === 'KRW').map(productFromItem)
      setProducts(catalog)
      selectProduct(catalog[0] ?? null)

    }).catch((error: unknown) => {
      if (active) setCatalogError(error instanceof Error ? error.message : '상품을 불러오지 못했습니다.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useLayoutEffect(() => {
    const previous = identity.current
    identity.current = customer?.id ?? null
    setOrder(null)
    pendingOrder.current = null
    sessionStorage.removeItem('pendingOrderId')
    sessionStorage.removeItem('customerPhone')
    setCustomerName(customer?.name ?? '')
    setCustomerPhone(customer?.phone ?? '')
    if (previous !== null) { setCart([]); setOrderNote('') }

  }, [customer?.id, customer?.name, customer?.phone])

  useEffect(() => {
    const saved = customer && sessionStorage.getItem(`lastOrder:${customer.id}`)
    if (!customer || !saved || products.length === 0) return
    let active = true
    api.myOrder(saved).then(detail => { if (active) setOrder(displayOrder(detail, products)) }).catch((cause: unknown) => {
      if (cause instanceof Error) sessionStorage.removeItem(`lastOrder:${customer.id}`)
      else throw cause
    })
    return () => { active = false }
  }, [customer?.id, products])

  const value = useMemo<AppState>(() => {
    const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0)
    const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
    return {
      place, setPlace, products, catalogError, loading, orderNote, setOrderNote, cart, cartCount, subtotal, deliveryFee: 0, total: subtotal,
      addToCart: (product, quantity = 1) => setCart(prev => {
        const found = prev.find(line => line.product.id === product.id)
        if (found) return prev.map(line => line.product.id === product.id ? { ...line, quantity: Math.min(product.stock, line.quantity + quantity) } : line)
        return product.stock > 0 ? [...prev, { product, quantity: Math.min(quantity, product.stock) }] : prev
      }),
      setQuantity: (id, quantity) => setCart(prev => quantity <= 0 ? prev.filter(line => line.product.id !== id) : prev.map(line => line.product.id === id ? { ...line, quantity: Math.min(quantity, line.product.stock) } : line)),
      clearCart: () => setCart([]), selectedProduct, selectProduct, order,
      customerName, setCustomerName, customerPhone, setCustomerPhone,
      loadOrder: async id => {
        const owner = identity.current
        const detail = await api.myOrder(id)
        if (identity.current !== owner) return
        setOrder(displayOrder(detail, products))
        sessionStorage.setItem(`lastOrder:${identity.current ?? ''}`, id)
      },
      placeOrder: async method => {
        if (checkoutBusy.current) throw new Error('주문을 처리 중입니다.')
        checkoutBusy.current = true
        try {
          if (!customer) throw new Error('로그인 후 주문해 주세요.')
          const owner = customer.id
          if (!customerName.trim() || customerPhone.replace(/\D/g, '').length !== 11) throw new Error('이름과 11자리 휴대폰 번호를 입력해 주세요.')
          let id = pendingOrder.current
          if (!id) {
            const created = await api.createOrder({ customer_name: customerName.trim(), customer_phone: customerPhone.replace(/\D/g, ''),
              items: cart.map(line => ({ item_id: line.product.id, quantity: line.quantity })), delivery_address: '선린인터넷고등학교', delivery_detail: place.name, notes: orderNote || undefined })
            if (identity.current !== owner) return
            id = created.id
            pendingOrder.current = id
            sessionStorage.setItem('pendingOrderId', id)
          }
          const existing = await api.myOrder(id)
          if (identity.current !== owner) return
          const payment = existing.payment?.status === 'captured' ? existing.payment : await api.pay(id, method)
          if (payment.status !== 'captured') throw new Error(payment.failure_reason ?? '결제가 완료되지 않았습니다.')
          const detail = await api.myOrder(id)
          if (identity.current !== owner) return
          setOrder(displayOrder(detail, products))
          sessionStorage.setItem(`lastOrder:${identity.current ?? ''}`, id)
          pendingOrder.current = null
          sessionStorage.removeItem('pendingOrderId')
          setCart([])
          setOrderNote('')
        } finally { checkoutBusy.current = false }
      },
    }
  }, [place, products, catalogError, loading, orderNote, cart, selectedProduct, order, customerName, customerPhone, customer])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const value = useContext(AppStateContext)
  if (!value) throw new Error('useAppState must be used inside AppStateProvider')
  return value
}
