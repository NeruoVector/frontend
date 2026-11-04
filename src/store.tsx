import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { PLACES, PRODUCTS, STORE, type Place, type Product } from './data.ts'

export type CartLine = { product: Product; quantity: number }

export type Order = {
  number: string
  /** 수령 확인 화면의 4자리 번호 */
  pickupCode: string
  lines: CartLine[]
  subtotal: number
  deliveryFee: number
  total: number
  placeName: string
  paymentMethod: string
  createdAt: Date
}

type AppState = {
  place: Place
  setPlace: (place: Place) => void
  cart: CartLine[]
  cartCount: number
  subtotal: number
  deliveryFee: number
  total: number
  addToCart: (product: Product, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  selectedProduct: Product
  selectProduct: (product: Product) => void
  order: Order | null
  placeOrder: (paymentMethod: string) => void
}

function orderNumber(now = new Date()) {
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `${ymd}-${String(Math.floor(Math.random() * 9000) + 1000)}`
}

const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [place, setPlace] = useState<Place>(PLACES[0])
  // 시안과 같이 장바구니에 2개가 담긴 상태로 시작한다.
  const [cart, setCart] = useState<CartLine[]>([
    { product: PRODUCTS[0], quantity: 1 },
    { product: PRODUCTS[1], quantity: 1 },
  ])
  const [selectedProduct, selectProduct] = useState<Product>(PRODUCTS[0])
  const [order, setOrder] = useState<Order | null>(null)

  const value = useMemo<AppState>(() => {
    const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0)
    const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
    const deliveryFee = cart.length > 0 ? STORE.deliveryFee : 0
    return {
      place,
      setPlace,
      cart,
      cartCount,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      addToCart: (product, quantity = 1) =>
        setCart((prev) => {
          const found = prev.find((line) => line.product.id === product.id)
          if (found) {
            return prev.map((line) =>
              line.product.id === product.id ? { ...line, quantity: line.quantity + quantity } : line,
            )
          }
          return [...prev, { product, quantity }]
        }),
      setQuantity: (productId, quantity) =>
        setCart((prev) =>
          quantity <= 0
            ? prev.filter((line) => line.product.id !== productId)
            : prev.map((line) => (line.product.id === productId ? { ...line, quantity } : line)),
        ),
      clearCart: () => setCart([]),
      selectedProduct,
      selectProduct,
      order,
      placeOrder: (paymentMethod) => {
        setOrder({
          number: orderNumber(),
          pickupCode: String(Math.floor(Math.random() * 9000) + 1000),
          lines: cart,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          placeName: place.name,
          paymentMethod,
          createdAt: new Date(),
        })
        setCart([])
      },
    }
  }, [place, cart, selectedProduct, order])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const value = useContext(AppStateContext)
  if (!value) throw new Error('useAppState must be used inside AppStateProvider')
  return value
}
