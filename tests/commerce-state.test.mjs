import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAddProduct,
  changeCartQuantity,
  decodeCart,
  readCartFromStorage,
  reconcileCart,
} from '../src/commerce/cart.ts'
import {
  arrivalNotificationId,
  decodeArrivalIds,
  rememberArrivalId,
} from '../src/commerce/arrivalNotifications.ts'
import { spotFormFrom, spotIndoorFields } from '../src/commerce/spotForm.ts'
import { customerWorkspaceKey } from '../src/commerce/customerWorkspaceKey.ts'
import { markerViewport } from '../src/commerce/mapMarkerViewport.ts'
import {
  canCompleteHandoff,
  isOrderTrackingComplete,
  isTerminalTrackingStatus,
  mergeTrackingEntries,
  ordersNeedingTracking,
  trackingDisplayStatus,
  trackingPollDelay,
  trackingStatusBadgeClass,
} from '../src/commerce/trackingPolling.ts'

const id = {
  first: '11111111-1111-4111-8111-111111111111',
  sameMerchant: '22222222-2222-4222-8222-222222222222',
  otherMerchant: '33333333-3333-4333-8333-333333333333',
  otherCurrency: '44444444-4444-4444-8444-444444444444',
  inactive: '55555555-5555-4555-8555-555555555555',
  emptyStock: '66666666-6666-4666-8666-666666666666',
  arrival: '77777777-7777-4777-8777-777777777777',
  otherArrival: '88888888-8888-4888-8888-888888888888',
}

function product(productId, overrides = {}) {
  return {
    id: productId,
    sku: `SKU-${productId.slice(0, 4)}`,
    name: 'Test product',
    unit_price: 100,
    currency: 'KRW',
    stock_quantity: 5,
    active: true,
    merchant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ...overrides,
  }
}

test('decodeCart safely restores valid storage and rejects invalid JSON or shapes', () => {
  assert.deepEqual(decodeCart(null), {})
  assert.deepEqual(decodeCart('{broken'), {})
  assert.deepEqual(decodeCart(JSON.stringify({ notUuid: 2 })), {})
  assert.deepEqual(decodeCart(JSON.stringify({ [id.first]: -1 })), {})
  assert.deepEqual(decodeCart(JSON.stringify({ [id.first]: 2.5 })), {})
  assert.deepEqual(decodeCart(JSON.stringify({ [id.first]: 2 })), { [id.first]: 2 })
  assert.deepEqual(readCartFromStorage(() => JSON.stringify({ [id.first]: 1 })), { [id.first]: 1 })
  assert.deepEqual(readCartFromStorage(() => { throw new DOMException('storage blocked', 'SecurityError') }), {})
})

test('reconcileCart removes unavailable products, caps stock, and keeps one merchant and currency', () => {
  const products = [
    product(id.first, { stock_quantity: 2 }),
    product(id.sameMerchant, { stock_quantity: 4 }),
    product(id.otherMerchant, { merchant_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
    product(id.otherCurrency, { currency: 'USD' }),
    product(id.inactive, { active: false }),
    product(id.emptyStock, { stock_quantity: 0 }),
  ]
  const cart = {
    [id.first]: 8,
    [id.sameMerchant]: 3,
    [id.otherMerchant]: 1,
    [id.otherCurrency]: 1,
    [id.inactive]: 1,
    [id.emptyStock]: 1,
    '99999999-9999-4999-8999-999999999999': 1,
  }
  assert.deepEqual(reconcileCart(cart, products), { [id.first]: 2, [id.sameMerchant]: 3 })
})

test('canAddProduct prevents mixed merchants or currencies and quantity changes respect stock', () => {
  const first = product(id.first, { stock_quantity: 2 })
  const second = product(id.sameMerchant)
  const otherMerchant = product(id.otherMerchant, { merchant_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
  const otherCurrency = product(id.otherCurrency, { currency: 'USD' })
  const products = [first, second, otherMerchant, otherCurrency]
  assert.equal(canAddProduct(second, { [id.first]: 1 }, products), true)
  assert.equal(canAddProduct(otherMerchant, { [id.first]: 1 }, products), false)
  assert.equal(canAddProduct(otherCurrency, { [id.first]: 1 }, products), false)
  assert.deepEqual(changeCartQuantity({ [id.first]: 1 }, first, 5), { [id.first]: 2 })
  assert.deepEqual(changeCartQuantity({ [id.first]: 1 }, first, -1), {})
})

test('decodeArrivalIds ignores corrupt storage and keeps only distinct valid IDs', () => {
  assert.deepEqual(decodeArrivalIds(null), [])
  assert.deepEqual(decodeArrivalIds('invalid'), [])
  assert.deepEqual(decodeArrivalIds(JSON.stringify({ id: id.arrival })), [])
  assert.deepEqual(decodeArrivalIds(JSON.stringify([id.arrival, 'bad', id.arrival, id.otherArrival])), [id.arrival, id.otherArrival])
})

test('arrivalNotificationId prefers the stable server ID and falls back to the arrived event', () => {
  assert.equal(arrivalNotificationId({
    arrival_notification_id: id.arrival,
    events: [{ id: id.otherArrival, event_type: 'arrived' }],
  }), id.arrival)
  assert.equal(arrivalNotificationId({
    arrival_notification_id: null,
    events: [{ id: id.otherArrival, event_type: 'arrived' }],
  }), id.otherArrival)
  assert.equal(arrivalNotificationId({ arrival_notification_id: null, events: [] }), null)
})

test('rememberArrivalId emits each stable arrival once across restored state', () => {
  assert.deepEqual(rememberArrivalId([id.arrival], id.arrival), { seenIds: [id.arrival], isNew: false })
  assert.deepEqual(rememberArrivalId([], id.arrival), { seenIds: [id.arrival], isNew: true })
  assert.deepEqual(rememberArrivalId([], null), { seenIds: [], isNew: false })
})

test('outdoor spots restore and submit with all indoor location fields null', () => {
  const outdoorSpot = {
    id: id.first,
    label: '정문 앞',
    delivery_address: '서울시 강남구',
    delivery_detail: null,
    latitude: 37.5,
    longitude: 127,
    room_number: null,
    grade: null,
    classroom: null,
    created_at: '2026-10-27T00:00:00Z',
    updated_at: '2026-10-27T00:00:00Z',
  }
  const form = spotFormFrom(outdoorSpot)
  assert.equal(form.indoor_type, 'outdoor')
  assert.deepEqual(spotIndoorFields(form), { room_number: null, grade: null, classroom: null })
})

test('customer workspace identity key changes on logout and account switch', () => {
  // Given: customer A's workspace owns a selected destination and checkout form state.
  const accountAKey = customerWorkspaceKey('customer-a')

  // When: the session logs out or signs in as a different customer.
  const anonymousKey = customerWorkspaceKey(null)
  const accountBKey = customerWorkspaceKey('customer-b')

  // Then: React receives a new identity key and remounts the customer-bound workspace.
  assert.notEqual(anonymousKey, accountAKey)
  assert.notEqual(accountBKey, accountAKey)
  assert.equal(customerWorkspaceKey('customer-a'), accountAKey)
})

test('map viewport centers one marker and bounds multiple markers by stable identities', () => {
  // Given: one destination and one drone position with campus coordinates.
  const destination = { id: 'destination', label: '배송지', latitude: 37.5, longitude: 127 }
  const drone = { id: 'drone', label: '드론', latitude: 37.51, longitude: 127.01 }

  // When: the map derives its initial viewport for one or multiple markers.
  const single = markerViewport([destination])
  const multiple = markerViewport([destination, drone])
  const reordered = markerViewport([drone, destination])

  // Then: one marker centers directly, while a marker set fits bounds regardless of order.
  assert.equal(single.kind, 'single')
  if (single.kind === 'single') assert.deepEqual(single.marker, destination)
  assert.equal(multiple.kind, 'bounds')
  assert.equal(reordered.key, multiple.key)
  assert.deepEqual(markerViewport([]), { kind: 'none', key: '[]' })
})

test('arrival remains pollable until delivery is completed', () => {
  // Given: the server has marked an active order as arrived, and handoff has not completed.
  const arrivingOrder = { id: 'arrived', status: 'in_transit' }
  const terminalOrderIds = new Set()

  // When: the poller selects orders and evaluates the arrived response.
  const selectedOrders = ordersNeedingTracking([arrivingOrder], terminalOrderIds)

  // Then: arrival remains active; only a terminal delivery response completes tracking.
  assert.deepEqual(selectedOrders, [arrivingOrder])
  assert.equal(isTerminalTrackingStatus('completed'), true)
  assert.equal(isTerminalTrackingStatus('arrived'), false)
  assert.equal(isTerminalTrackingStatus('IN_FLIGHT'), false)
  assert.equal(isOrderTrackingComplete('in_transit', 'arrived'), false)
  assert.equal(isOrderTrackingComplete('delivered', 'delivered'), true)
  assert.equal(isOrderTrackingComplete('in_transit', 'failed'), true)
  assert.deepEqual(
    ordersNeedingTracking([{ id: 'active' }, { id: 'completed' }, { id: 'cancelled' }], new Set(['completed', 'cancelled'])),
    [{ id: 'active' }],
  )
  assert.equal(canCompleteHandoff('in_transit', '2026-10-27T01:00:00Z'), true)
  assert.equal(canCompleteHandoff('in_transit', null), false)
  assert.equal(canCompleteHandoff('arrived', '2026-10-27T01:00:00Z'), false)
})

test('a later delivery response replaces the arrived tracking entry', () => {
  // Given: the customer view holds an arrived response for the order.
  const current = {
    order: { orderStatus: 'in_transit', deliveryStatus: 'arrived' },
    other: { orderStatus: 'in_transit', deliveryStatus: 'in_flight' },
  }

  // When: a later poll reports successful handoff for that order.
  const refreshed = mergeTrackingEntries(current, {
    order: { orderStatus: 'delivered', deliveryStatus: 'delivered' },
  })

  // Then: the delivered state replaces the stale entry while other orders remain intact.
  assert.deepEqual(refreshed, {
    order: { orderStatus: 'delivered', deliveryStatus: 'delivered' },
    other: { orderStatus: 'in_transit', deliveryStatus: 'in_flight' },
  })
})

test('delivered status displays after handoff even when the arrival timestamp remains', () => {
  // Given: tracking retains the original arrival timestamp after handoff.
  const arrivedAt = '2026-10-27T01:00:00Z'

  // When: the latest tracking response reports a terminal delivery status.
  const status = trackingDisplayStatus('delivered', 'arrived', arrivedAt)

  // Then: the customer sees handoff completion instead of the stale arrival label.
  assert.equal(status, 'delivered')
})

test('tracking badge colors communicate active, successful, and failed delivery states', () => {
  assert.equal(trackingStatusBadgeClass('in_flight'), 'badge badge-warn')
  assert.equal(trackingStatusBadgeClass('arrived'), 'badge badge-warn')
  assert.equal(trackingStatusBadgeClass('delivered'), 'badge badge-ok')
  assert.equal(trackingStatusBadgeClass('failed'), 'badge badge-danger')
  assert.equal(trackingStatusBadgeClass('cancelled'), 'badge muted')
})

test('tracking keeps a slower bounded polling cadence while the tab is hidden', () => {
  assert.equal(trackingPollDelay(true, 0), 8_000)
  assert.equal(trackingPollDelay(false, 0), 30_000)
  assert.equal(trackingPollDelay(true, 1), 16_000)
  assert.equal(trackingPollDelay(false, 1), 60_000)
  assert.equal(trackingPollDelay(false, 3), 60_000)
  assert.equal(trackingPollDelay(false, -1), 30_000)
})
