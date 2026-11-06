import test from 'node:test'
import assert from 'node:assert/strict'
import { studentCatalogItems, cartStockIssue } from '../src/studentInventory.ts'

const item = { id: '11111111-1111-4111-8111-111111111111', sku: 'SNACK', name: '과자', description: null, unit_price: 1500, currency: 'KRW', stock_quantity: 0, active: true }
const product = { id: item.id, name: item.name, stock: 2 }

test('student catalog keeps sold-out active products when inactive QA and other currencies exist', () => {
  // Given: sold-out and stocked active items alongside archived QA and unsupported currency.
  const stocked = { ...item, id: 'stocked', stock_quantity: 2 }
  const archived = { ...item, id: 'archived', stock_quantity: 5, active: false }
  const foreign = { ...item, id: 'foreign', currency: 'USD' }
  // When: the student catalog selects items.
  const catalog = studentCatalogItems([item, stocked, archived, foreign])
  // Then: availability does not hide active products, while non-student inventory stays hidden.
  assert.deepEqual(catalog.map(product => product.id), [item.id, 'stocked'])
})

test('checkout accepts a quantity at the current stock limit', () => {
  // Given: an order requesting exactly the available units.
  const cart = [{ product, quantity: 2 }]
  // When: checkout checks its stock.
  const issue = cartStockIssue(cart)
  // Then: the order can proceed.
  assert.equal(issue, null)
})

test('checkout blocks an existing line when refreshed stock becomes zero', () => {
  // Given: an item in the cart has sold out since it was added.
  const cart = [{ product: { ...product, stock: 0 }, quantity: 1 }]
  // When: checkout checks refreshed stock.
  const issue = cartStockIssue(cart)
  // Then: the line blocks checkout.
  assert.notEqual(issue, null)
})

test('checkout blocks all lines when any refreshed stock is insufficient', () => {
  // Given: one available line and a second line requesting too many units.
  const cart = [{ product, quantity: 1 }, { product: { ...product, id: 'second', stock: 1 }, quantity: 2 }]
  // When: checkout checks the whole cart.
  const issue = cartStockIssue(cart)
  // Then: a valid first line cannot hide the stock failure.
  assert.notEqual(issue, null)
})

for (const quantity of [0, -1, 0.5, NaN]) {
  test(`checkout blocks invalid quantity ${quantity}`, () => {
    // Given: a non-orderable quantity.
    const cart = [{ product, quantity }]
    // When: checkout checks the cart.
    const issue = cartStockIssue(cart)
    // Then: no order may be created.
    assert.notEqual(issue, null)
  })
}

test('checkout blocks an empty cart', () => {
  // Given: no items were added.
  const cart = []
  // When: checkout checks the cart.
  const issue = cartStockIssue(cart)
  // Then: an empty order cannot be created.
  assert.notEqual(issue, null)
})
