import test from 'node:test'
import assert from 'node:assert/strict'
import { api, ApiError, cardMetadataInputSchema } from '../src/api.ts'

const id = '11111111-1111-4111-8111-111111111111'
const card = { id, nickname: '카드', kind: 'card', is_demo: true, last4: '0007', created_at: '2026-11-05T00:00:00Z' }

test('card metadata uses authenticated CRUD routes and only sends nickname and last four', async t => {
  // Given
  const calls = []
  t.mock.method(globalThis, 'fetch', async request => {
    calls.push({ path: new URL(request.url).pathname, method: request.method, credentials: request.credentials, body: request.method === 'POST' ? JSON.parse(await request.text()) : null })
    return request.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json(request.method === 'POST' ? card : { items: [card], storage_available: true, payment_enabled: false })
  })
  // When
  const list = await api.cards()
  const added = await api.addCard({ kind: 'card', number: 'never-send', cvc: 'never-send' })
  await api.removeCard(id)
  // Then
  assert.deepEqual(list.items, [card])
  assert.deepEqual(added, card)
  assert.deepEqual(calls.map(call => [call.path, call.method]), [['/api/v1/auth/cards', 'GET'], ['/api/v1/auth/cards', 'POST'], [`/api/v1/auth/cards/${id}`, 'DELETE']])
  assert.deepEqual(calls[1].body, { kind: 'card' })
  assert.ok(calls.every(call => call.credentials === 'same-origin'))
})

test('demo registration accepts only supported kind and strips real card data', () => {
  // Given
  const invalid = [{ kind: 'credit' }, { nickname: '카드', last4: '1234' }]
  // When
  const results = invalid.map(value => cardMetadataInputSchema.safeParse(value))
  const safe = cardMetadataInputSchema.parse({ kind: 'mobile', number: '01012345678' })
  // Then
  assert.ok(results.every(result => !result.success))
  assert.deepEqual(safe, { kind: 'mobile' })
})

test('unavailable storage and delete failures remain server outcomes', async t => {
  // Given
  t.mock.method(globalThis, 'fetch', async request => request.method === 'GET' ? Response.json({ items: [], storage_available: false, payment_enabled: false }) : Response.json({ detail: 'unavailable' }, { status: 503 }))
  // When
  const result = await api.cards()
  // Then
  assert.equal(result.storage_available, false)
  assert.deepEqual(result.items, [])
  await assert.rejects(api.removeCard(id), error => error instanceof ApiError && error.status === 503)
})
