import test from 'node:test'
import assert from 'node:assert/strict'
import { api } from '../src/api.ts'
test('product and phone filters use the browser API proxy without changing response shape', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify([]), { status: 200 })
  })
  assert.deepEqual(await api.items(), [])
  await api.orders('010-0000-0000')
  assert.equal(calls[0].url, '/api/v1/inventory?active=true&limit=100')
  assert.equal(calls[1].url, '/api/v1/orders?phone=010-0000-0000&limit=100')
})

test('order and payment payloads are preserved without touching the real server', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ id: 'test-order' }), { status: 201 })
  })
  const payload = { customer_name: '테스트', customer_phone: 'test-only', delivery_address: '테스트 장소', items: [{ item_id: 'item', quantity: 1 }] }
  await api.createOrder(payload)
  await api.pay('test/order', 'card')
  assert.deepEqual(JSON.parse(calls[0].init.body), payload)
  assert.equal(calls[1].url, '/api/v1/orders/test%2Forder/payments')
  assert.equal(calls[1].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[1].init.body), { method: 'card' })
})

test('backend error messages remain visible to the screen', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ message: '재고 부족' }), { status: 409 }))
  await assert.rejects(api.item('item'), /재고 부족/)
})
