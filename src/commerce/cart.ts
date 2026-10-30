import { z } from 'zod'
import type { CatalogProduct } from './models.ts'

export type Cart = Readonly<Record<string, number>>

const cartSchema = z.record(z.string().uuid(), z.number().int().positive())

export function decodeCart(raw: string | null): Cart {
  if (raw === null) return {}

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) return {}
    throw error
  }

  const parsed = cartSchema.safeParse(payload)
  return parsed.success ? parsed.data : {}
}

export function readCartFromStorage(readValue: () => string | null): Cart {
  try {
    return decodeCart(readValue())
  } catch (error) {
    if (error instanceof DOMException) return {}
    throw error
  }
}

export function reconcileCart(cart: Cart, products: readonly CatalogProduct[]): Cart {
  const byId = new Map(products.map((product) => [product.id, product]))
  const next: Record<string, number> = {}
  let merchantKey: string | null = null
  let currency: string | null = null

  for (const [id, requestedQuantity] of Object.entries(cart)) {
    const product = byId.get(id)
    if (!product || !product.active || product.stock_quantity < 1) continue

    const nextMerchantKey = product.merchant_id ?? 'neurovector'
    if (merchantKey !== null && merchantKey !== nextMerchantKey) continue
    if (currency !== null && currency !== product.currency) continue

    merchantKey = nextMerchantKey
    currency = product.currency
    const quantity = Math.min(requestedQuantity, product.stock_quantity)
    if (quantity > 0) next[id] = quantity
  }

  return next
}

export function canAddProduct(
  product: CatalogProduct,
  cart: Cart,
  products: readonly CatalogProduct[],
): boolean {
  const currentProducts = products.filter((candidate) => (cart[candidate.id] ?? 0) > 0)
  if (currentProducts.length === 0) return true

  const merchantKey = product.merchant_id ?? 'neurovector'
  return currentProducts.every(
    (current) =>
      (current.merchant_id ?? 'neurovector') === merchantKey &&
      current.currency === product.currency,
  )
}

export function changeCartQuantity(
  cart: Cart,
  product: CatalogProduct,
  delta: number,
): Cart {
  const current = cart[product.id] ?? 0
  const quantity = Math.max(0, Math.min(product.stock_quantity, current + delta))
  const next: Record<string, number> = { ...cart }
  if (quantity === 0) {
    delete next[product.id]
  } else {
    next[product.id] = quantity
  }
  return next
}
