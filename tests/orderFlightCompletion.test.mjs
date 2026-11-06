import test from 'node:test'
import assert from 'node:assert/strict'
import { checkFlightCompletions, historyCompletion } from '../src/orderFlightCompletion.ts'

test('flight proof completes active history without changing backend status', () => {
  // Given stale order status and an immutable flight proof.
  const order = { id: 'flight', status: 'in_transit' }
  // When projecting history.
  const result = historyCompletion(order, new Set(['flight']))
  // Then completed flight is distinguishable from physical delivery.
  assert.deepEqual(result, { flightCompleted: true, completed: true })
  assert.equal(order.status, 'in_transit')
})

test('unpaid and cancelled records ignore completion proofs', () => {
  // Given proofs for ineligible orders.
  const proofs = new Set(['unpaid', 'cancelled'])
  // When projecting history.
  const results = [historyCompletion({ id: 'unpaid', status: 'pending_payment' }, proofs), historyCompletion({ id: 'cancelled', status: 'cancelled' }, proofs)]
  // Then cancellation alone is terminal and neither claims flight completion.
  assert.deepEqual(results, [{ flightCompleted: false, completed: false }, { flightCompleted: false, completed: true }])
})

test('partial outage preserves success and missing proof remains pending', async () => {
  // Given success, missing proof and a network failure.
  const check = async id => { if (id === 'error') throw new TypeError('offline'); return id === 'done' }
  // When polling the page.
  const result = await checkFlightCompletions(['done', 'missing', 'error'], check, new AbortController().signal)
  // Then the valid record survives and the outage is reported.
  assert.deepEqual(result, { confirmed: ['done'], failed: true })
})

test('at most four proof requests run concurrently', async () => {
  // Given blocked responses across more than one batch.
  const releases = []
  let active = 0
  let peak = 0
  const check = async () => { active++; peak = Math.max(peak, active); await new Promise(resolve => releases.push(resolve)); active--; return false }
  // When releasing every batch.
  const pending = checkFlightCompletions(Array.from({ length: 9 }, (_, i) => String(i)), check, new AbortController().signal)
  while (releases.length) { releases.splice(0).forEach(release => release()); await new Promise(resolve => setImmediate(resolve)) }
  await pending
  // Then concurrency stays bounded across the whole page.
  assert.equal(peak, 4)
})

test('abort prevents queued proof requests', async () => {
  // Given cleanup during the first request.
  const controller = new AbortController()
  const calls = []
  const check = async id => { calls.push(id); controller.abort(); return false }
  // When polling more records.
  await checkFlightCompletions(['one', 'two', 'three', 'four', 'five'], check, controller.signal)
  // Then no further requests start.
  assert.deepEqual(calls, ['one'])
})
