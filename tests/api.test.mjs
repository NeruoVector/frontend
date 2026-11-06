import test from 'node:test'
import assert from 'node:assert/strict'
import { api, ApiError } from '../src/api.ts'

const id = '11111111-1111-4111-8111-111111111111'
const item = { id, sku: 'TEST', name: '실제 상품', description: null, unit_price: 1200, currency: 'KRW', stock_quantity: 3, active: true }
const order = { id, order_number: 'NV-1234', pickup_code: '1234', customer_name: '테스트', customer_phone: '01000000000', status: 'pending_payment', total_amount: 1200, delivery_address: '학교', delivery_detail: null, notes: null, created_at: '2026-11-05T00:00:00Z', items: [], payment: null }

test('receipt posts an explicit confirmation without a pickup code', async t => {
  let body
  t.mock.method(globalThis, 'fetch', async request => {
    body = JSON.parse(await request.text())
    return Response.json({ order_id: id, received: true })
  })
  assert.equal((await api.confirmReceipt(id)).received, true)
  assert.deepEqual(body, { confirmed: true })
})

test('inventory and phone-filtered order history use backend paths and server fields', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async request => {
    calls.push(request.url)
    return Response.json(calls.length === 1 ? [item] : [order])
  })
  assert.equal((await api.items())[0].price, undefined)
  assert.equal((await api.orders('010-0000-0000'))[0].order_number, 'NV-1234')
  assert.equal(new URL(calls[0]).pathname, '/api/v1/inventory')
  assert.equal(new URL(calls[1]).searchParams.get('phone'), '010-0000-0000')
})

test('order creation and payment retain API UUIDs and captured payment status', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async request => {
    calls.push({ url: request.url, method: request.method, body: JSON.parse(await request.text()) })
    return Response.json(calls.length === 1 ? order : { id, order_id: id, status: 'captured', amount: 1200, method: 'card', failure_reason: null }, { status: 201 })
  })
  const payload = { customer_name: '테스트', customer_phone: '01000000000', delivery_address: '학교', items: [{ item_id: id, quantity: 1 }] }
  assert.equal((await api.createOrder(payload)).id, id)
  assert.equal((await api.pay(id, 'card')).status, 'captured')
  assert.deepEqual(calls[0].body, payload)
  assert.deepEqual(calls[1].body, { method: 'card' })
})

test('backend stock errors are visible and POST is never retried', async t => {
  let attempts = 0
  t.mock.method(globalThis, 'fetch', async () => {
    attempts++
    return Response.json({ message: '재고 부족' }, { status: 409 })
  })
  await assert.rejects(api.createOrder({ customer_name: '테스트', customer_phone: 'test', delivery_address: '학교', items: [] }), error => error instanceof ApiError && error.status === 409 && error.message === '재고 부족')
  assert.equal(attempts, 1)
})

test('malformed backend data cannot become a fake order', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ id }))
  await assert.rejects(api.order(id), /order_number/)
})

test('review submission preserves rating tags and photo and reloads the stored record', async t => {
  const calls = []
  const review = { id, order_id: id, rating: 4, content: '맛있었어요', tags: ['맛있어요'], has_photo: true, created_at: '2026-11-05T00:00:00Z' }
  t.mock.method(globalThis, 'fetch', async request => {
    calls.push({ path: new URL(request.url).pathname, method: request.method, body: request.method === 'POST' ? JSON.parse(await request.text()) : null })
    return Response.json(review, { status: request.method === 'POST' ? 201 : 200 })
  })
  const payload = { rating: 4, content: '맛있었어요', tags: ['맛있어요'], photo_data_url: 'data:image/png;base64,iVBORw0KGgo=' }
  assert.deepEqual(await api.createReview(id, payload), review)
  assert.deepEqual(await api.review(id), review)
  assert.deepEqual(calls[0].body, payload)
  assert.equal(calls[0].path, `/api/v1/orders/${id}/review`)
  assert.equal(calls[1].method, 'GET')
  assert.equal(api.reviewPhotoUrl(id), `/api/v1/reviews/${id}/photo`)
})

test('review list retains server totals and filters by order contact', async t => {
  let requested
  const response = { items: [], total: 0, average_rating: null }
  t.mock.method(globalThis, 'fetch', async request => { requested = new URL(request.url); return Response.json(response) })
  assert.deepEqual(await api.reviews('01000000000'), response)
  assert.equal(requested.pathname, '/api/v1/reviews')
  assert.equal(requested.searchParams.get('phone'), '01000000000')
})

test('duplicate review error is surfaced without retrying or overwriting', async t => {
  let attempts = 0
  t.mock.method(globalThis, 'fetch', async () => { attempts++; return Response.json({ message: '이미 리뷰를 등록한 주문입니다.' }, { status: 409 }) })
  await assert.rejects(api.createReview(id, { rating: 3, content: '테스트', tags: [], photo_data_url: null }), error => error instanceof ApiError && error.status === 409)
  assert.equal(attempts, 1)
})


test('account auth uses same-origin cookies and never bearer credentials', async t => {
  const customer = { id, username: 'customer', name: '테스트', phone: '01000000000' }
  const calls = []
  t.mock.method(globalThis, 'fetch', async request => {
    calls.push({ path: new URL(request.url).pathname, method: request.method, credentials: request.credentials, authorization: request.headers.get('authorization'), body: request.method === 'POST' && !request.url.endsWith('logout') ? JSON.parse(await request.text()) : null })
    return request.url.endsWith('logout') ? new Response(null, { status: 204 }) : Response.json(customer)
  })
  await api.register({ username: 'customer', password: 'example-pass', name: '테스트', phone: '01000000000' })
  await api.login({ username: 'customer', password: 'example-pass' })
  assert.deepEqual(await api.me(), customer)
  await api.logout()
  assert.deepEqual(calls.map(call => call.path), ['/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/me', '/api/v1/auth/logout'])
  assert.ok(calls.every(call => call.credentials === 'same-origin' && call.authorization === null))
  assert.deepEqual(calls[1].body, { username: 'customer', password: 'example-pass' })
})

test('unauthorized session and rejected password remain errors with no retry', async t => {
  let attempts = 0
  t.mock.method(globalThis, 'fetch', async () => { attempts++; return Response.json({ detail: '로그인이 필요합니다.' }, { status: 401 }) })
  await assert.rejects(api.me(), error => error instanceof ApiError && error.status === 401)
  await assert.rejects(api.login({ username: 'customer', password: 'wrong' }), error => error instanceof ApiError && error.status === 401)
  assert.equal(attempts, 2)
})

test('owned histories use session routes and pickup codes accept only four decimal digits', async t => {
  const paths = []
  let code = '0007'
  t.mock.method(globalThis, 'fetch', async request => {
    const path = new URL(request.url).pathname
    paths.push(path)
    return Response.json(path.endsWith('/orders') ? { items: [order], total: 1 } : path.endsWith('/reviews') ? { items: [], total: 0, average_rating: null } : { ...order, pickup_code: code })
  })
  assert.equal((await api.myOrders()).total, 1)
  await api.myReviews()
  assert.equal((await api.myOrder(id)).pickup_code, '0007')
  for (const invalid of ['abc4', '123', '12345']) { code = invalid; await assert.rejects(api.myOrder(id), /pickup_code/) }
  assert.equal(paths[0], '/api/v1/auth/orders')
  assert.equal(paths[1], '/api/v1/auth/reviews')
})
