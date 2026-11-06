import type { Item } from './api.ts'

type StockLine = {
  readonly product: { readonly id: string; readonly name: string; readonly stock: number }
  readonly quantity: number
}

export function studentCatalogItems(items: readonly Item[]): Item[] {
  return items.filter(item => item.active && item.currency === 'KRW')
}

export function cartStockIssue(lines: readonly StockLine[]): string | null {
  if (lines.length === 0) return '장바구니가 비어 있어요.'
  for (const { product, quantity } of lines) {
    if (product.stock <= 0) return `${product.name}: 품절된 상품입니다. 장바구니에서 삭제해 주세요.`
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > product.stock) return `${product.name}: 재고가 부족합니다. 수량을 확인해 주세요.`
  }
  return null
}

export class CheckoutStockError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CheckoutStockError'
  }
}
